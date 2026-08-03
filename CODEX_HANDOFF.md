# Elysian — Handoff to Codex

_Date: 2026-08-03. Written by Claude after independently verifying the 2026-08-02
remediation wave. Supersedes the June 5 handoff (that work is shipped)._

Claude has been running as a **read-only reviewer** on this repo — auditing, not building.
The one exception is the small fix pass in §1, which Rayyan asked for explicitly. Everything
else is yours.

---

## The scorecard

Every claim in the "Remediation status" block of `docs/design-audit-2026-08-02.md` was
checked against source by an independent verifier told to default to "not done" when
uncertain. **114 sub-claims:**

| Verdict | Count |
|---|---|
| VERIFIED | 60 |
| PARTIAL — real work shipped, claim overstates it | 27 |
| NOT_DONE | 23 |
| REGRESSED — the wave introduced a new defect | 4 |

The wave is substantial and much of it is genuinely good: 107 files, 5 migrations, generated
Supabase types wired into all three client factories, security H1/H2/H4 closed, `npm audit
--omit=dev` clean, `tsc --noEmit` and `eslint` both green.

**This is not a criticism of the work — it is a correction of the status block**, which reads
more complete than the code is. Rayyan is using that block to decide what ships, so please
bring it back in line with §2 and §3.

---

## 1. What Claude fixed in this pass — do not redo

All small. Verified with `tsc --noEmit`, `eslint`, and `next build`.

**The regressions the wave introduced:**

1. **The category filter was completely dead.** `src/app/(dashboard)/client/vendors/page.tsx`
   — `chooseCategory` set `activeNeedId=""` for any non-"All" category, and the guard effect
   treated that empty sentinel as an invalid lane, reverting to `full-plan`/`All` on the next
   commit. Eight of the nine category chips did nothing at all. Fixed by making the guard
   skip the deliberate empty sentinel.
2. **Focus jumped out of the event editor on the first keystroke.** `client/wedding/page.tsx`
   — the Esc/scroll-lock effect listed `closeEditor` in its deps; `closeEditor` depends on
   `isEditorDirty`, which flips on first input. Cleanup ran `previousActive?.focus()`
   mid-typing, then the effect re-focused the panel. `closeEditor` now sits behind a ref so
   the effect depends only on `editorOpen`.
3. **10 duplicate indexes in any freshly-provisioned environment.** `create index if not
   exists` matches on **name**, not columns. `supabase/schema.sql` declared the ten new FK
   indexes as `idx_*` while `20260802000200` created the same columns as `*_idx` — two
   physical B-trees per column, double write cost on the hottest planner tables. Renamed
   schema.sql to the migration's names and added `20260803000100_complete_query_path_indexes.sql`
   to retire the twins idempotently.
4. **(Left for you — see §4.)** The readiness/money-gate divergence is a contract change, not
   a patch.

**Small gaps closed while in there:**

5. **Security M3** — `src/app/api/vendors/route.ts` was still `select("*")` on
   `vendor_profiles` on an **unauthenticated** route, leaking every verified vendor's Clerk
   `user_id`. Replaced with an explicit `PUBLIC_VENDOR_COLUMNS` list. (`/api/vendors/[slug]`
   already stripped it by hand — the list route never did.)
6. **Hospitality and Logistics matched zero vendors.** `requirementVendorSlug` and
   `categoryApiSlug` mapped them to slugs that do not exist. The catalogue seeds them as
   `planning` and `travel` (`supabase/seed.sql:12,15`), which is also how
   `PLANNER_VENDOR_CATEGORIES` maps them. Two of six requirement categories could never have
   their gaps closed.
7. **Brand-new clients were told sourcing was "Covered."** The head lane's
   `isGap: openCount > 0` is false when there are zero events, so an empty plan rendered the
   green Covered badge beside "Create functions before sourcing."
8. **Client home still asserted zeros during an outage.** Three of four `ModuleCard`s were
   guarded; the primary "Event plan" card and the hero strapline were missed and still read
   "0 functions · 0 days" when `/api/timeline` failed.
9. **Dishonest rollback message.** `src/app/api/wedding/route.ts` returned "No partial plan
   was kept" unconditionally — including on the branch where the rollback delete itself
   failed and was only `console.error`'d. Now conditional on the delete succeeding.
10. **Security M5** — added `GUEST_FIELD_LIMITS` in `src/lib/guest-access.ts`, enforced in
    both guest handlers. You added type checks; the length bounds were still missing.
