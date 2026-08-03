# Elysian Celebrations Project Memory

Last updated: 2026-08-02

This is the durable memory file for Codex, Claude, Cursor, and any future agent working in this repo. Read this after `AGENTS.md` and before making product, frontend, backend, Supabase, or deployment decisions.

The short version: Elysian is no longer just a wedding website. It is becoming a premium event-planning platform where a client defines an event, maps every day and function as a visual board, selects real venues and vendor catalogue offerings, customizes only what needs customization, and then finalizes the plan with budget, guests, hotels, logistics, and run-of-show readiness.

Do not treat this as a generic SaaS dashboard. The product should feel like an editorial planning atelier with real operational logic underneath.

## Agent Read Order

1. `AGENTS.md` - mandatory repo rules. It says this is a newer Next.js version and code work must check relevant docs under `node_modules/next/dist/docs/`.
2. `PROJECT_MEMORY.md` - this file. Product context, architecture, flows, rules, known gaps.
3. `README.md` - setup, local development, cloud testing, Supabase workflow.
4. `docs/product-rebuild-tracker.md` - recent shipped slices and verified Supabase state.
5. `MASTER_PLAN.md` - tactical multi-agent queue. Can be stale, but useful for ownership.
6. `CODEX_HANDOFF.md` - tactical handoff. Can be stale, but useful for current planner context.

If these disagree, prefer actual source code first, then this memory file, then the tracker, then tactical handoffs.

## Product Thesis

Elysian helps clients design and operate high-end celebrations and events before a single guest arrives. The product should reduce typing and uncertainty by giving users curated choices, real vendor catalogues, venue dropdowns, structured requirement chips, live estimates, and readiness checks.

The product has moved from:

- "Wedding planning website"
- To: "Event platform / celebration management system"

The app still has legacy names like `Wedding`, `WeddingDay`, and `/client/wedding` in the schema and routes. Do not interpret those as product copy direction. User-facing copy should usually say "event", "celebration", "function", "plan", or "event structure" unless a specific wedding example is being shown.

## Core User Flow

The client planning flow is three layers.

### Layer 1 - Definition

Route: `src/app/(dashboard)/client/onboarding/page.tsx`

Purpose: capture the event structure before detailed forms appear.

Current model:

- Client enters the event/profile name.
- Client chooses an event type from presets plus Custom.
- Event types live in `src/lib/event-platform.ts`.
- Client chooses number of days.
- Client can set dates per day.
- Client defines enabled time blocks per day: Morning, Afternoon, Evening.
- Each time block captures title, start/end time, venue/area, guest count, and selected needs.
- Step 5 is deliberately compact: one day can be open, function rows start collapsed, and the context trail reads `Day / All time blocks` or `Day / Morning|Afternoon|Evening`.
- Needs are selected from food, decor, photo-video, entertainment, hospitality, logistics. Custom needs are added later, not during onboarding.
- Form submission must never auto-create the event. Continue and Create buttons must stay `type="button"`. Creation is only via the explicit Create button handler.

Important product rule: no budget entry in onboarding. Elysian estimates spend after the plan and vendor selections exist.

### Layer 2 - Requirements / Flowchart Workspace

Route: `src/app/(dashboard)/client/wedding/page.tsx`

Purpose: map the whole event as a visual flowchart and edit one scoped part at a time.

Current direction:

- The flowchart/mind-map/canvas is the primary object.
- The board should show event hub -> days -> functions/time blocks -> step tokens.
- Users pick a day, then a function, then a step.
- Maps render at most six day/function nodes per page so the supported 14-day structure stays readable instead of colliding.
- The editor opens only after a step token is selected.
- Add Day and Add Event exist only in the Layer 2 workspace header; Add Event targets the day currently opened in the canvas.
- Do not place large instructional/explanation cards above the canvas. The canvas must be the focus.
- Day nodes should show date and day identity, not generic "Day 1" if date/name is known.
- Function nodes should show basic details directly: function name/type, time, venue, guests, readiness.
- Event name and event type should not feel duplicated to the user. Prefer one clear name/type field or a paired control that reads as one concept.
- Each step should have its own visual identity. Current shared primitives live in `src/components/dashboard/event-flow/`.

Layer 2 sections:

