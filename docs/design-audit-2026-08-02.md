# Elysian Celebrations — Design Audit

Date: 2026-08-02
Companion to `docs/security-audit-2026-08-02.md` — **no security findings are repeated here**. Read that one for authz, IDOR, secrets, CVEs, rate limiting, and headers.

**Scope:** design quality only — architecture, data model, API contract, rendering architecture, product-spec compliance, design system, accessibility, resilience UX, type safety, frontend performance.

**Method:** 9 parallel audit passes, each followed by an independent adversarial verifier instructed to *refute* its own dimension's findings and to default to REFUTED when uncertain. 91 findings survived. A synthesis pass then deduped root causes across dimensions and re-read the five highest-impact findings against source.

**Caveat on line numbers:** Codex was editing this tree during the audit. References inside `src/app/(dashboard)/client/wedding/page.tsx` (5,902 lines) drifted ~+80 mid-run. Treat every line number in that file as ±100 and grep for the cited symbol rather than jumping to the line.

## Remediation status

The audit below is preserved as the original point-in-time evidence. The
2026-08-02 remediation wave has since closed the release-critical findings:

- Client/admin/dashboard fetch failures no longer render authoritative zero or
  empty states; primary surfaces now expose retryable errors and preserve data.
- Event-plan creation is fatal on dependent insert failure and performs a
  compensating cleanup, while editor saves always refetch authoritative server
  state and create replacement vendor selections before deleting drafts.
- Readiness and price visibility now come from one server-side contract. The
  client planner no longer keeps a divergent readiness calculation.
- Vendor discovery reads real day/function requirement rows instead of a
  wedding-only lane constant, and finalization gaps carry exact event targets.
- Supabase `Database` types are generated from the linked schema and wired into
  server/browser clients. Query-path indexes, identity-history constraints, and
  payment-direction validation have been preflighted against production data.
- Every dynamic API insert/update payload now uses the generated table or enum
  contract. The type workflow prefers the pinned official Supabase CLI when a
  management token is present and has a read-only catalogue fallback for local
  environments without Docker.
- Clerk deletion now soft-deactivates identities before restricted foreign keys
  are applied; account updates cannot reactivate an admin-suspended identity.
- Duplicate active booking selection is prevented by a partial unique index.
  Existing duplicate budget/guest containers were not destructively merged.
- Core dashboard accessibility gaps are closed: form labels, touch/keyboard
  seating assignment, dialog focus management, mobile-sidebar semantics,
  canvas focus restoration/live announcements, keyboard-visible destructive
  controls, steppers, charts, contrast, and topbar menu naming/escape behavior.
- Marketing/runtime performance work moved global progress out of dashboards,
  dynamically loads below-fold sections, removes unused font weights, idles the
  custom cursor, shortens the splash, and avoids state updates on pointer move.
- The dead drag-budget UI/store, unused UI-kit primitives, GSAP, CVA, dnd-kit,
  and Zustand were removed. Live charts now share the approved earth palette.
- Venue pickers load/search the catalogue and only reveal custom entry when a
  search is not covered. Special requests explicitly disclose manual pricing.
- The live mood-board schema drift was closed with a migration that restores
  item category and creation metadata; all six existing items passed a
  rollback-only backfill preflight.

The following are intentionally **not marked complete** because they require a
separate data/product migration rather than a safe tactical patch: a true SQL
transaction/RPC for the full event save, normalized `venue_id` on functions,
separate client-receipt and vendor-payout ledgers, cleanup/ownership policy for
legacy duplicate budget and guest containers, scoped message pagination, and a
server-component decomposition of the 6k-line planner. These are the next
architecture wave, not hidden release claims.

**Independently re-verified after synthesis** (all held): `PUT /api/budget` has zero callers; `client/vendors/page.tsx` has zero `/api/wedding` references; onboarding returns 201 after swallowed insert errors; `users.id` cascade reaches `bookings`/`messages` contrary to the webhook's own comment; `gsap`, `@gsap/react`, and `class-variance-authority` have zero imports repo-wide.

---

*Spot-checked the five highest-impact findings directly against source (`src/app/api/wedding/route.ts:875-1124`, `src/app/api/budget/route.ts:753` + call graph, `supabase/schema.sql:34/58/322-345`, `src/app/(dashboard)/client/vendors/page.tsx:25-81/625`, `src/app/(dashboard)/client/wedding/page.tsx:5966`). All five hold. One correction: line numbers inside `client/wedding/page.tsx` have drifted by roughly +80 since the dimension passes — `Field` is at **5966**, not 5887. Treat every line reference in that file as ±100 and grep for the cited symbol.*

## Verdict

The **product logic** in this codebase is better than its **plumbing**. The Layer 1/Layer 2 client planner is genuinely spec-compliant (no auto-create, no free-text vendor names, vendor selection embedded per need, catalogue rows apply in place), the `bookings` pricing constraint set encodes the commercial model directly in Postgres, `withRoleSafePricing` correctly prevents any surface from rendering a price it shouldn't see, `strict: true` holds with zero `any`, and reduced-motion discipline is real and consistent. What is weak is everything *between* the product logic and the database: there is no transaction boundary anywhere, no service/repository layer (so the same domain logic is reimplemented 5–9 times with divergent semantics), no generated Supabase types (so the entire Postgres↔React boundary is hand-stitched), and no server-side data fetching (42 of 62 pages are `"use client"` fetching through `useEffect`). Three roadmap items — budget two-way sync, plan-aware vendor discovery, gap-jumping finalization — are not merely unfinished but have shipped *chrome* that implies they work. That is the most damaging pattern in the report: surfaces that look plan-aware over logic that never reads the plan.

---

## Structural flaws (need a decision)

### S1 — There is no transaction boundary anywhere; multi-table writes commit partially and report success
**Root cause.** Every write path is a sequence of independent PostgREST calls orchestrated either in a route handler or in the browser. Nothing uses `supabase.rpc()` over a Postgres function.

**Manifests in:** api-contract, rendering-arch, resilience-ux.