11. **Unbounded view-count inflation.** The new `src/app/api/vendors/[slug]/view/route.ts` is
    an unauthenticated POST whose 1-hour dedup sat inside `if (session?.userId)`, so anonymous
    callers skipped it entirely and every request inserted a row. With M1 (rate limiting)
    still open, anyone could inflate any vendor's view count without bound — and that number
    is shown to vendors. Dedup now covers the null-viewer bucket.
12. Dropped `idx_weddings_event_type` and `idx_wedding_events_time_block` (zero matching
    queries, pure write cost) and added the 3 FK indexes the wave missed —
    `guest_lists`, `mood_boards`, `budgets`, all by `client_profile_id`, all on hot
    per-request client-portal paths.

---

## 2. Status-block claims that overstate the code

Please correct these in `docs/design-audit-2026-08-02.md`.

- **"Client/admin/dashboard fetch failures no longer render authoritative zero or empty
  states."** The manager and vendor portals are untouched. `manager/clients`,
  `manager/vendors`, `manager/destinations`, `manager/bookings`, `vendor/bookings` and
  `client/messages` all still convert a 4xx/5xx/network failure into an authoritative empty
  list. Staff still cannot tell "no bookings" from "backend down." Largest overstatement in
  the block.
- **"Dynamically loads below-fold sections."** The `dynamic()` syntax shipped but the effect
  did not: these are `dynamic()` without `ssr: false` inside a Server Component, so the chunks
  fold into the shared page group and preload eagerly. The two heaviest below-fold sections —
  including `EventSystemShowcase`, the 270vh 3D rig — are still static imports. Measured
  initial JS is unchanged.
- **"Removes unused font weights."** True as a diff, false as an outcome. The 19 woff2 /
  494,392 bytes are unchanged — those files are unicode-range splits of variable fonts, not
  weight variants. **The original audit finding was wrong**; the premise failed, not the fix.
  Noting it so nobody re-attempts it.
- **"Contrast"** as a category. Only the two specifically-named ratios were fixed. The same
  failure class at equal or worse ratios is still live on the guest, planner, timeline, canvas
  and revenue surfaces.
- **"Preflighted against production data."** Nothing in the five migrations is defensive — no
  preflight or verification SQL is embedded in any of them, and `20260802000100` rewrites a
  column on existing rows. They applied cleanly (see §5), but the claim rested entirely on
  work outside the repo. Either embed the preflight or soften the wording.
- **S2 (budget subsystem) was neither restored nor deleted.** You removed every writer (drag
  UI + Zustand store) and stopped GET reading the legacy tables, but left `PUT /api/budget`
  and ~400 lines of dependent helpers shipped as unreachable code that still writes
  `budget_items` (`route.ts:799,917,929,945`). That endpoint now has zero legitimate callers
  and is pure attack surface — it is also security **M4** (unbounded writes: no cap on
  category/item count, no length cap on `notes`). `src/lib/budget-blueprint.ts` survives but
  is now orphaned behind dead code rather than serving a live path. **Pick one:** finish the
  restore, or delete PUT + helpers + blueprint together.

---

## 3. Silently dropped — not fixed, not on your deferral list

These need to be scheduled or explicitly declared. Right now they are invisible.

**Security** (`docs/security-audit-2026-08-02.md`):

| Finding | Status |
|---|---|
| **M1** rate limiting | Fully open. Widened by the new unauthenticated `POST /api/vendors/[slug]/view`. |
| **M2** security headers / CSP | Fully open. `/admin/pricing` and `/admin/users` are still framable — no `frame-ancestors`, no HSTS. |
| **M3** public vendor list leaks Clerk IDs | **Fixed by Claude (§1).** Was the most consequential omission — unauthenticated PII-adjacent disclosure, and #5 in the audit's own fix order. |
| **M4** unbounded `PUT /api/budget` writes | Open, compounded by S2 keeping the endpoint alive. |
| **M5** guest field validation | **Length caps added by Claude (§1).** |
| **L1, L2, L3, L5, L6** | All open. None appear in any status block. |
| **H3** server-side dashboard authorization | Open — but **honestly declared**. No complaint. |

**Design** (`docs/design-audit-2026-08-02.md`):

- API contract: five different "client has not onboarded" signals across three status codes;
  `requireClientContext()` never added. `client/guests/page.tsx` still shows a brand-new
  client a red "Client profile not found" toast.
- API contract: three `getClientProfileId` implementations with opposite error semantics.
- API contract: envelope inconsistency, incl. `PATCH /api/timeline/[id]` emitting two shapes.
- Data model: three conflicting delete policies on `wedding_events` FKs;
  `vendor_profiles.rating` has no writer but sorts the public marketplace.
