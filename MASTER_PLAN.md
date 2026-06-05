# Elysian — Master Plan (parallel build: Claude ‖ Codex)

The product works end-to-end; this plan is about **elevation**, not scaffolding:
intelligent interactivity (tap, don't type), redesign polish, real content, and
fixes — everywhere. Two agents run in parallel on **non-overlapping file areas**
so we never collide.

---

## A. Themes (apply to every screen)

1. **Tap, don't type.** Replace free text with chips, pickers, swatches, steppers,
   drag-and-drop. Use the shared toolkit (`src/components/dashboard/planner-inputs.tsx`).
2. **Be intelligent.** Derive instead of ask: estimated spend, readiness %, budget
   roll-ups, suggested vendors/menus from the chosen needs, smart defaults per event
   type, next-best-action prompts.
3. **Editorial luxury.** No generic-AI look — Vogue/editorial, not dashboards-by-default.
   Real motion, real imagery, real empty states.
4. **Events, not weddings.** Keep the repositioning consistent in copy + data.
5. **Quality.** Kill dead code, fix responsive/a11y, split the 5k-line planner.

---

## B. Ownership map (collision-free — do NOT edit outside your lane)

| Area | Owner |
|---|---|
| **Client planner core**: `client/{wedding,onboarding,budget,guests,timeline,mood-board,vendors,bookings,page}` | **Codex** |
| Planner/data APIs: `api/{wedding/*,budget,guests,timeline,mood-boards,saved-vendors,bookings}`, `dashboard/client`, `settings/client` | **Codex** |
| Shared data lib: `lib/event-platform.ts`, `lib/wedding-plan*` | **Codex** |
| **All marketing**: `app/(marketing)/*`, `components/marketing/*` | **Claude** |
| **Vendor portal**: `vendor/*` + `api/vendor/*`, `settings/vendor`, `dashboard/vendor` | **Claude** |
| **Manager console**: `manager/*` + `dashboard/manager` | **Claude** |
| **Admin console**: `admin/*` + `api/admin/*` | **Claude** |
| **Messaging system** (all roles): `*/messages`, `api/messages`, shared thread UI | **Claude** |
| **Shared UI / design system**: `components/dashboard/*`, `components/shared/*`, `components/layout/*` (navbar, sidebar, topbar), `lib/dashboard-styles.ts` | **Claude builds, Codex consumes** |

Rule: if you need a shared component changed, ask in this doc / handoff — don't edit
the other lane's pages. `client/messages` and `client/settings` are the only client
pages Claude touches (messaging + the shared settings shell); coordinate before.

---

## C. CODEX queue (client planner + intelligence)

**Wave 1 — finish what's in flight** (see `CODEX_HANDOFF.md §3` for the field map)
- [ ] Swap every Layer-2 textarea/input for toolkit controls (chips/pickers/steppers).
- [ ] Mount `<FinalizationBoard>` in Layer 3.
- [ ] Delete dead `editorSection === "requirements"` branch; re-confirm per-block needs
      filter still hides Food/Design/Logistics after the `1d1000d` rewrite.
- [ ] Serialization adapter for scalar string fields (`decorNotes`, `attireNotes`,
      `logistics.*`) ⇄ chip arrays (`.join(" · ")` / split).

**Wave 2 — intelligence in the planner**
- [ ] **Derived estimated spend**: compute from selected vendors + guest counts + venue,
      replace the typed `estimatedBudget` and the hero/card "₹0". Show a live range.
- [ ] **Per-block & overall readiness**: surface a small completeness ring per event.
- [ ] **Suggestions**: from a block's needs, suggest shortlisted vendors + starter menus
      (one-tap apply) instead of blank fields.
- [ ] **Smart defaults by event type**: wedding vs corporate vs birthday seed different
      blocks/needs/templates.
- [ ] **Drag-and-drop**: reorder events within/between days, reorder run-of-show.

**Wave 3 — onboarding** — apply the toolkit, type-aware defaults, a live mini-preview of
the plan as they build it.

**Wave 4 — client satellite pages**
- [ ] **Budget**: sliders/steppers + derived roll-ups (target vs quoted vs actual vs
      payable), category chips, no raw typing.
- [ ] **Guests**: bulk add, RSVP/segment chips, table assignment drag-drop, CSV import.
- [ ] **Timeline**: drag-drop run-of-show builder from `CEREMONY_FLOW_OPTIONS`.
- [ ] **Mood-board**: drag-drop tiles, image picker from a curated set, palette pulls.
- [ ] **Client → vendors**: shortlist from marketplace, compare drawer, push picks into
      the planner (no typing vendor names — user requirement).
- [ ] **Bookings**: status timeline, clear states.

**Wave 5 — client home** — intelligent summary: readiness, next-best-actions, spend
estimate, upcoming tasks.

**Refactor** — split `client/wedding/page.tsx` (5k lines) into per-section components
(`editor/BasicsSection.tsx`, `FoodSection.tsx`, …). Coordinate timing; big diff.

---

## D. CLAUDE queue (marketing + vendor/manager/admin + shared UI)

**Wave 0 — shared design system** (unblocks both lanes)
- [ ] Extend the toolkit; add shared dashboard primitives: `StatCard`, `DataTable`
      (sortable/filterable), `EmptyState`, `FilterBar`, `Drawer`, `Tabs`, `ProgressRing`
      (extract from finalization-board), `Toolbar`. One consistent luxury kit.
- [ ] Dashboard shell redesign: `sidebar.tsx` / `topbar.tsx` — role-aware, polished,
      responsive, command-style nav.

**Wave 1 — marketing redesign + content**
- [ ] **Gallery**: editorial masonry + lightbox + category filters (events, not just weddings).
- [ ] **Packages**: turn the price list into an interactive comparison/configurator teaser;
      event-type tabs; real inclusions.
- [ ] **Destinations** index + `[slug]`: richer cards, map/atmosphere filters, real copy.
- [ ] **About / FAQ / Blog / Contact**: events repositioning sweep, real content, motion,
      responsive audit. Concierge-brief contact flow (chips, not a generic form).
- [ ] Hero: wire the live "estimated spend"/metrics once Codex exposes them; mobile card copy.

**Wave 2 — vendor portal** (`vendor/*`)
- [ ] **Services builder**: tap-not-type using the toolkit (category, scope, inclusions,
      add-ons, dietary, price tiers as chips/steppers). This is the heaviest vendor screen.
- [ ] **Portfolio**: drag-drop gallery, cover selection, captions from chips.
- [ ] **Inquiries / Bookings / Calendar / Reviews / Analytics / Profile**: consistent kit,
      filters, real charts, clear states, quick actions.

**Wave 3 — manager console** (`manager/*`)
- [ ] Oversight tables (weddings/events, clients, bookings, inquiries) with the shared
      `DataTable` + filters + bulk actions + detail drawers.
- [ ] **Configurator** (internal event configurator w/ live preview — per product note):
      build it out with the toolkit + a real client-facing preview.
- [ ] Destinations / vendors management polish.

**Wave 4 — admin console** (`admin/*`)
- [ ] **Analytics**: real charts (funnel, revenue, vendor performance), date filters.
- [ ] CRUD polish for blog/destinations/packages/testimonials/users/vendors/venues using
      the shared kit; inline edit, validation, image handling.

**Cross-cutting (Claude-owned shared)**
- [ ] **Messaging**: one shared `MessageThread` + composer, used by client/vendor/manager;
      typing indicators, attachments, real-time-ish polling. Owns `api/messages`.
- [ ] **Notifications**: shared bell/center wired to `api/notifications`.

---

## E. Sequencing & coordination

- **Now:** Codex = Wave 1 (planner integration). Claude = Wave 0 (shared kit) → it
  unblocks Codex's later waves and Claude's portals. Then both proceed down their lanes.
- **Shared-component changes** are announced here before merging so the consumer can adapt.
- **Schema/API**: each owner does migrations for their lane; cross-lane needs (e.g. Codex
  wants an array column) get flagged here.
- **Commits:** small, lane-scoped, direct to `main`. Never stage the other lane's files
  (e.g. Claude never `git add client/wedding/page.tsx`).
- **Verify:** `tsc` + `lint` + `build` before each commit; drive the live preview for UI.

---

## F. Definition of done (per screen)
Tap-first (no needless typing) · intelligent defaults/derived values · luxury-consistent ·
real content + empty states · responsive + a11y · lint/tsc/build green · verified live.
