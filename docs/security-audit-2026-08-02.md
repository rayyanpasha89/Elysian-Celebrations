# Elysian Celebrations — Security Audit

Date: 2026-08-02
Scope: full repo — `src/proxy.ts`, all 59 route handlers under `src/app/api/`, auth/session layer (`src/lib/api-utils.ts`, `role-utils.ts`, `test-auth.ts`), Supabase client layer + RLS migrations, dashboard layouts, dependencies.
Method: static read of every API route with an ownership/authorization angle, plus `npm audit`, schema/migration review, and env/secret handling review.

## Architecture note (read this first)

**Every API route uses `createAdminSupabaseClient()` — the service-role key, which bypasses RLS.** Migration `20260713130159_lock_public_schema_behind_server_api.sql` then revokes all `anon`/`authenticated` grants and enables RLS with zero policies. That is a coherent design: the browser can never touch Postgres directly, and route handlers are the entire security boundary.

The consequence: **there is no second line of defence.** A single missing `.eq("client_profile_id", …)` is a full cross-tenant data breach with nothing behind it to catch the mistake. Codex has clearly done a hardening pass here and the ownership scoping is genuinely good in most places — `wedding/*`, `messages`, `timeline`, `mood-boards`, `budget`, `guests`, `vendor/services/*` all re-query ownership server-side rather than trusting client-supplied IDs. The findings below are the gaps that remain.

## Resolution snapshot

### 2026-08-10 reconciliation

This report was written while the 2026-08-02 hardening slice was changing. The
findings below remain the original audit evidence; this dated block records the
current working-tree status without claiming deployment or remote database state
that has not been independently verified in this documentation pass.

- **H1 resolved in source:** booking responses use role-safe projections, and a
  vendor can no longer overwrite the client's inquiry notes.
- **H2 resolved in source:** the dependency tree uses patched Next.js, PostCSS,
  Sharp, and nanoid versions. The repository's prior verification recorded a
  clean production dependency audit; this docs-only pass did not rerun it.
- **H3 resolved in source:** all four portal layouts are async Server Components
  that call `requirePortalPageRole()` before rendering their shells. Manager
  access intentionally also permits admins. The client guard remains a secondary
  navigation safeguard, not the authorization boundary.
- **H4 role authority resolved in source:** Supabase `users.role` and
  `users.is_active` are authoritative for API sessions and server-rendered portal
  guards. Clerk `user.updated` webhooks update identity fields but cannot restore
  stale Clerk role metadata. A replayed `user.created` event also preserves the
  existing role and active state. Signed-out, inactive, and temporarily
  unavailable auth states now produce redirect, 403, and retryable-error behavior
  respectively. Explicit Clerk session revocation on suspension remains a
  defence-in-depth and sign-out UX follow-up.
- **M1 resolved and remotely applied:** contact,
  messages, vendor-profile views, vendor and venue catalogue reads, and vendor
  media uploads call a database-backed atomic rate-limit RPC. Media uploads also
  reserve bytes atomically against a 100 MB per-vendor quota while counting
  persisted storage objects. Each request is capped at 4 MB and owns an exact
  reservation token, so an expired upload cannot release bytes reserved by a
  newer upload. Remote history confirms migrations
  `20260810181932_add_api_rate_limits.sql` and
  `20260810201500_tokenize_vendor_media_reservations.sql`; the live rollback test
  verifies rate boundaries, grants, RLS isolation, expiration cleanup, and
  token-safe release behavior.
- **M2 resolved in source:** `next.config.ts` applies CSP, `frame-ancestors
  'none'`, `X-Frame-Options: DENY`, nosniff, referrer and permissions policies,
  COOP, and production HSTS across application paths. The allowlist includes
  Clerk's Cloudflare challenge and `protect.clerk.com` origins required for its
  bot-protection flow.
- **M3 resolved in source:** the public vendor list uses an explicit public
  projection rather than returning Clerk owner IDs.
- **M4 resolved by removal:** the unreachable legacy `PUT /api/budget` writer and
  its blueprint/helper path have been deleted; only the live read endpoint
  remains.
- **M5 resolved for the audited fields:** guest create/update paths enforce the
  shared type and length limits introduced by the hardening wave.
- **L1 resolved locally:** the ignored `.env.vercel.production` export is absent
  from the working tree. This says nothing about whether credentials ever shared
  elsewhere require rotation.
- **L2 resolved in source:** vendor catalogue media accepts HTTPS only; image
  hosts are restricted to Unsplash or the public Supabase `vendor-media` path,
  while reference links remain HTTPS-only.