- Design system: 76 legacy `rgba(201,169,110,…)` gold literals across 44 files; `dashLabel`
  vs ~593 inline `font-accent` strings; the 4-way hairline split; three incompatible
  "selected chip" specs; dead `--radius-*`, `--shadow-*`, `.glass`; `MARKETING_CHAPTERS` with
  exactly one self-reference.
- Product spec: *"Before that, show ranges, missing inputs, or 'pricing pending'"* —
  `gatedSpendEstimateLabel` still returns "Unlocks at 100%" and discards range machinery that
  is already built.
- Frontend perf: `event-system-showcase.tsx` — 270vh with `backdrop-filter` inside
  `preserve-3d`, nested `blur-lg > blur-xl > blur-xl`. Zero perf work landed in this file.
- `package-tier-card.tsx` — `getBoundingClientRect` + `setState` per mousemove, unchanged.
  `magnetic-button.tsx` was fixed; this one has the same shape, and `useMotionTemplate` is
  already imported at line 4.
- The 17 relation-unwrap helpers under 5 names and 6 copies of `T | T[] | null` — 10
  definitions under 4 names remain. The generated `Relationships` metadata now carries
  `isOneToOne` flags, so this entire class of code can go.
- 105 of 107 client `res.json()` parses are still implicitly `any`. The generated types stop
  at the Supabase client and never reach the browser side of the API boundary.

---

## 4. Correctly deferred — confirmed, no doc change needed

Your deferral list is honest. Verified genuinely untouched rather than half-done (which would
be worse): true SQL transaction/RPC for the event save, normalized `venue_id`, separate
client-receipt / vendor-payout ledgers, scoped message pagination, server-component
decomposition of the planner.

**One wording correction.** *"Cleanup/ownership policy for legacy duplicate budget and guest
containers"* implies only historical data is outstanding. **New duplicates can still be
created today** — the read-then-insert singletons have no unique constraint and the
tie-breaks disagree (`getOrCreateBudget` picks oldest; `wedding-plan.server.ts` and
`bookings/route.ts` pick newest). Two concurrent requests create two budgets and the reader
takes the wrong one, so items land in an invisible container. Live, not legacy.

**Add to the list: the 4th regression.** `/api/wedding` scores readiness one check higher than
`/api/budget`, `/api/bookings` and `/api/admin/pricing` for any event carrying a `logistics`
requirement plus an empty logistics row — the default state after one editor save. The planner
ring reads 100% and unlocks the estimate label while the server keeps the price locked, with
no explanation. PROJECT_MEMORY says Layer 3 must *expose* gaps, not hide them. Both readiness
paths need to come from one contract, not two that happen to agree on most inputs.

---

## 5. Database state — already handled

All pending migrations were applied to the linked Supabase project on 2026-08-03:

```
20260802000200_add_query_path_indexes
20260802000300_preserve_identity_history
20260802000400_validate_payment_direction
20260802000500_restore_mood_board_item_metadata
20260803000100_complete_query_path_indexes
```

`20260802000100_harden_booking_pricing_and_selection` was already applied before this pass —
so the `23505` catch at `src/app/api/bookings/route.ts:515` is live and the duplicate-booking
guard genuinely works.

Post-apply verification against the remote database:

| Check | Result |
|---|---|
| New FK indexes (`guest_lists`, `mood_boards`, `budgets`) | 3 present |
| Dead indexes (`idx_weddings_event_type`, `idx_wedding_events_time_block`) | 0 remaining |
| Duplicate `idx_*` twins | 0 remaining |

Remote schema and `supabase/schema.sql` now agree on index names. **If you add an index to
one, add it to the other under the same name** — `if not exists` will not protect you.

---

## 6. Suggested queue

1. **Correct the status block** per §2, and add the §3 items to the deferral list so nothing
   is invisible.
2. **Resolve S2** — finish the budget restore or delete `PUT` + helpers + blueprint. Also
   closes security M4. The only item that is both dead code and attack surface.
3. **Security M2** (headers) — small `next.config.ts` change, and `/admin/pricing` being
   framable is a real risk. Then **M1** (rate limiting), which several other findings lean on.
4. **The manager/vendor silent half** — six pages, one pattern. `admin/page.tsx:445-495`
   (`Promise.allSettled` + per-source warnings + working `reloadKey` retry) is the template
   and is already in-repo.
5. **One readiness contract** (§4) — this gates published pricing, so the divergence has money
   consequences.
6. **Security H3** — server-side `requirePortalRole()` in the four portal layouts.
7. Then the deferred architecture wave.

Verify with `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`. Node is not on
the default PATH:

```
export PATH="/Users/rayyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```