- Basics - function name/type, date, time, venue dropdown, and guest count. Spend estimation remains available to the budget and plan-summary logic rather than adding another card inside the scoped editor.
- Food - vendor services first, menu rows second, custom/special items separated for manual pricing.
- Design/decor - vendor setups and catalogue rows first, notes/customization second.
- Vendors/services - vendors should be embedded in each relevant need, not a disconnected standalone tab.
- Logistics/hospitality - vendor-backed where relevant, plus transport, rooming, weather, access, family/vendor call times.
- Tasks - simple interactive tasks, not heavy project-management clutter.
- Notes/special requirements - clear open request capture for anything that cannot be estimated automatically.

Important product rule: users should not type vendor names. Vendors are selected from marketplace/shortlist/catalogue options.

### Layer 3 - Finalization

Current component: `src/components/dashboard/finalization-board.tsx`

Purpose: show what is ready, partial, or missing before execution.

Checklist source: `EVENT_FINALIZATION_CHECKLIST` in `src/lib/event-platform.ts`.

Finalization should cover:

- Definition complete
- Requirements filled
- Vendors assigned
- Budget reconciled
- Guests and hotels covered
- Run-of-show production-ready

This layer should not be a passive summary. It should expose gaps and jump users back to the exact function/step that needs work.

## Key Product Rules

- Tap first, type only when necessary.
- Venue selection should be a dropdown wherever a venue is chosen, with a custom option only when the catalogue does not cover it.
- Vendor selection should happen inside the relevant need/step, not as a separate abstract activity.
- Vendor catalogues should show what vendors actually offer: menu sections, counters, setups, deliverables, performances, looks, add-ons, images, and reference URLs.
- Users can select multiple vendors and multiple services from the same vendor where the event needs it.
- Selecting catalogue rows should save and keep the editor open. Do not reload the user back to the start of the vendor selection journey.
- Special/custom items should be separated from estimated-price items because Elysian must confirm their pricing manually.
- Food and other guest-count-sensitive estimates should support per-person logic.
- Event/day estimates should only feel final once the relevant plan is complete enough. Before that, show ranges, missing inputs, or "pricing pending".
- Budget and event plan must trend toward true two-way sync: planner selections create/update budget lines, and budget changes reflect back into planner estimates.
- Do not use "My Wedding" in new user-facing copy. Use event/celebration language.
- Do not add large static explanation blocks above actual work surfaces.
- Mobile action rows must not overlap. Save/Create/Delete buttons need clear wrapping, spacing, and full-width behavior when space is tight.
- Reduced-motion users should get instant state changes, not hidden or broken content.

## Commercial Pricing Model

Pricing is an Elysian-operated workflow, not an in-app vendor negotiation flow.

1. Elysian and the vendor agree the event-specific vendor price offline.
2. An admin records the agreed vendor price and one flat INR Elysian fee in `/admin/pricing`.
3. The API derives the client final price as `vendor_amount + service_fee` and stores it in `final_price`.
4. Admin explicitly publishes or unpublishes that client total.
5. Vendors never type, submit, revise, or negotiate a quote in the portal. They only see their agreed payout after Elysian records it.
6. Clients never receive the vendor payout or Elysian fee. They only receive a published final price when the existing readiness rules allow it.
7. Managers may see the operationally relevant published total or agreed vendor payout, but never the fee breakdown.

`bookings.vendor_amount` is admin-owned and may be corrected when an offline agreement changes. `bookings.service_fee` remains a generated database value equal to `final_price - vendor_amount`; it is a flat amount, not a percentage, margin, commission, or negotiable rate. `bookings.total_amount` is retained only as a compatibility mirror for older code and data. New commercial writes must go through `/api/admin/pricing`.

## Roles And Portals

### Marketing

Routes:

- `/`
- `/about`
- `/destinations`
- `/destinations/[slug]`
- `/packages`
- `/gallery`
- `/blog`
- `/blog/[slug]`
- `/faq`
- `/contact`
- `/privacy-policy`
- `/terms-of-service`

Current direction:

- The landing page should tell the product story: define event -> map functions -> select venues/vendors/catalogues -> estimate budget -> finalize readiness.
- The hero is a dark, earth-toned, 3D planning atelier.
- The whole page should use the same palette and story, not just the hero.
- Avoid slow, giant, decorative widgets that do not explain the product.
- Motion should be fast, purposeful, and reduced-motion safe.
- Marketing section headers should use `src/components/marketing/shared/marketing-primitives.tsx`.
- Do not invent chapter numbers. Use `MARKETING_CHAPTERS`.
- The nav should stay premium/dark/glass where intended. Do not let it become a white slab on scroll.