- **Onboarding create returns 201 after swallowed failures.** `src/app/api/wedding/route.ts` runs ~10 dependent inserts; six only `console.error` and continue — `wedding_events` (1002), `wedding_event_menus` (1038), `wedding_event_tasks` (1054), `wedding_event_requirements` (1090), `budgets` (1106), `guest_lists` (1115) — then unconditionally `return apiSuccess({ weddingId }, 201)` at **1119**. Verified. Worse, the re-entry guard at **875-883** (`return apiError("Event plan already exists", 409)`) means a plan created with zero functions is **unrepairable through the UI**.
- **Saving one function is 4+N browser-orchestrated requests.** `saveEventDetails` (`client/wedding/page.tsx:2410`) awaits `PATCH /events/:id` → `PATCH /planning` → `PUT /requirements` → `syncVendorSelections` → `refreshWedding()`. `refreshWedding()` sits **inside the try at 2493**, so on any failure the client keeps pre-save state over a database that has half the save applied. `syncVendorSelections` (2337-2405) deletes removed bookings *before* creating replacements and throws mid-loop on non-`INQUIRY` selections (2367) — so categories 1–2 can have rows destroyed before category 3 aborts, and the canvas keeps rendering bookings that no longer exist.
- **Per-row round trips.** `wedding/events/[id]/planning/route.ts:312/328` issues one awaited call per menu item (cap 8 menus × 40 items); `budget/route.ts:921` per budget item; `requirements/route.ts:350` per requirement plus 1–2 queries each for `resolveVendorLink`. Abort mid-loop leaves rows written and stale rows not yet deleted (delete is at 346/400), and the next save re-derives matches from that corrupted state via `takeByKey`/`takeBySort`.

**Consequence.** Half-applied plans that the UI misrepresents, an unrecoverable 409 lockout, and destroyed vendor bookings after a generic toast.

**Decision to make.** Either (a) move the three multi-table writes — plan create, event save, budget save — into Postgres functions called via `supabase.rpc()`, or (b) accept non-atomicity but enforce two rules mechanically: no handler may return 2xx after a swallowed `insertError`, and no client may orchestrate more than one write. Option (a) also unblocks collapsing the event save into a single `PUT /api/wedding/events/[id]` that returns the hydrated event with server ids — which removes the post-save full refetch.

---

### S2 — The `budgets`/`budget_items` subsystem has no reachable write path, and the client home renders its zeros as fact
**Root cause.** `PUT /api/budget` (`src/app/api/budget/route.ts:753-996`) implements the complete category/item upsert plus `syncWeddingEventEstimatesFromBudgetItems` (984). **Verified: `grep -rn "api/budget" src/` returns exactly two callers, both GET** — `client/budget/page.tsx:101` and `client/page.tsx:120`. No UI ever creates a `budget_items` row.

**Manifests in:** product-rules, rendering-arch, resilience-ux.

The dead half is user-visible, not merely unused: `client/page.tsx:155-158` computes `estimated` exclusively from `budget.categories[].items[]`, renders it as the "Cost estimate" tile, and at **246** fires a permanent nudge — *"Costs not estimated yet — Import your vendor picks or add line items to build your cost estimate"* — for an action no surface provides. Verified. Four components (`budget-canvas` 714 lines, `budget-by-event-view` 470, `budget-summary` 235, `budget-item-palette` 159) plus `budget-store.ts` (379, persisting to localStorage key `elysian-budget` with client-minted ids `budget_${Date.now()}_${n}`) are imported by nothing.

There is also a **latent double-writer**: `syncWeddingEventEstimatesFromBudgetItems` overwrites `wedding_events.estimated_budget` from `budget_items`, while `saveEventDetails` writes the same column from `spendEstimate.min`. The first PUT ever issued would zero every planner-derived estimate.

**Consequence.** PROJECT_MEMORY priority #9 (two-way budget sync) is blocked, and the client's headline KPI is permanently wrong with an un-actionable instruction beside it.

**Decision to make.** Restore or delete. If restore: re-mount the canvas/palette against the existing PUT, and resolve the `estimated_budget` double-writer first (make the planner sole writer, or make the sync additive). If delete: remove PUT, the sync function, the `budget` key from the GET response, the four orphan components and the store — but **do not delete `src/lib/budget-blueprint.ts`**, which the live GET path imports at `budget/route.ts:13`. Either way, immediately re-source `client/page.tsx:155` from `json.planLineItems`/`eventPlanSpend` (already in the same response) and drop the nudge.

---

### S3 — The dashboard is a client-side SPA in App Router clothing; the planner pays for it three times over
**Root cause.** 42 of 62 pages and 57 of 64 components are `"use client"`; **`rg "next/dynamic|dynamic\(" src` returns zero hits**; the only real data-fetching Server Components are five vendor/manager pages.

**Manifests in:** rendering-arch, perf-frontend, accessibility.