- **L3 resolved in source:** vendor owners cannot mutate client booking notes.
- **L4 intentionally uses API polling:** `useMessageRealtime` is deliberately a
  visibility-aware eight-second refresh through `/api/messages`. Direct Supabase
  Realtime remains deferred until Clerk-to-Supabase JWT bridging can preserve the
  role-checked server boundary.
- **L5 resolved in source:** the proxy matcher includes explicit client, vendor,
  admin, and manager prefixes in addition to the general asset-aware matcher.
- **L6 resolved in source:** the admin guest branch is paginated and capped at
  200 rows per page.

Booking race and pricing-integrity hardening from
`20260802000100_harden_booking_pricing_and_selection.sql` remains part of the
known applied baseline. The security advisor reports no warning- or error-level
findings after `20260810201500_tokenize_vendor_media_reservations.sql`; its remaining
no-policy notices are informational for intentionally server-only tables.

---

## HIGH

### H1 — Client and vendor can read the confidential vendor payout via `PATCH /api/bookings/[id]`

`src/app/api/bookings/[id]/route.ts:124-141`

The `GET /api/bookings` list is carefully filtered through `withRoleSafePricing()`, which deletes `vendor_amount`, `final_price`, `price_published`, and `service_fee` before returning to a client. The `PATCH` handler on the same resource does not:

```ts
.select(
  "id, client_profile_id, vendor_profile_id, vendor_service_id, wedding_event_id, status, event_date, total_amount, vendor_amount, paid_amount, notes, created_at, updated_at"
)
.single();
...
return apiSuccess(updated);   // raw — no role projection
```

`total_amount` is written to equal the vendor payout (`src/app/api/admin/pricing/route.ts:295` — `updates.total_amount = vendorPrice`), and `vendor_amount` *is* the payout. Both are returned unfiltered to anyone who passes the `isOwner` check on line 69, which includes the **client**.

**Repro:** as a client, `PATCH /api/bookings/<own-booking-id>` with `{"notes":"x"}`. The 200 response contains `vendor_amount`. Combine with the published `final_price` the client legitimately sees and the Elysian service fee falls straight out as `final_price − vendor_amount`.

This defeats the entire commercial model documented in `PROJECT_MEMORY.md` ("Clients never receive the vendor payout or Elysian fee").

**Fix:** route the PATCH response through `withRoleSafePricing()`. Export it from a shared module (e.g. `src/lib/booking-pricing.ts`) so `bookings/route.ts` and `bookings/[id]/route.ts` cannot drift again, and make it the only way a booking row leaves a handler.

---

### H2 — Next.js 16.2.7 has 9 published advisories, including a middleware/proxy bypass

`npm audit --omit=dev` (3 high):

| Advisory | Impact here |
|---|---|
| `GHSA-6gpp-xcg3-4w24` — **Middleware / Proxy bypass in App Router** | `src/proxy.ts` is the *only* server-side portal gate (see H3). A bypass exposes every dashboard page. |
| `GHSA-955p-x3mx-jcvp` — Unauthenticated disclosure of internal Server Function endpoints | Directly applicable |
| `GHSA-q8wf-6r8g-63ch` — DoS in Image Optimization API via SVG | `next/image` is enabled with remote patterns |
| `GHSA-p9j2-gv94-2wf4`, `GHSA-89xv-2m56-2m9x` — SSRF in rewrites / Server Actions | Lower exposure, no custom server |
| `GHSA-68g3-v927-f742`, `GHSA-4633-3j49-mh5q` — Cache confusion of response bodies | Relevant: authenticated JSON could be served to the wrong requester |
| `GHSA-m99w-x7hq-7vfj`, `GHSA-4c39-4ccg-62r3` — Server Action DoS / unbounded payload | Relevant |
| `postcss <=8.5.17` — path traversal via `sourceMappingURL` | Build-time; note `package.json` pins an override to `postcss@8.5.15`, which is **vulnerable** |
| `sharp <0.35.0` — inherited libvips CVEs (CVE-2026-33327/33328/35590/35591) | Image optimization processes remote images |

**Fix:** upgrade to `next@16.2.12`, and drop or bump the `overrides.postcss` pin in `package.json:19-21` — it currently forces a vulnerable postcss underneath the upgrade.

---

### H3 — No server-side authorization on any dashboard page

All four portal layouts are `"use client"` and rely on `<PortalRoleGuard />` (`src/components/dashboard/portal-role-guard.tsx`), which is a `useEffect` that calls `router.replace()` after hydration.