Important marketing components:

- `src/components/marketing/hero/hero-section.tsx`
- `src/components/marketing/home/event-system-showcase.tsx`
- `src/components/marketing/home/planning-manifesto.tsx`
- `src/components/marketing/destinations/destination-carousel.tsx`
- `src/components/marketing/how-it-works/journey-steps.tsx`
- `src/components/marketing/packages/package-section.tsx`
- `src/components/marketing/vendors/vendor-marquee.tsx`
- `src/components/marketing/budget/budget-teaser.tsx`
- `src/components/marketing/testimonials/testimonial-carousel.tsx`

### Client Portal

Primary routes:

- `/client` - dashboard home and next actions.
- `/client/onboarding` - Layer 1 Definition.
- `/client/wedding` - Layer 2/3 event plan board. Legacy route name, product is now event planning.
- `/client/vendors` - marketplace/vendor discovery. Needs to stay aligned with function-based planning.
- `/client/budget` - cost estimation and budget sync.
- `/client/bookings` - booking detail/status surfaces.
- `/client/messages` - booking-thread messaging.
- `/client/guests` - guest list.
- `/client/timeline` - timeline/run-of-show/task surfacing.
- `/client/mood-board` - visual inspiration.
- `/client/settings` - profile/settings.

Client portal design should feel quieter than the marketing page but still premium: ivory surfaces, charcoal/brown/sage palette, editorial labels, clear cards, and direct action hierarchy.

### Vendor Portal

Primary routes:

- `/vendor`
- `/vendor/profile`
- `/vendor/services`
- `/vendor/bookings`
- `/vendor/messages`
- `/vendor/portfolio`
- `/vendor/reviews`
- `/vendor/inquiries`
- `/vendor/calendar`
- `/vendor/analytics`
- `/vendor/settings`

Vendor services are core to the product. Vendors should build real catalogue offerings, not just names and prices.

Important files:

- `src/app/(dashboard)/vendor/services/page.tsx`
- `src/app/api/vendor/services/route.ts`
- `src/app/api/vendor/services/[id]/route.ts`
- `src/lib/vendor-offering.ts`
- `src/lib/supabase/storage.ts`

Vendor catalogue items support media through `imageUrls` and `referenceUrl`. Supabase Storage bucket: `vendor-media`.

### Manager Portal

Primary routes:

- `/manager`
- `/manager/weddings` - legacy name, should be event-aware in copy over time.
- `/manager/bookings`
- `/manager/inquiries`
- `/manager/messages`
- `/manager/clients`
- `/manager/vendors`
- `/manager/destinations`
- `/manager/configurator`
- `/manager/settings`

Manager pages should become operational command centers with filters, drawers, and context, not flat tables.

### Admin Portal

Primary routes:

- `/admin`
- `/admin/analytics`
- `/admin/blog`
- `/admin/clients`
- `/admin/destinations`
- `/admin/inquiries`
- `/admin/packages`
- `/admin/pricing`
- `/admin/progress`
- `/admin/revenue`
- `/admin/settings`
- `/admin/testimonials`
- `/admin/users`
- `/admin/vendors`
- `/admin/venues`

Admin should align with client and vendor flows. Admin-managed venues/vendors/packages should feed actual planner choices.

## Backend And Data Model

Stack:

- Next.js App Router, currently `next@16.2.12` with patched PostCSS and Sharp overrides.
- React `19.2.4`.
- Clerk for auth.
- Supabase Postgres for product data.
- Supabase Storage for vendor catalogue media.
- Prisma schema is present as a model reference, but app routes primarily use Supabase clients.
- Tailwind CSS v4.
- Framer Motion and Lenis for animation and scroll behavior. GSAP is not part
  of the active stack; the package was removed because the application had no
  imports.

Important env variables are listed in `.env.example`. Never commit actual values.

Common Supabase env names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_DB_URL`

Common Clerk env names:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`

Local QA auth bypass:

- `ELYSIAN_TEST_AUTH_BYPASS`
- `NEXT_PUBLIC_ELYSIAN_TEST_AUTH_BYPASS`
- `ELYSIAN_TEST_AUTH_DEFAULT_ROLE`