- **Two-stage waterfall.** `client/wedding/page.tsx` client-fetches `/api/wedding` (1798), and three effects then gate on the result: **1927** fires six `/api/vendors?category=…` in parallel, **1988** `/api/saved-vendors`, **2015** `/api/venues`. All six category fetches fire regardless of which step the user opens, and each is a `count: "exact"` + deep join down to `vendor_service_items.image_urls` (`api/vendors/route.ts:79-81`).
- **The `[wedding]` object-identity trap.** `refreshWedding()` produces a new `data.wedding` reference, so those same 8 catalogue GETs refire after **every** save (2493), day create (2264), function create (2315) and event delete (2525). A single save is ~12+ requests.
- **2,887-line component.** `ClientWeddingPage` spans **1756-4643** with 27 `useState` and 8 `useCallback` in one body. `rg "React\.memo|\bmemo\("` returns zero hits repo-wide, and `CelebrationCanvas` (678 lines) is passed an inline `onOpenStep` closure at 3157 — so every keystroke in `detailDraft` re-renders the radial canvas and every vendor catalogue row.
- **No code splitting.** Measured from the checked-in build: `/privacy-policy` = 317 KB gzip across 19 chunks, `/` = 428 KB across 23. `ScrollProgress` is statically imported in the **root** layout (`src/app/layout.tsx:5`), pulling framer-motion (85 importers, not in Next 16's `optimizePackageImports`) into the shared chunk for `/admin`, `/vendor` and `/sign-in`.
- **No boundaries.** Only `src/app/error.tsx`, `loading.tsx`, `not-found.tsx` and `(marketing)/template.tsx` exist; zero `Suspense` under `(dashboard)`. A portal render throw drops the user into dark marketing chrome. `(dashboard)/layout.tsx:1-2` exports `force-dynamic` + `revalidate = 0` on a body that is four static gradient divs.

**Consequence.** The heaviest surface in the product is also the slowest to load, laggiest to type in, and hardest to work in — PROJECT_MEMORY priorities 3–11 all land in that one file, so they cannot be parallelised or reviewed in isolation.

**Decision to make.** Commit to a server-first pattern for at least the initial payload: fetch the plan in a Server Component and pass it as a prop, or add `/api/wedding/planner-bootstrap` returning wedding + venues + saved slugs + vendor options in one call. Then decide whether `CelebrationCanvas` + editor panels get extracted into memoised components with local draft state. The five existing Server Component pages (`vendor/inquiries`, `vendor/reviews`, `vendor/portfolio`, `vendor/calendar`, `manager/weddings`) are the correct template.

---

### S4 — Readiness is computed twice with divergent rules; the money gate and the ring disagree
**Root cause.** `eventReadinessPercent` exists in two structurally unrelated forms: `src/lib/event-readiness.ts:64` (server, `EventReadinessRow`, snake_case) and `client/wedding/page.tsx:905` (client, `WeddingEvent`, camelCase). TypeScript cannot see the drift.

Two divergences already exist: (a) the client's vendor check is `event.vendorSelections.length > 0`, and `api/wedding/route.ts:564-566` builds `vendorSelections` with **no** `status !== "CANCELLED"` filter — unlike line 464 where the same map *is* filtered before feeding server readiness; (b) the client's estimate check is `estimateEventSpend(...).max > 0`, and that function derives a range from `parseVenuePriceRange(venue?.price_range)` alone, so picking a catalogued venue satisfies it with zero vendors and zero budget.

The server copy is the money gate (`budget/route.ts:321`, `bookings/route.ts:319`, `wedding/route.ts:477` all gate published `final_price` on `>= 100`).

**Consequence.** The canvas shows 100% while the server holds the price at "pricing pending", with no explanation — on the surface PROJECT_MEMORY says must *expose* gaps.

**Decision to make.** Delete the client copy and ship server-computed readiness in the `/api/wedding` payload (`/api/admin/pricing` already does exactly this — `AdminEvent.readiness`, consumed at `admin/pricing/page.tsx:29`). If the venue-catalogue heuristic is wanted, move it into `src/lib/event-readiness.ts` so both callers share one contract.

---

### S5 — Client vendor discovery fabricates plan context from a hardcoded wedding-only lane list
**Root cause.** Verified: `eventNeedFilters` (`client/vendors/page.tsx:25-81`) is a module-level constant of six fixed lanes — *"All open vendor gaps"*, *"Welcome dinner"*, *"Haldi and mehendi"*, *"Sangeet and cocktail"*, *"Ceremony coverage"*, *"Looks and styling"*. `chooseNeed` (**625**) does nothing but `setCat(need.category)` — a lane is a category alias. **`grep -n "api/wedding"` on the file returns nothing**: the page has zero knowledge of the client's days, functions, requirements or vendor gaps. The hero at 682 nevertheless reads *"Choose vendors for the function, not the directory"* and a dark panel at 710 is titled *"Current brief"*.

**Consequence.** PROJECT_MEMORY priority #6 is blocked, and the "All open vendor gaps" lane is literally false — nothing computes gaps, so scrolling a directory can read as covering the plan. A client planning a corporate gala is asked to source against "Haldi and mehendi".

**Decision to make.** Fetch `/api/wedding` and build lanes from real `wedding_events` → `wedding_event_requirements` rows, labelling each with the actual function and day name, and derive the gap lane from requirements with no `vendor_profile_id`/`vendor_service_id` (the planner's `firstMissingVendorCategory` is the existing predicate). Until that lands, rename the lanes to neutral need names and delete the false "gaps" wording.

---

### S6 — Finalization reports aggregate counts and jumps to the wrong function
**Root cause.** `CheckResult` (`client/wedding/page.tsx:5667-5673`) carries no day or event id. `computeFinalizationChecks` reduces everything to `.filter(...).length` over `days.flatMap(d => d.events)`. `resolveFinalizationCheck` (2206-2233) therefore has no target and falls back to `selectedEvent ?? days.flatMap(d => d.events)[0]`, then applies a static `sectionByCheck` map.

**Manifests in:** rendering-arch, product-rules (reported twice — same root cause).

**Consequence.** On a 3-day plan the client is told *"1 of 8 block(s) still have a partner or package gap"* and clicking lands on day 1's first function, which is complete. PROJECT_MEMORY's Layer 3 spec is explicit: finalization "should expose gaps and jump users back to the exact function/step that needs work" and "should not be a passive summary."

**Decision to make.** Have the checklist builder return offenders instead of counts — the filters at **5698-5723** already hold the event objects. Render them as clickable sub-rows labelled function + day, and give `resolveFinalizationCheck` an `eventId` parameter. `firstVendorGapSection(targetEvent)` is already the right per-event helper; it just needs the gapped event.

---

### S7 — Identity deletion cascades into commercial records, and one `paid_amount` column serves two opposite money flows
**Root cause.** Two independent data-model decisions that were never made.

**(a) Cascade.** Verified: `client_profiles.user_id … on delete cascade` (`schema.sql:34`), same on `vendor_profiles.user_id` (**58**), then `bookings.client_profile_id`/`vendor_profile_id … on delete cascade` (**322-323**), `weddings` (171), `budgets` (290), `messages` (401). The Clerk webhook does `await supabase.from("users").delete().eq("id", userData.id)` (`api/webhooks/clerk/route.ts:123`) with no error check, **under the comment "Profiles remain for data integrity (bookings, reviews, etc.)"** — which is exactly backwards. Meanwhile `api/admin/vendors/[id]/route.ts:133-141` counts bookings and returns 409 *"This vendor has bookings and can't be deleted"* — direct evidence the team believes this data must survive. A vendor deleting their own Clerk account silently erases every `vendor_amount`/`final_price`/`service_fee` on that relationship plus all message history, and the webhook returns 200.

**(b) `paid_amount`.** One column (`schema.sql:339`), written by ops at `bookings/[id]/route.ts:110-112`, read as *vendor payout progress* (`vendor/analytics/route.ts:23-30`, `dashboard/vendor/route.ts:34-48`) **and** as *client collection progress* (`client/bookings/page.tsx:327-341`, `manager/bookings/page.tsx:205-212`). There is no way to express "client paid Elysian 50%, Elysian paid the vendor nothing" — whichever value ops enters, one dashboard shows a false balance. A `payments` table with `kind text — 'CLIENT_IN' | 'VENDOR_OUT'` already exists (`supabase/migrations/20260610000300_admin_ops_cockpit.sql:17-35`) and has **zero readers or writers in `src/`**.

**Decision to make.** (a) Change both `user_id` FKs to `on delete restrict` (or nullable + `set null`) and make the webhook a soft delete using the existing `users.is_active`. (b) Either wire up `payments` and derive both progress figures from it by `kind`, or split into `vendor_paid_amount`/`client_paid_amount`. Add the missing `check (kind in ('CLIENT_IN','VENDOR_OUT'))` while you're there — the allowed values exist only as a SQL comment.

---

### S8 — No generated Supabase `Database` type, so the Postgres↔React boundary is enforced by hand
**Root cause.** `createServerClient(...)` (`src/lib/supabase/server.ts:12` and `:38`) and `createBrowserClient(...)` are called with no type argument; no generated schema exists and there is no `db:types` script.

**Manifests in:** type-safety, api-contract, data-model.

The workaround is **17 relation-unwrap helpers under 5 names** (`firstRel`, `relationOne`, `firstRelation`, `pickOne`, plus an inline one at `api/timeline/route.ts:167`) and **6 copies of a `T | T[] | null` union**. It has leaked into React: `VenueOption.destination` (`client/wedding/page.tsx:258-268`) is typed object-or-array, so the component must call `relationOne` before rendering a country name — PostgREST embed cardinality is now a rendering concern. `.update(Record<string, unknown>)` at `vendor/services/[id]/route.ts:85` and `timeline/[id]/route.ts:152/215` means a renamed column is a production 500, not a build failure. Five `as unknown as EventReadinessRow[]` casts (`budget/route.ts:127/321/670`, `admin/pricing/route.ts:107`, `bookings/route.ts:319`) hide any drift between `EVENT_READINESS_SELECT` and the row type.

Separately, the route DTOs that *do* exist are never imported: `PlanLineItem` (`budget/route.ts:240`) and `ConfirmedEvent` (`:637`) are exported and re-declared as private subsets in `client/budget/page.tsx:38/49`, bridged by three unchecked casts at `:109-111`. Of 99 `res.json()` call sites repo-wide, exactly 2 carry any assertion.

**Decision to make.** Run `supabase gen types typescript` into `src/types/database.types.ts`, pass `Database` to the three factories, add a `db:types` script beside the existing `db:push` scripts. That deletes all 6 unions, all 17 helpers, and makes `.update()` column names compile-checked. Then add one `getJson<T>()` helper and import the already-exported DTOs via `import type`.

---

### S9 — `src/components/dashboard/ui-kit.tsx` claims to be the shared primitive set and is ~80% unreachable
**Root cause.** Verified: only 3 files import from it, pulling only `DonutChart`, `DonutSegment`, `BarChart`, `ProgressRing`. Across 47 dashboard pages, **`EmptyState`, `Toolbar`, `SegmentedTabs`, `Drawer`, `DataTable` and `FilterBar` have zero external consumers.** Seven pages hand-roll a `<table>`. Two incompatible `StatCard`s exist (`ui-kit.tsx:232` with `trend: {direction, text}` — 0 importers; `stat-card.tsx:28` with `trend: {value, isPositive}` — 9 importers). `ProgressRing` at `finalization-board.tsx:79-116` is a byte-level re-implementation of `ui-kit.tsx:21-81`.

**Consequence.** Any fix applied to the kit — including the WCAG fix below — reaches almost nothing.

**Decision to make.** Either migrate the 7 tables onto `DataTable` and adopt the kit, or delete the 6 unused primitives rather than leaving a file whose docstring claims it is the standard. Keep `stat-card.tsx` (9 dependents, has the `AnimatedCounter`), delete ui-kit's `StatCard` and the private `ProgressRing`.

---

## Tactical flaws (Codex can fix directly)

### Accessibility
| Fix | Location |
|---|---|
| `Field` renders `<p className={dashLabel}>` — 27 call sites wrapping 17 `<input>` + 4 `<textarea>` have **no programmatic label**. Use `useId()` + `<label htmlFor>`; for chip-group Fields use `role="group" aria-labelledby`. | `client/wedding/page.tsx:5966` (**verified**, was cited as 5887); duplicated at `client/guests/page.tsx:905` with 6 call sites |
| Seating planner is HTML5-drag-only — no `tabIndex`, no `onKeyDown`, `assign()` reachable only from `onDrop`. **Unusable by keyboard and by every touch device.** Make `SeatChip` a `<button>` opening an "Assign to table" menu. `budget-canvas.tsx:63-67` already shows the `KeyboardSensor` pattern. | `client/guests/page.tsx:1080-1120` (**verified**) |
| Event editor sets `role="dialog" aria-modal="true"` on the **backdrop**, not the panel, and never moves, traps, or restores focus (`grep '.focus()\|useRef'` on the file → 0 hits). Move the attributes to the panel at 3340, focus it on open, restore on close. | `client/wedding/page.tsx:3335`; same gap in `ui-kit.tsx:439-470` (which also lacks Escape) and `gallery-masonry.tsx:171-181` |
| `MobileSidebar` — the only nav below `lg` in all four portals — has no `role`, no `aria-modal`, no Escape, no focus management; trigger lacks `aria-expanded`/`aria-controls`. | `sidebar.tsx:164, 185, 219` |
| `CelebrationCanvas` `aria-label="Open ${title}"` **overrides** the readiness/venue/guest text already inside the button. Fold it in: `aria-label={...node.title}, ${FLOW_STATUS_META[status].label}, ${readiness}% ready}`. Level change unmounts the focused button with no focus restore and no `aria-live`. | `celebration-canvas.tsx:485, 590; 306-307, 345, 378` |
| Destructive `opacity-0 group-hover:opacity-100` buttons with no focus variant. Append `focus-visible:opacity-100 group-focus-within:opacity-100` — `vendor/profile/page.tsx:344` already does. | `client/guests/page.tsx:1117`, `client/timeline/page.tsx:783`, `client/mood-board/page.tsx:304`, `vendor/services/page.tsx:1062` |
| WCAG AA text failures: `text-charcoal/40` = **2.15:1** on ivory (21 importers); marketing eyebrow `text-gold-primary` = **2.86:1** at 11px/0.3em. Fix to `text-charcoal` + `text-slate` and `text-gold-dark` — both are the established local patterns (`ui-kit.tsx:284-287`, `philosophy-section.tsx:21`). | `list-empty-state.tsx:8,11`; `marketing-primitives.tsx:75,77` |
| Stepper has no `role="spinbutton"`/`aria-valuenow`/arrow keys; `PresetTagInput` generates a `useId` and attaches it to the input with **no matching label anywhere** (grep for `inputId` returns exactly lines 150 and 216). | `planner-inputs.tsx:373-396; 150/216; 441-447` |
| `BarChart` values are hover-only with no focus-within and no sr-only table; `DonutChart` beside it has a proper `<ul>` legend. | `ui-kit.tsx:196-201` |
| Topbar dropdowns: no Escape, no `aria-haspopup`; account trigger has no `aria-expanded` and below `md` its only name is two initials. | `topbar.tsx:225, 323` |

### Resilience / error handling
Failure is silently converted into a confident empty or zeroed UI on roughly half the dashboard — the "fake success state" PROJECT_MEMORY prohibits. The correct pattern already exists in-repo at `admin/page.tsx:445-495` (`Promise.allSettled` + per-source `warnings` + `ErrorState` with a working `reloadKey` retry).

- `client/page.tsx:108` — `safeJson` returns `null` on both `!r.ok` and throw, so a `/api/timeline` 500 renders **"0 functions · 0 days"** plus a `severity: "high"` alert telling the client to create days they already have (207-219). Line **278** then shows a permanent *"Redirecting to setup..."* because the redirect effect early-returns on `!dash` (141-146).
- `admin/analytics/page.tsx:38` — `catch { setData(null) }` with **no `!data` guard** anywhere in the 131-line file; every value is `data?.x ?? 0`, so an outage renders "0 event plans, 0 vendors, 0 clients" identically to a healthy load. `vendor/analytics/page.tsx:149-155` gets this right.
- `client/mood-board/page.tsx:70, 95, 138` — three silent catches, no toast import. **Delete presents as a dead button**: the label flips "Removing" → "Delete" and the tile stays.
- `client/bookings/page.tsx:165-172` — booking note save failure is deliberately silent (`/* Keep the page honest without a loud UX penalty */`), button returns to "Save note", nothing written.
- `manager/configurator/page.tsx:80` — `basePrice = dest?.starting_price ?? 1500000` renders an animated **₹18.0 L "Estimated Budget"** on first paint with no destination selected, in a page whose own copy says it's used across a desk from a client.
- Split contract: `manager/clients/page.tsx:34` and `admin/clients/page.tsx:40` hit the **same endpoint with the same code shape** and diverge only in the catch — one silently empties, one toasts. Same split at `manager/vendors:59`, `manager/destinations:28`, `manager/bookings:138`, `vendor/bookings:158`, `client/vendors:530`, `client/messages:72`.
- `topbar.tsx:173-191` and `193-209` — notification rollback is dead code; neither handler checks `res.ok`, so `fetch` never rejects on a 4xx/5xx. The loader in the same file does it correctly at 151-153.
- `client/guests/page.tsx:891` — guest removal has no confirm and no undo, destroying name/email/phone/RSVP/meal/table/notes, while `vendor/services:240`, `admin/vendors:387/443` and `client/wedding:2508/2523` all confirm.

### API contract
- **Five different signals for "client has not onboarded"** across three status codes: 404 (`guests/route.ts:32,130`, `bookings:404`, `mood-boards:92`), 200 + `needsOnboarding` (`budget:731`, `messages:323`), 200 + `needsProfile` (`messages:387`), 200 + nulls (`wedding:290`, `timeline:55`), 409 (`budget:762`, `timeline:280`). Concrete cost: `client/guests/page.tsx:103-113` has no `needsOnboarding` branch, so a brand-new client sees a red toast reading *"Client profile not found"*. Add `requireClientContext()` to `src/lib/api-utils.ts`.
- **Two `getClientProfileId` with opposite error semantics** — `lib/guest-access.ts:14` returns `null` on error (transient Supabase failure → "Client profile not found"); `budget/route.ts:51-53` rethrows → 500. `getClientWeddingContext` (`lib/wedding-plan.server.ts:43`) is the right abstraction and is used by the six `wedding/*` sub-routes and nothing else.
- **Message timestamps formatted server-side in UTC**, and the raw ISO is stripped: `buildConversation` carries `createdAt` at 210 but returns `{id, from, text, time}` at **252-257**. Indian users see every message 5h30m off with no client-side recovery. `api/notifications/route.ts:43-44` returns both fields — copy that.
- **`GET /api/messages` returns every message of every thread**; the admin/manager booking query at **441-444** has no filter at all — every booking on the platform. `use-message-realtime.ts:41` polls it every 8s. Add `GET /api/messages/[bookingId]` with `?since=`.
- **`GET /api/budget` runs `EVENT_READINESS_SELECT` three times** on identical rows (`getEventPlanSpendSummary`:116, `getPlanVendorLineItems`:314, `getConfirmedEventPricing`:665) as three independent snapshots that can disagree within one response. Load the plan context once at the top of `GET`.
- **`GET /api/vendors/[slug]` writes to the database in the response path** (`recordVendorProfileView`, awaited at :101), making it uncacheable at every layer.
- **Envelope inconsistency**: `GET /api/bookings` → `{bookings}`, `POST` → bare row (`:498`); deletes return `{ok:true}` / `{deleted,id}` / `{message}`. Sharpest: `PATCH /api/timeline/[id]` emits two different shapes (192-200 vs 255), forcing `client/timeline/page.tsx:183` to patch `source` back on.
- **`DELETE /api/wedding` reads 50 plans but deletes all of them** — `.limit(50)` at 643-648, `.delete().eq("client_profile_id", …)` at 708-711 unscoped by that list, and returns `deletedPlans` built from the truncated read. Unreachable today (one plan per client), but the whole roadmap is multi-event.
- **`/api/admin/vendors/[id]/services`** addresses one sub-resource three ways: POST returns `{service}`, PATCH reads `body.serviceId` (**:92**), DELETE reads `searchParams` (**:145**). `vendor/services/[id]/route.ts` shows the correct path-param form.

### Data model
- **No index on any FK the API filters on** — `wedding_events(wedding_id)`, `weddings(client_profile_id)`, `bookings(wedding_event_id)`, `bookings(vendor_service_id)`, `budget_categories(budget_id)`, `budget_items(budget_category_id)`, `timeline_items(wedding_id)`, `guest_lists`/`mood_boards`/`budgets(client_profile_id)`, `venues(destination_id)`. Meanwhile `idx_weddings_event_type` (schema.sql:540) and `idx_wedding_events_time_block` (543) match **zero queries** in the codebase.
- **Read-then-insert singletons with no unique constraint** and disagreeing tie-breaks: `getOrCreateBudget` picks **oldest** (`budget/route.ts:503`, `ascending: true`) while `wedding-plan.server.ts:62-68`, `wedding/route.ts:301` and `bookings/route.ts:444-449` pick **newest**. Two concurrent requests create two budgets and the reader takes the wrong one — silently invisible items. Add unique indexes + `.upsert(onConflict)`.
- **No uniqueness on `(wedding_event_id, vendor_profile_id, vendor_service_id)`** — dedup lives in browser state (`client/wedding/page.tsx:1453-1455, 2386-2387`) while `bookings/route.ts:478` inserts unconditionally, and `admin/pricing/route.ts:169-179` sums every non-cancelled booking. A double save double-counts the client's final total.
- **`wedding_events.venue` is free text and `venue_id` does not exist anywhere in the repo** (grep: zero hits) despite a full `venues` table with `capacity` and `destination_id`. Blocks "which functions are at this venue", capacity validation, and the admin/client alignment goal.
- **Three delete policies on `wedding_events` FKs** — `bookings` NO ACTION (325), `budget_items` SET NULL (308), `requirements` CASCADE (272) — patched over in TypeScript at `wedding/events/[id]/route.ts:179-193`, which maps the resulting FK violation to a generic 500 and silently deletes the client's message history with each INQUIRY booking.
- **`bookings.total_amount`** is a documented legacy mirror (comment at schema.sql:354) that still gates readiness (`event-readiness.ts:43,80`) and is rewritten to mean three different things per role (`bookings/route.ts:199-225`) — which `manager/bookings/page.tsx:200-212` then sums into a single "revenue" figure, mixing client finals with vendor payouts. **That aggregate is wrong today.**
- **`vendor_profiles.rating`/`review_count` have no writer** — there is no `/api/reviews` route at all — yet `/api/vendors:87-88` sorts the public marketplace on it. **`client_profiles.wedding_date`** duplicates `weddings.date`, and `settings/client/route.ts:167-171` writes only the former.
- Newer status/category columns are bare `text` with whitelists only in TypeScript, in a schema that already uses eight real PG enums (schema.sql:8-14). `contact_inquiries.wedding_date` is `text` — hence the Invalid-Date fallback at `admin/inquiries/page.tsx:154-165`.

### Frontend performance
- `custom-cursor.tsx:42-67` — perpetual rAF that never idles, writing `el.style.left/top` (**layout props**, defeating the `will-change-transform` on line 82) and rebuilding `inner.className = cn(...)` — i.e. a **full tailwind-merge parse — 60×/sec, forever**, plus a synchronous `elementFromPoint` on every mousemove (28-29). No reduced-motion bail-out while `document.body.style.cursor = "none"`. Mounted on every marketing route.
- `loading-screen.tsx:59` — hardcoded 2000ms + 750ms exit tied to no readiness signal, no `prefers-reduced-motion` guard (the hook exists at `use-media-query.ts:18`). The splash wordmark becomes an unoptimisable LCP.
- `src/lib/fonts.ts:7,14,27` — weight **arrays** on three variable Google fonts emit **19 static woff2 files = 494,392 bytes**, of which only 4 are preloaded. The hero H1 is `font-display font-bold` — a declared-but-not-preloaded 700 file. Drop the arrays; `Inter` (line 17, no array) already does it right.
- `event-system-showcase.tsx:459` — `backdrop-blur-md` **inside** the rotating `preserve-3d` subtree (transform styles at 310-323) over `lg:min-h-[270vh]` (207), plus animated `filter: blur(8px)` at 373. Nested blur layers at 276/281/292. *(The rig is correctly reduced-motion guarded at 169 — only the compositor cost and the 270vh length are live.)*
- 8 raw `<img>` sites with **zero** `loading`/`decoding`/`width`/`height` repo-wide, rendering up-to-8MB originals (`storage.ts:17 MAX_BYTES`, no resize) into `h-16 w-16` boxes — up to 30 per catalogue group at `client/vendors/page.tsx:1251-1298`. The Supabase host is already whitelisted in `next.config.ts`.
- `use-media-query.ts:6` — both `useSyncExternalStore` args are inline arrows, so the hook re-subscribes and allocates a `MediaQueryList` per render; `package-tier-card.tsx` re-renders on every mousemove.
- `magnetic-button.tsx:28-34` — `getBoundingClientRect()` + `setState` per mousemove, in a component that already imports framer-motion. `package-tier-card.tsx:35-50` is the half-fixed version (motion values *and* a `setGlow`).
- Marketing imagery: 17 `backgroundImage: url(...)` sites with hard-coded Unsplash `w=1200`–`1600`, no `srcset`, while only 4 files import `next/image`.

### Design system
- Legacy gold `#C9A96E` ships as **76 raw `rgba(201,169,110,…)` across 44 files** alongside token gold `#A68A64`, sometimes on the same element (`sidebar.tsx:280`: token border + legacy fill). Full-opacity mismatch at `client/budget/page.tsx:542` (`stroke="#C9A96E"`) beside `text-gold-primary` at :524. Replace with `rgb(from var(--gold-primary) r g b / N)`.
- **Seven independently maintained chart palettes** (`budget-blueprint.ts:18-92`, `budget-teaser.tsx:14-19`, `admin/revenue:33-41`, `admin/analytics:57-60`, `vendor/analytics:10-19`, `client/guests:46-49`, `spend-intelligence.tsx:43-52`) containing `#D4A0A0`, `#9CAF88`, `#D4A843`, `#C4956A` — **none in the ten-swatch palette**. Root cause: `DonutSegment.color: string` (`ui-kit.tsx:88`). Promote `spend-intelligence`'s (the only on-palette one) into `dashboard-styles.ts`.
- `dashLabel` (398 uses) vs **623 inline `font-accent … uppercase` strings across 19 distinct tracking values**; hairlines split `border-charcoal/8` ×266, `/15` ×217, `/10` ×165, `/12` ×64 — `ui-kit.tsx` is internally inconsistent about it. The "selected chip" has **three incompatible specs** (`planner-inputs.tsx:25-30`, `ui-kit.tsx:358`, `client/vendors:758/784`) differing in fill *and* text colour.
- Rounded/drop-shadow card idiom contradicts the square hairline system on `/packages`, `/about`, `/blog`: `package-tier-card.tsx:68` even varies **radius by feature flag** (`featured ? "rounded-xl" : "rounded-2xl"`). Hand-rolled section headers at `philosophy-section.tsx:21` and `values-tiers-section.tsx:31` are lighter and up to 1.25rem smaller than `SectionHeader`, which PROJECT_MEMORY mandates.
- `--radius-*` has **0 usages** and is not registered in `@theme inline`, so `rounded-md` resolves to Tailwind's own value; `--shadow-*` has 3 usages against **99 arbitrary `shadow-[…]` with 75 distinct values**; `.glass` has 0 consumers.
- `MARKETING_CHAPTERS` (`marketing-primitives.tsx:32-44`) is documented as the single source of truth and has **exactly one reference — its own declaration**; all 8 sections pass literals, and its `#budget` href already resolves to nothing (`budget-teaser.tsx:49` has no `id`).

### Dead weight
- Prisma is fully removed as a dependency, but `src/generated/prisma` (47 files / 75,696 lines) is still inside `tsconfig.json`'s include and eslint's scope, and `package.json:18-20` keeps a `"prisma": {"seed": …}` block.
- `gsap` + `@gsap/react` are dependencies with **zero imports repo-wide** (grep returns only the two package.json lines) — and `PROJECT_MEMORY.md:275` tells every future agent GSAP is part of the stack. `class-variance-authority` likewise unused.
- Wedding-only copy in rendered strings: `"Wedding event"`/`"Wedding day"` (`vendor/messages:451,456`; `manager/messages:388,393`), `?? "Wedding plan"` (`manager/bookings:310,419`; `vendor/bookings:182,430`), `"Couple"` (`manager/weddings:126`), and `footer.tsx:63,174` ("Destination wedding planning system") directly contradicting `hero-section.tsx:165` ("Weddings, launches, galas, retreats") on the same scroll.

---

## Product-spec violations (PROJECT_MEMORY rules the code breaks)

| Rule | Proof |
|---|---|
| *"Budget and event plan must trend toward true two-way sync"* (Key Rule + priority #9) | `PUT /api/budget` has zero callers; no `budget_items` row is ever created (**verified**) |
| *"client vendor listing should follow event/function needs, not generic browsing"* (priority #6) | `client/vendors/page.tsx` never fetches `/api/wedding`; lanes are a hardcoded constant at 25-81 (**verified**) |
| *"Finalization should expose gaps and jump users back to the exact function/step"* | `resolveFinalizationCheck:2217` targets `selectedEvent ?? firstEvent`; `CheckResult` carries no event id |
| *"Before that, show ranges, missing inputs, or 'pricing pending'"* | `gatedSpendEstimateLabel:1234` returns `"Unlocks at 100%"` — the range machinery (`combineSpendRanges:1055`, `spendEstimateLabel:1212` "min – max", `missingCount`) is built and discarded below 100% |
| *"Venue selection should be a dropdown … with a custom option only when the catalogue does not cover it"* | Onboarding fetches `?limit=8` with no `q` (227); planner `limit=12` then `slice(0,4)`/`slice(0,6)` (4661). `/api/venues` supports `q` search (route.ts:55-59) that **no caller uses**. The custom fallback fires when the catalogue *does* cover it |
| *"Special/custom items should be separated … because Elysian must confirm their pricing manually"* | Separation is real; disclosure is absent. `grep "manual pricing\|pricing pending\|priced manually" src/` returns exactly one hit — a **marketing** string (`journey-steps.tsx:42`) |
| *"Do not use 'My Wedding' in new user-facing copy"* | 8 rendered wedding-only labels across vendor/manager/footer (above) |
| *"Does it avoid fake success states"* | `client/page.tsx:207-219`, `admin/analytics:38`, `client/mood-board:95`, `client/bookings:165`, plus the 8 silent-empty load paths |
| *"Manager pages should manage the same event/venue/vendor/catalogue/budget concepts clients see"* (#12) | `manager/configurator/page.tsx:27-30` quotes from four hardcoded string arrays via `basePrice × tierMult × guestMult × (1 + addons×0.08)`, promises venue/date controls it never renders (108-109), and persists nothing |
| *"Reduced-motion users should get instant state changes"* | `loading-screen.tsx` has no reduced-motion guard at all |
| *"Avoid slow, giant, decorative widgets"* | `event-system-showcase.tsx:207` — 270vh with `backdrop-filter` inside `preserve-3d` |
| Stack list | `PROJECT_MEMORY.md:275` names GSAP; zero imports |

---

## Already solid — do not regress

1. **`bookings` pricing constraints.** `final_price >= vendor_amount`, `price_published` implies non-null final, generated `service_fee = final_price - vendor_amount` (`schema.sql:329-345`). The commercial model from PROJECT_MEMORY is encoded in the database, not in application code. Preserve this while cleaning up the mirror columns around it.
2. **`withRoleSafePricing`** (`bookings/route.ts:176-225`). A `pricing_state` discriminant correctly honoured by both client and vendor UIs — no page anywhere renders a price it shouldn't have, and no `undefined`/`₹NaN` render was found in the entire codebase.
3. **The Layer 1/Layer 2 client planner is spec-compliant.** Onboarding cannot auto-create (`onSubmit` only advances a step at 283-287, Enter swallowed at 366-376, all nine buttons `type="button"`); no budget entry (629); no explanation block above the canvas (`MindMapGuide` deliberately unrendered); no free-text vendor name exists anywhere client-side; `EmbeddedVendorPlanner` embeds vendor selection *inside* food/design/media/entertainment/logistics/hospitality (3944-4000) with multi-vendor, multi-service and clean deselection; `applyVendorServiceToPlan` (2653-2688) saves in place with no navigation or section reset.
4. **Reduced-motion discipline.** `smooth-scroll-provider.tsx:12`, `hero-section.tsx:47` (a `shouldAnimate` guard on **every** style/animate prop), `celebration-canvas.tsx:193-202`, `flow-node.tsx:130`, `event-system-showcase.tsx:169`, `testimonial-carousel.tsx:78`. No guarded animation strands content at opacity 0.
5. **`admin/page.tsx:445-495`** — `Promise.allSettled` with per-source `warnings`, a hard error only if the primary load fails, and a real `ErrorState` with working `reloadKey` retry. This is the pattern the rest of the app should be refactored toward.
6. **`client/guests/page.tsx:126-189`** — textbook optimistic updates that snapshot, roll back, and toast on every path.
7. **`getClientWeddingContext` + `ensureWeddingDays`** (`lib/wedding-plan.server.ts:43`) — the shared-context abstraction the rest of the API needs. It just needs adopting beyond `wedding/*`.
8. **Type discipline.** `strict: true`, `tsc --noEmit` exits clean, zero `as any`, zero `@ts-ignore`. `lib/role-utils.ts` (real union, single `normalizeRole` funnel, exhaustive `portalMismatchRedirectPath`) is the template for typing booking status and requirement categories.
9. **Pagination on list routes** — `/api/vendors` caps and ranges with a proper `{items, pagination}` envelope; `/api/venues` limits; dashboards limit to 5–12.
10. **Migration file quality.** Unusually well commented about intent — `20260610000300_admin_ops_cockpit.sql` documents the two money flows correctly even though the code never uses the table.
11. **`use-message-realtime.ts`** is a deliberate, documented visibility-aware polling design (Clerk identities aren't Supabase JWTs), not a silently-failing subscription. It needs scoping, not replacing.
12. **`navbar.tsx:36-45`** — textbook passive + rAF-coalesced scroll listener; hero pointer tilt correctly uses `useMotionValue`/`useSpring`; `CelebrationCanvas` animates only transform/opacity/clip-path.
13. **Consistent typography and spacing tokens** — 642 `font-accent` / 350 `font-heading` / 350 `font-display`, zero `font-serif`/`font-mono` leakage, zero raw `fontFamily`; `var(--section-padding-x/y)` used consistently across 31 files.

---

## Suggested fix order

1. **Stop `client/page.tsx` reading the dead budget tables** (`:155-158`, `:246`) — one-file change that removes a permanently-wrong headline KPI and an impossible instruction from the client's landing page.
2. **Make the onboarding create fatal-on-error and non-201** (`wedding/route.ts:1002-1119`) — today a failed insert produces a plan the client can never repair because of the 409 at 883. Highest severity-per-line-changed in the report.
3. **Move `refreshWedding()` into a `finally` and reorder `syncVendorSelections` to create-then-delete** (`client/wedding/page.tsx:2337-2501`) — stops the planner from showing bookings the server already destroyed, without waiting for the transaction rewrite.
4. **Fix the two WCAG failures and the `Field` label** (`list-empty-state.tsx:8`, `marketing-primitives.tsx:77`, `client/wedding/page.tsx:5966`, `client/guests/page.tsx:905`) — mechanical, and the label fix touches the core paid workflow across 33 controls.
5. **Add the missing FK indexes and the unique constraints** — one migration, no application change, and it forecloses the silent duplicate-budget and duplicate-booking failure modes before data volume makes them likely.
6. **Change the two `user_id` cascades to `restrict` and soft-delete in the Clerk webhook** — currently one self-serve account deletion destroys agreed pricing and message history, and the code comment claims the opposite.
7. **Adopt one load-failure contract across the dashboard** (`admin/page.tsx:445` as the template) — the manager and vendor portals are the silent half, and staff currently cannot distinguish "no bookings" from "backend down."
8. **Generate Supabase `Database` types and wire them into the three factories** — deletes 17 helpers and 6 unions, makes `.update()` column names compile-checked, and is a prerequisite for safely doing anything else in the data layer.
9. **Decide the budget subsystem's fate (S2) and delete the client-side readiness copy (S4)** — both are blocking correctness decisions that get more expensive the longer the dead code and the divergent gate sit there.
10. **Rebuild vendor discovery on real plan data (S5) and give finalization real targets (S6)** — the two roadmap features whose chrome currently overstates what the code does.
11. **Collapse the event save into one transactional endpoint (S1)** — the largest change, and it depends on 8 and on a decision about RPC vs handler-level compensation.
12. **Marketing performance pass** — `ScrollProgress` out of the root layout, `next/dynamic` on below-the-fold sections, drop the font weight arrays, fix `custom-cursor`, gate the splash. Mostly surgical, and it moves the conversion surface off a 428 KB budget.
13. **Design-system consolidation (S9)** — decide whether `ui-kit` lives, then codemod the gold literals, chart palettes and label tokens. Last because nothing depends on it and it touches the most files.