```
src/app/(dashboard)/admin/layout.tsx      "use client";
src/app/(dashboard)/manager/layout.tsx    "use client";
src/app/(dashboard)/client/layout.tsx     "use client";
src/app/(dashboard)/vendor/layout.tsx     "use client";
```

A repo-wide search for `getAuthSession|currentUser|auth()` under `src/app/(dashboard)` returns **nothing**. So the server-side gate is `src/proxy.ts` alone, and the in-page gate is a client-side redirect an attacker simply doesn't execute.

Data itself is safe — every API route re-checks the role — so this is not by itself a data breach. But it means:
- the admin/manager page *shells*, nav structure, and any content baked into the RSC payload render for a non-admin who blocks the redirect;
- H2's middleware-bypass advisory converts from "annoying" to "portal is open";
- the flat `<Sidebar>` nav (`src/app/(dashboard)/admin/layout.tsx:9-50`) is a free map of internal routes.

**Fix:** add a server-side check in each portal layout (or a shared `requirePortalRole()` server helper) that calls `getOptionalAuthSession()` and `redirect()`s on mismatch. Keep `PortalRoleGuard` for the client-side transition, but stop treating it as the control.

---

### H4 — Role demotion and account suspension are not enforceable

`src/app/api/admin/users/[id]/route.ts:44-52`

```ts
try {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(id, { publicMetadata: { role: role.toLowerCase() } });
} catch (e) {
  console.error("Clerk metadata update failed:", e);   // swallowed
}
```

The Supabase `users.role` update proceeds regardless. Now look at resolution order in `src/lib/api-utils.ts:30-52`:

```ts
let role = roleFromSessionClaims(sessionClaims);  // Clerk JWT — wins
if (!role) role = storedRole;                     // Supabase — only a fallback
```

**JWT claims beat the database.** So if the Clerk write fails (network blip, rate limit, wrong instance), demoting an admin to client updates Supabase, returns `200 OK` to the admin UI, and the demoted user **keeps admin** on every request because their Clerk `publicMetadata.role` still says `admin`. The failure is invisible except in server logs.

Related, in the same area:
- Suspending a user (`is_active = false`) is honoured in `getOptionalAuthSession()` (line 69-71) so APIs 401 — but the Clerk session is never revoked, so the user stays logged in and dashboard pages still render (see H3). `src/proxy.ts` never checks `is_active` at all.
- `resolveRole()` falls through to `?? "client"` on line 51 when nothing resolves. A user present in Clerk but missing from Supabase (`state: "missing"`) is silently granted the client role rather than rejected.

**Fix:** (a) make the Clerk metadata write authoritative — fail the request and do not commit the Supabase change if it throws; (b) prefer the Supabase `users.role` over JWT claims, or at minimum treat a mismatch as "use the more restrictive"; (c) call `clerkClient().sessions.revokeSession()` on suspend; (d) check `is_active` in `proxy.ts`.

---

## MEDIUM

### M1 — No rate limiting anywhere in the application

`rg -i 'rate.?limit|throttle|upstash'` over `src/` and `package.json` returns nothing. Unprotected:

- **`POST /api/contact`** (`src/app/api/contact/route.ts`) — fully unauthenticated, writes a row to `contact_inquiries` per request, no CAPTCHA, no length caps on `name`/`message`/`phone`/`destination`. A trivial loop fills the table and floods the admin inquiries queue.
- **`POST /api/messages`** — 4000 chars per message, unlimited messages.
- **`POST /api/vendor/services/[id]/images`** and **`/api/vendor/profile/images`** — 8 MB per upload, no per-vendor quota, no upload count cap. Only 6 URLs are retained per catalogue item (`MAX_IMAGES_PER_ITEM`, `src/lib/vendor-offering.ts:19`) but every uploaded object stays in the `vendor-media` bucket forever. Unbounded paid storage growth.
- **`GET /api/vendors?q=`** — `ilike` across three columns, up to 50 rows with deeply nested joins, unauthenticated.