Do not enable auth bypass in production.

### Core Models

The Prisma schema names remain wedding-oriented in places:

- `User`
- `ClientProfile`
- `Wedding`
- `WeddingDay`
- `WeddingEvent`
- `WeddingEventRequirement`
- `WeddingEventMenu`
- `WeddingEventMenuItem`
- `WeddingEventLogistics`
- `WeddingEventTask`
- `VendorProfile`
- `VendorCategory`
- `VendorService`
- `VendorServiceItem`
- `Destination`
- `Venue`
- `PackageTier`
- `Budget`
- `BudgetCategory`
- `BudgetItem`
- `Booking`
- `SavedVendor`
- `VendorProfileView`
- `Review`
- `Message`
- `MessageThreadRead`
- `Notification`
- `GuestList`
- `Guest`
- `TimelineItem`
- `MoodBoard`
- `MoodBoardItem`
- `BlogPost`
- `Testimonial`
- `ContactInquiry`

Important event-platform fields:

- `weddings.event_type`
- `weddings.custom_event_type`
- `weddings.event_platform_version`
- `weddings.definition_payload`
- `wedding_events.time_block`
- `wedding_events.requirement_payload`
- `wedding_events.venue`
- `wedding_events.guest_count`
- `wedding_event_requirements.category`
- `wedding_event_requirements.vendor_profile_id`
- `wedding_event_requirements.vendor_service_id`
- `wedding_event_requirements.payload`

Important vendor catalogue fields:

- `vendor_services.service_scope`
- `vendor_services.event_type_fit`
- `vendor_services.inclusions`
- `vendor_services.deliverables`
- `vendor_services.add_ons`
- `vendor_service_items.item_type`
- `vendor_service_items.dietary_tags`
- `vendor_service_items.image_urls`
- `vendor_service_items.reference_url`
- `vendor_service_items.sort_order`

Important budget sync fields:

- `budget_items.wedding_event_id`
- `budget_items.estimated_cost`
- `budget_items.actual_cost`
- `budget_items.is_paid`

## API Surface

Planner and client:

- `src/app/api/wedding/route.ts`
- `src/app/api/wedding/days/route.ts`
- `src/app/api/wedding/days/[id]/route.ts`
- `src/app/api/wedding/events/route.ts`
- `src/app/api/wedding/events/[id]/route.ts`
- `src/app/api/budget/route.ts`
- `src/app/api/vendors/route.ts`
- `src/app/api/vendors/[slug]/route.ts`
- `src/app/api/venues/route.ts`
- `src/app/api/saved-vendors/route.ts`
- `src/app/api/saved-vendors/[slug]/route.ts`
- `src/app/api/bookings/route.ts`
- `src/app/api/bookings/[id]/route.ts`
- `src/app/api/guests/route.ts`
- `src/app/api/guests/[id]/route.ts`
- `src/app/api/timeline/route.ts`
- `src/app/api/timeline/[id]/route.ts`
- `src/app/api/mood-boards/route.ts`
- `src/app/api/mood-boards/items/[id]/route.ts`

Messaging and notifications:

- `src/app/api/messages/route.ts`
- `src/app/api/notifications/route.ts`

Vendor:

- `src/app/api/vendor/profile/route.ts`
- `src/app/api/vendor/services/route.ts`
- `src/app/api/vendor/services/[id]/route.ts`
- `src/app/api/vendor/analytics/route.ts`

Admin and manager:

- `src/app/api/dashboard/client/route.ts`
- `src/app/api/dashboard/vendor/route.ts`
- `src/app/api/dashboard/manager/route.ts`
- `src/app/api/dashboard/admin/route.ts`
- `src/app/api/admin/*`

Auth and content:

- `src/app/api/webhooks/clerk/route.ts`
- `src/app/api/contact/route.ts`
- `src/app/api/destinations/route.ts`
- `src/app/api/destinations/[slug]/route.ts`

## Supabase Workflow

Docs:

- `docs/supabase-remote-workflow.md`
- `docs/supabase-seeding.md`
- `docs/cloud-testing.md`

Commands:

```bash
npm run db:link
npm run db:migrations
npm run db:push
npm run db:push:seed
npm run db:query -- --sql "select now();"
npm run db:types
npm run seed
```

Migrations live in `supabase/migrations/`. Schema reference lives in `supabase/schema.sql`. Seed data lives in `supabase/seed.sql` and `scripts/supabase-seed.ts`.

If remote data was manually changed, do not blindly push baseline migrations. Inspect migration state first.

## Design System Memory

Current palette is the earth palette from `src/app/globals.css`:

- dark walnut `#582F0E`
- saddle brown `#7F4F24`
- toffee brown `#936639`
- camel `#A68A64`
- khaki beige `#B6AD90`
- dry sage `#C2C5AA`
- dry sage 2 `#A4AC86`
- dusty olive `#656D4A`
- ebony `#414833`
- charcoal brown `#333D29`

Important tokens:

- `--gold-primary` maps to camel.
- `--gold-light` maps to khaki beige.
- `--gold-dark` maps to saddle brown.
- `--ivory` is the main warm page background.
- `--midnight` and `--charcoal` map to charcoal brown.
- `--slate` maps to dusty olive.

Typography tokens:

- `font-display` - Playfair-style display.
- `font-heading` - Cormorant-style editorial text.
- `font-sans` - Inter-style utility copy.
- `font-accent` - Josefin-style uppercase labels.

Visual language:

- Editorial luxury, not blue SaaS.
- Earthy, cinematic, spatial, tactile.
- Flowchart, atlas, board, orbit, branch, readiness, concierge language.
- Use texture, grid, hairlines, ornaments, depth, and purposeful motion.
- Avoid generic purple gradients, bland white SaaS panels, and overlong static cards.

Dashboard shared style helpers:

- `src/lib/dashboard-styles.ts`
- `src/components/dashboard/ui-kit.tsx`
- `src/components/dashboard/planner-inputs.tsx`
- `src/components/dashboard/event-flow/*`
- `src/components/dashboard/finalization-board.tsx`

Planner input direction: chips, pickers, swatches, steppers, dropdowns. Avoid raw textareas unless the user truly needs open notes.

## Current Implementation State

As of this memory update:

- `main` is the deployment branch and pushes to it trigger the linked Vercel production project.
- Recent local verification for the app has used `npm run lint`, `npx tsc --noEmit --pretty false`, and `npm run build`.
- Recent pushes go directly to `origin/main`, which Vercel auto-deploys.
- `.vercel` is linked locally to the Vercel project.
- The marketing hero and event-system story have been redesigned around the event platform.
- The planner now uses a radial `CelebrationCanvas` for the event map.
- Layer 1 step 5 uses nested day/function accordions with a persistent `Day / time block` context trail, reducing the full multi-day form to one open function at a time.
- Layer 2 keeps Add Day and Add Event in the workspace header only. Opening a shaped step token mounts one scoped editor, with compact date/time/venue context under its heading rather than a second side card.
- Venue selection is present in onboarding time blocks and planner basics through dropdown/custom venue UI.
- Venue dropdowns load up to 30 matching catalogue records, support local search,
  and reveal custom entry only when the catalogue does not cover the user's query.
- Vendor service selection in the planner supports multiple selections and catalogue row application.
- Client vendor discovery derives its sourcing lanes from the actual plan's
  day/function requirements and current selections; no hardcoded Haldi/Sangeet
  lane list remains.
- The client budget page is read-only spend intelligence tied to event-plan and
  vendor selections. It supports function, day, category, vendor, pricing-state,
  and paid/due views. The old drag-budget UI/store is removed.
- Vendor catalogue media support exists through Supabase Storage helper and `vendor_service_items.image_urls`.
- Commercial pricing is admin-owned: `/admin/pricing` records the agreed vendor payout and flat Elysian fee, derives the client final, and controls publication. Client APIs gate published finals behind 100% function readiness and never serialize vendor payout or fee data.
- Supabase browser/server factories use generated `Database` types, and dynamic
  API write payloads are compile-checked against table insert/update contracts.
  `npm run db:types` prefers the pinned official CLI when a management token is
  available and otherwise reads the linked PostgreSQL catalogue directly.
- Mood-board items retain category and creation metadata through migration
  `20260802000500_restore_mood_board_item_metadata.sql`.

## Known Gaps And Active Priorities

These are the highest-value next directions. Confirm against source before editing because parts may already be in progress.

1. Transaction boundary: move event creation and per-function multi-table saves
   into reviewed Postgres RPCs so rollback is guaranteed rather than compensated.