**Fix:** middleware-level IP rate limiting (Upstash Ratelimit or Vercel's), strictest on `/api/contact` and the image upload routes. Add a per-vendor storage quota check in `src/lib/supabase/storage.ts`.

### M2 — No security headers or CSP

`next.config.ts` has no `headers()` function and `vercel.json` only sets `regions`. Missing: `Content-Security-Policy`, `X-Frame-Options` / `frame-ancestors`, `Strict-Transport-Security`, `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`.

Notably, **the admin and manager portals are framable** — clickjacking against `/admin/pricing` (where prices are published) or `/admin/users` (where roles are set) is live. No `dangerouslySetInnerHTML`, `eval`, or `innerHTML` anywhere in `src/` (good), so CSP is defence-in-depth rather than a live XSS fix.

**Fix:** add a `headers()` block in `next.config.ts`. `frame-ancestors 'none'` and HSTS are the two that matter most given the portals.

### M3 — Public vendor listing leaks every vendor's Clerk user ID

`src/app/api/vendors/route.ts:79-81` selects `vendor_profiles` with `*`. Per `supabase/schema.sql:58`, that includes `user_id text unique not null references users(id)` — the raw Clerk user ID.

The single-vendor route gets this right and strips it explicitly (`src/app/api/vendors/[slug]/route.ts:99` — `const { user_id: ownerUserId, reviews, ...publicVendor } = vendor;`). The list route does not, and it is **unauthenticated**. So `GET /api/vendors?limit=50` hands anyone a page-by-page dump of Clerk user IDs for every verified vendor.

**Fix:** replace `*` with an explicit column list in the list route. Same treatment for the other `select("*")` sites: `src/app/api/guests/route.ts:63,86`, `src/app/api/admin/inquiries/route.ts:20`, `src/app/api/destinations/[slug]/route.ts:15`.

### M4 — Unbounded writes in `PUT /api/budget`

`src/app/api/budget/route.ts:753-996`. The `categories` array has no length cap, `category.items` has no length cap, and the save loop issues **one sequential Supabase round-trip per item** (line 921-949). `notes` (line 916) and `budgetName` (line 766-769) are stored with no length limit.

A client can post 5,000 categories × 5,000 items and hold a serverless function open until it times out, while writing arbitrarily large text. Compare `src/app/api/wedding/events/[id]/planning/route.ts:107,115,130` which correctly caps at `.slice(0, 8)` / `.slice(0, 40)` — apply the same discipline here.

**Fix:** cap `categories` (~40) and `items` per category (~200), cap `notes` at ~1000 chars and `budgetName` at ~120, and batch the item writes into a single upsert.

### M5 — Guest fields written with no type or length validation

`src/app/api/guests/[id]/route.ts:73-93` and `src/app/api/guests/route.ts:179-192`.

`side` and `rsvp_status` are properly whitelisted, but everything else is assigned raw:

```ts
data[field] = body[field];   // name, email, phone, meal_pref, plus_one, table_number, notes
```

`plus_one` is a boolean column and `table_number` an integer — posting a string produces a Postgres type error surfaced as a 500. `name`/`email`/`notes` have no length bound. `POST` does `plus_one: plusOne || false` with the same problem.

**Fix:** validate each field's type and cap string lengths, matching how `side`/`rsvp_status` are already handled. A `zod` schema is the cleanest option — `zod@4.3.6` is already a dependency and is currently unused for request validation anywhere in the codebase.

---

## LOW / hygiene

### L1 — Production secrets sitting in the working tree
`.env.vercel.production` (5 KB) contains `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD`, and `VERCEL_OIDC_TOKEN` in plaintext. It is correctly covered by `.gitignore` (`.env*`) and `.vercelignore`, and `git ls-files` confirms **no env file has ever been committed** — so this is hygiene, not a breach. But it is a live copy of prod credentials one `git add -f` or one stray tool away from exposure, and `PROJECT_MEMORY.md` actively points agents at env files.
**Fix:** delete it; use `vercel env pull` on demand. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `CLERK_SECRET_KEY` if this file has ever been shared or synced.

### L2 — `http:` accepted for vendor catalogue media
`src/lib/vendor-offering.ts:22-30` — `isSafeUrl()` allows both `https:` and `http:` from any host. Vendor-supplied `imageUrls` / `referenceUrl` become mixed content and an off-platform tracking/beacon vector rendered inside client dashboards.
**Fix:** `https:` only, and consider restricting to the `vendor-media` bucket host now that uploads exist.

### L3 — Vendors can overwrite the client's booking notes
`src/app/api/bookings/[id]/route.ts:114-119` — `notes` is writable by any `isOwner`, which includes the vendor. Those notes are the client's inquiry brief. Data-integrity issue, not a privacy one.
**Fix:** restrict `notes` writes to the client and ops roles, or split into `client_notes` / `vendor_notes`.

### L4 — Realtime messaging is silently dead (and worth verifying)
`supabase/migrations/20260601000200_enable_message_realtime.sql` adds `public.messages` to the `supabase_realtime` publication. The later `20260713130159_lock_public_schema_behind_server_api.sql` enables RLS on every public table and revokes all `anon`/`authenticated` grants **with no policies created**. `useMessageRealtime` is wired into all three messages pages but the browser role can no longer read `messages`, so no `postgres_changes` events will arrive.
Two things to do: (a) confirm this is actually broken in the live project rather than assumed — the hook will fail silently either way; (b) confirm Supabase Realtime is enforcing RLS on that publication and not leaking rows to any `anon` key holder. `PROJECT_MEMORY.md` already flags realtime as "verify live behavior" — this is why.

### L5 — `proxy.ts` matcher excludes extension-like paths
`src/proxy.ts:137` — the negative lookahead skips middleware for any path containing `.css`, `.js`, `.png`, etc. No current route is reachable that way, so this is not exploitable today, but it is exactly the kind of matcher that turns a future catch-all or dynamic segment into an auth bypass. Worth tightening alongside H3.

### L6 — Admin guest listing is unbounded
`src/app/api/guests/route.ts:86` — the admin branch returns every guest row across every client with no pagination. Fine at current scale; a memory/latency problem later, and it makes accidental over-exposure larger if the role check ever regresses.

---

## What's already solid (don't regress these)

Worth stating explicitly so a future refactor doesn't undo it:

- **RLS lockdown** (`20260713130159`) is thorough — it loops every public table, revokes grants, *and* sets `alter default privileges` so future migrations stay closed. That is the right pattern.
- **Test-auth bypass is properly fenced.** `isTestAuthEnabled()` (`src/lib/test-auth.ts:17`) hard-returns `false` when `NODE_ENV === "production"` before reading the flag, so Vercel production *and* preview deployments are both safe. The client-side switcher UI is independently double-gated on `NODE_ENV`. `/api/admin/testing/bootstrap` additionally requires the `admin` role *and* `ENABLE_TEST_DATA_BOOTSTRAP === "true"`.
- **Clerk webhook** verifies the svix signature before touching the DB, and rejects on missing headers (`src/app/api/webhooks/clerk/route.ts:27-48`).
- **No self-service role escalation.** `publicMetadata.role` is written in exactly two places — the admin route and the test bootstrap. Nothing copies client-writable `unsafeMetadata` into it, and vendors cannot set `is_verified`/`is_featured`/`rating` on themselves (`src/app/api/vendor/profile/route.ts:241-249`).
- **Ownership scoping in the planner is genuinely careful** — `wedding/events/[id]`, `.../planning`, `.../requirements`, and `wedding/days/[id]` all re-query `wedding_id` against the session's own wedding before any write, and `resolveVendorLink()` validates that a vendor service actually belongs to the claimed vendor and that the vendor is verified.
- **Storage deletion is path-scoped.** `deleteOwnedVendorMediaImage()` (`src/lib/supabase/storage.ts:226`) parses the public URL and checks the owned prefix *before* creating an admin client, so a copied URL can't authorize cross-vendor deletion.
- **PostgREST wildcard injection is handled** — `sanitizeSearchQuery()` strips `%` and `_` before `ilike` in both `vendors` and `venues`.
- **No XSS sinks.** Zero `dangerouslySetInnerHTML`, `eval`, `new Function`, or `.innerHTML` in `src/`.
- **Booking status transitions are constrained** — `VENDOR_STATUS_TRANSITIONS` limits vendors to `CONFIRMED|DEPOSIT_PAID → COMPLETED`, and `totalAmount` writes are rejected outright.

---

## Suggested fix order for Codex

1. **H1** — one-file fix, direct business-logic leak. Share `withRoleSafePricing` and route the PATCH response through it.
2. **H2** — `npm i next@16.2.12`, remove the `overrides.postcss` pin, re-run `npm audit`.
3. **H4** — make the Clerk metadata write authoritative; flip role resolution to prefer the DB; revoke sessions on suspend.
4. **H3** — add server-side `requirePortalRole()` to the four portal layouts.
5. **M3** — replace the `select("*")` calls with explicit column lists.
6. **M1 / M2** — rate limiting on `/api/contact` + uploads; `headers()` block in `next.config.ts`.
7. **M4 / M5** — introduce `zod` request schemas (already a dependency, currently unused) starting with `budget` and `guests`.
8. **L1** — delete `.env.vercel.production`, rotate if it has ever left the machine.
9. **L2–L6** — cleanup pass.

Verify each with `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`.