2. Venue normalization: add `wedding_events.venue_id` while preserving the text
   snapshot/custom-area fallback, then add capacity and destination validation.
3. Financial ledger: split client receipts from vendor payouts instead of using
   `bookings.paid_amount` for both operational directions.
4. Legacy singleton ownership: decide whether budgets and guest lists belong to a
   client or an event, then merge existing duplicates before adding uniqueness.
5. Messaging scale: add booking-scoped incremental reads/pagination while keeping
   the role-checked API boundary used by Clerk identities.
6. Rendering architecture: decompose the large client planner and move stable
   dashboard reads server-side without regressing the radial interaction model.
7. Planner editing: keep save/create/delete actions regression-tested across
   narrow mobile widths and preserve authoritative refresh after partial errors.
8. Estimates: deepen per-person food and guest-sensitive pricing using real
   service units while preserving manual-pricing disclosure for custom requests.
9. Admin/manager alignment: continue mapping operations surfaces onto the same
   event, venue, vendor, catalogue, readiness, and spend concepts clients see.
10. Legacy naming: schema/routes still use wedding names. Do not rush a destructive
    rename; keep changing user-facing vocabulary first.

## Verification Commands

Use the repo's Node runtime if Codex provides one:

```bash
export PATH="/Users/rayyan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
```

Standard checks:

```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```

Local dev:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

For UI changes, use browser screenshots or live browser QA when possible. Auth-gated dashboard pages can use the local test auth bypass only outside production.

## Deployment Memory

GitHub remote:

```text
origin -> https://github.com/rayyanpasha89/Elysian-Celebrations.git
```

Deployment:

- Vercel is connected to GitHub.
- Pushes to `main` are expected to auto-deploy.
- Vercel env vars must include Clerk and Supabase values.
- Never commit `.env`, `.env.local`, `.env.vercel.production`, passwords, service keys, access tokens, or user-provided secret values.

## Security Rules

- Do not write actual API keys, service role keys, DB passwords, Clerk secrets, or one-time codes into docs or commits.
- Client-side code can only use public/publishable keys.
- Server-only routes can use Supabase secret/service role keys.
- Treat uploaded media URLs as public unless the storage bucket is changed to private.
- Validate user-provided URLs. Existing vendor offering normalizer only accepts http/https URLs and caps counts/lengths.
- Be careful with destructive data cleanup. Ask before deleting remote Supabase data.
- Do not use `git reset --hard`, `git checkout --`, force-push, or destructive SQL unless explicitly asked and confirmed.

## Development Practices

- Use `apply_patch` for manual edits.
- Do not stage unrelated files.
- Prefer `rg` and `rg --files` for searching.
- Read relevant source before changing it.
- If editing Next.js APIs or routing behavior, read relevant docs under `node_modules/next/dist/docs/` first because this repo uses a newer Next.js version.
- Keep code ASCII unless the file already uses a justified non-ASCII character.
- For frontend work, preserve the earth palette and editorial language.
- For dashboard work, prioritize clarity, fewer choices, and tap-first controls.
- For backend work, preserve stable IDs when updating nested event/menu/task rows.
- For Supabase migrations, update `supabase/migrations`, verify with remote workflow when appropriate, and never rely only on dashboard manual SQL.

## Product Vocabulary

Preferred:

- event
- celebration
- function
- day
- time block
- flow map
- branch
- step
- requirement
- venue
- vendor service
- catalogue row
- special request
- manual pricing needed
- readiness
- finalization
- run-of-show
- concierge brief

Avoid in new copy unless legacy or example context requires it:

- my wedding
- wedding-only
- generic inquiry form
- placeholder
- fake save
- browse-only
- menu as a standalone form before vendor context

## Mental Model For Future Work

When adding or fixing a feature, ask:

1. Does this help the user move from event definition to a clearer plan?
2. Can the user select from a real venue/vendor/catalogue instead of typing?
3. Does this belong inside a specific day/function/step rather than a global page?
4. Does this preserve stable backend IDs and sync with budget/bookings/messages?
5. Does the UI keep the flowchart or main task in focus?
6. Does it fit the earth-toned editorial design system?
7. Does it avoid fake success states and placeholder-only buttons?
8. Does it verify with lint, TypeScript, build, and live UI where possible?

If the answer is no, pause and reshape the implementation before shipping.
