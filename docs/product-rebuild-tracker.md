# Product Rebuild Tracker

This is the working tracker for the recent Elysian Celebrations rebuild push. Keep it updated when a slice is shipped, verified, or intentionally deferred.

## Deployment Handoff

- Current source branch: `main`
- Primary GitHub remote: `origin` -> `rayyanpasha89/Elysian-Celebrations`
- Vercel handoff path: pushes to `origin/main`
- Base pushed commit before this tracker was added: `e79873b Deepen wedding planning and event budgets`
- Follow-up slice: bookings event context, event-task timeline integration, Supabase saved vendors
- Local Vercel CLI state: authenticated and linked to the production project; pushes to `origin/main` remain the deployment handoff.

## Cloud / Supabase State

- Supabase project URL: `https://zauzcmiuefypwljwdcmc.supabase.co`
- Remote migrations verified through `npm run db:migrations`.
- Applied remote migrations:
  - `20260331000000_baseline_schema.sql`
  - `20260401000000_add_manager_role.sql`
  - `20260401010000_reconcile_existing_remote_schema.sql`
  - `20260412000100_add_wedding_days_and_event_planning.sql`
  - `20260512000100_deepen_event_planning.sql`
  - `20260512000200_link_budget_items_to_events.sql`
  - `20260514000100_deepen_vendor_offerings.sql`
  - `20260514000200_add_message_thread_reads.sql`
  - `20260601000100_add_vendor_service_item_media.sql`
  - `20260601000200_enable_message_realtime.sql`
  - `20260604000100_event_platform_definition_layer.sql`
  - `20260604000200_add_event_requirements.sql`
  - `20260610000100_booking_admin_pricing.sql`
  - `20260610000200_admin_managed_vendors.sql`
  - `20260610000300_admin_ops_cockpit.sql`
  - `20260713122345_final_pricing_fee_model.sql`
  - `20260713124846_preserve_legacy_vendor_amounts.sql`
  - `20260713130159_lock_public_schema_behind_server_api.sql`
  - `20260713135700_admin_owned_offline_pricing.sql`
  - `20260802000100_harden_booking_pricing_and_selection.sql`
  - `20260802000200_add_query_path_indexes.sql`
  - `20260802000300_preserve_identity_history.sql`
  - `20260802000400_validate_payment_direction.sql`
  - `20260802000500_restore_mood_board_item_metadata.sql`
  - `20260803000100_complete_query_path_indexes.sql`
  - `20260810181932_add_api_rate_limits.sql`
  - `20260810194000_lock_update_trigger_search_path.sql`
  - `20260810201500_tokenize_vendor_media_reservations.sql`
- Remote table/column checks passed for:
  - `wedding_event_menus`
  - `wedding_event_menu_items`
  - `wedding_event_logistics`
  - `wedding_event_tasks`
  - `budget_items.wedding_event_id`
  - `message_thread_reads`
  - `vendor_service_items.image_urls`
  - `vendor_service_items.reference_url`
  - `messages` in `supabase_realtime`
  - `weddings.event_type`
  - `weddings.custom_event_type`
  - `weddings.event_platform_version`
  - `weddings.definition_payload`
  - `wedding_events.time_block`
  - `wedding_events.requirement_payload`
  - `wedding_event_requirements`
  - `bookings.vendor_amount`
  - generated `bookings.service_fee`
  - final-price validation constraints and admin-owned offline pricing metadata

## Current Working-Tree Hardening (2026-08-10)

These items are present in the current source tree. They are not, by themselves,
claims that the changes are committed, deployed, or active in the remote database:

- All four portal layouts perform server-side role checks before rendering.
  Supabase role/active state is authoritative, and Clerk identity updates cannot
  restore stale role metadata. Replayed create events preserve existing role and
  activation state, and auth outages remain distinguishable from sign-out.
- CSP and application security headers cover every route, including frame denial,
  nosniff, referrer/permissions policies, COOP, production HSTS, and Clerk's
  required challenge/protection origins.
- Database-backed API limits and atomic 100 MB vendor-media quota reservations
  are implemented and applied remotely. Upload requests are capped at 4 MB and
  use exact reservation tokens. Rollback-only verification covers the rate
  boundary, grants, RLS isolation, expiration cleanup, and token-safe release.
- `evaluateEventReadiness()` is the canonical planner/pricing contract across
  wedding hydration, budget, bookings, and admin pricing, with focused contract
  tests for the formerly divergent cases. The admin aggregate averages those
  canonical event percentages and reports complete events separately.
- The dead legacy `PUT /api/budget` writer and blueprint helper are removed;
  `/api/budget` retains only its live plan-derived read model.
- Retryable load failures are explicit on manager clients, vendors, destinations,
  and bookings; vendor bookings; and client messages. Other dashboard pages are
  not implicitly covered.
- Vendor catalogue images are HTTPS-only and restricted to Unsplash or the public
  Supabase `vendor-media` path. Reference links remain HTTPS-only.
- Messages intentionally use visibility-aware API polling; direct Supabase
  Realtime remains deferred pending a Clerk-to-Supabase JWT bridge.

## Shipped Recently

- Completed the first design-audit remediation wave: made event creation
  fail-and-clean-up on dependent errors, made planner refresh authoritative after
  every save attempt, and reordered vendor replacement sync so a failed
  replacement cannot destroy draft picks.
- Finalization cards identify and open the exact day/function/step gap instead of
  sending users to whichever event was active.
- Rebuilt client vendor sourcing lanes from real event requirements and selected
  services. Catalogue failures and plan failures are now explicit retry states,
  not "no vendors" or fabricated wedding-only recommendations.
- Generated compile-checked Supabase database types for all 39 public tables and
  seven enums; wired them into browser/server/admin clients and added a repeatable
  `npm run db:types` workflow.
- Applied generated insert/update/enum contracts across the remaining admin,
  booking, guest, settings, timeline, vendor, Clerk-webhook, and event-plan API
  boundaries. The type generator uses the pinned official Supabase CLI when a
  management token is available and read-only catalogue introspection otherwise.
- Reconciled mood-board schema drift with
  `20260802000500_restore_mood_board_item_metadata.sql`; category and creation
  metadata are preserved end to end, and all six live rows passed rollback-only
  backfill validation.
- Added and production-preflighted query-path indexes, identity-history foreign
  key restrictions, and payment-direction validation. Active duplicate booking
  selections are already blocked by the prior partial unique index.
- Separated vendor profile reads from analytics writes. Profiles render first;
  deduplicated views are recorded through `/api/vendors/[slug]/view` afterward.
- Consolidated the budget API onto one event/readiness snapshot per request and
  stopped GET requests from creating or presenting the unreachable legacy budget
  canvas as a source of truth.
- Closed core accessibility gaps in planner fields/dialogs, seating assignment,
  mobile navigation, radial-canvas focus, timeline/mood-board destructive actions,
  steppers, charts, topbar menus, and marketing-gallery focus management.
- Removed the orphan drag-budget editor/store, dead UI-kit primitives, unused
  GSAP/CVA/dnd-kit/Zustand dependencies, and all remaining navy dashboard panels.
  Live dashboard charts now share one approved walnut/camel/sage palette.
- Venue selection now searches up to 30 catalogue records and reveals custom
  entry only when the search is not covered. Custom requirements clearly state
  that pricing remains excluded until Elysian confirms and publishes it.
- Upgraded to `tsx@4.23.4` / patched `esbuild`, normalized the lockfile, and
  restored a zero-vulnerability full `npm audit` result.
- Upgraded the runtime to `next@16.2.12` and pinned patched `postcss@8.5.25` plus `sharp@0.35.3`; `npm audit --omit=dev` now reports zero vulnerabilities.
- Corrected the commercial contract to match operations: Elysian agrees pricing with vendors offline, an admin records the agreed vendor price plus one flat INR Elysian fee, and the API derives `final_price = vendor_amount + fee`. Vendors never submit or negotiate quotes in the portal, while Supabase still generates `service_fee = final_price - vendor_amount` as the accounting invariant.
- Rebuilt `/admin/pricing` around client → day → function → vendor-pick drill-down. The editor now accepts the agreed vendor payout and flat Elysian fee, previews the derived client total, and provides explicit draft/publish/unpublish behavior. `/admin/revenue` reports final value, vendor payouts, Elysian fee, category contribution, and client contribution with no margin/GST/negotiation language.
- Reworked Layer 1 step 5 into compact nested day/function accordions. Only one day and one Morning/Afternoon/Evening function need to be open, while a persistent context trail keeps the active `Day / function` visible and venue selection remains catalogue-first with custom fallback.
- Simplified Layer 2 so Add Day and Add Event live only in the flowchart workspace header. Day/function duplicates were removed from the radial canvas, and the scoped editor now places date, time, and venue directly below its heading while dropping the redundant readiness and locked-estimate cards.
- Hardened the compact planner interactions: Step 5 starts with function details collapsed, exposes accessible day/function disclosure state and a persistent `Day / function` path, Add Event follows the active map day, unsaved editor changes are protected, duplicate submit requests are gated, dialogs trap and restore keyboard focus, and radial day/function maps paginate after six nodes so the supported 14-day definition cannot collide.
- Added multi-angle spend intelligence to `/client/budget` with a live pie/donut view and selector for function, day, category (including food), vendor, final-versus-estimate, and paid-versus-due analysis. Published final prices replace estimates only when every active pick for the function is published and the function definition is complete.
- Hardened booking pricing privacy by projecting role-specific response shapes: clients do not receive vendor amount, fee, draft final price, or Clerk identity IDs; vendors see only their amount; managers see the published client total or vendor amount without fee data; admins receive the full commercial record.
- Unified client estimate and final-price visibility behind one shared 10-check event-readiness contract. Cost estimates, published totals, and booking details stay sealed until the function reaches 100%; agreed vendor payouts, fees, and sealed final totals are never serialized to the client.
- Locked the Supabase public schema behind the server API with migration `20260713130159_lock_public_schema_behind_server_api.sql`. RLS is enabled on all 39 public tables, `anon` and `authenticated` have zero table/sequence/function privileges, and only role-checked Next.js handlers use `service_role`.
- Made test-role switching development-only. Production builds now ignore the test-auth bypass unconditionally, so a copied environment flag or `?testRole=admin` query cannot grant portal access outside local development.
- Closed admin and cross-role QA defects around suspended-user authorization, manager vendor response mapping, unpublished review leakage, cross-vendor storage deletion, vendor inquiry deletion, and admin service deletion with linked-booking protection.
- Added the Layer 2 "mind-map celebration board" under `src/components/dashboard/event-flow/` and wired its radial `CelebrationCanvas` into the client event planner. The reusable kit includes shaped day/function nodes, step orbits, connectors, status language, a map legend, and guided empty states; the same drill-down interaction now also powers admin final pricing.
- Added the event-platform definition layer so Elysian can move beyond wedding-only planning. Migration `20260604000100_event_platform_definition_layer.sql` adds `weddings.event_type`, `custom_event_type`, `event_platform_version`, and `definition_payload`, plus `wedding_events.time_block` and `requirement_payload`. The remote Supabase database has the migration applied and column checks passed.
- Added `src/lib/event-platform.ts` as the shared source of truth for the new flow: 14 top-level event types including custom events, Morning/Afternoon/Evening time blocks, requirement categories for food/decor/photo-video/entertainment/hospitality/logistics/custom needs, a finalization checklist, and safe JSON payload normalization for future custom requirements.
- Updated `/api/wedding` to accept either the old onboarding payload or a new layered `eventDefinition.days[].timeBlocks[]` payload. Old wedding onboarding still creates the classic starter plan; new event-definition payloads create real day/time-block events with stable event IDs that budgets, bookings, menus, vendors, logistics, and tasks can keep using.
- Updated `/api/wedding/events` and `/api/wedding/events/[id]` so individual events can store and return `time_block` plus a sanitized `requirement_payload`, giving the frontend a safe backend path for Layer 2 customization without another route rewrite.
- Added structured Layer 2 requirement persistence through migration `20260604000200_add_event_requirements.sql`. Each event block can now own `wedding_event_requirements` rows with category, title, status, priority, linked vendor/service, sanitized JSON payload, notes, and sort order. `/api/wedding/events/[id]/requirements` supports client-owned GET and id-preserving PUT sync, and `/api/wedding` now hydrates requirements alongside menus, logistics, tasks, bookings, and vendor selections.
- Added vendor catalogue media through `vendor_service_items.image_urls text[]`
  and `reference_url text` (migration
  `20260601000100_add_vendor_service_item_media.sql`), with a six-image cap,
  per-URL length caps, Supabase Storage uploads, remove controls, client/Event
  Editor thumbnails, optional reference links, and text-only fallbacks. The
  current working-tree section records the later HTTPS/trusted-host hardening.
- Retained the `messages` realtime publication migration for future JWT-bridged sessions, but removed unsafe direct-browser subscriptions after the public schema lockdown. Client, vendor, and manager inboxes currently use visibility-aware eight-second refreshes through `/api/messages`, preserving server-side role projection and privacy checks until Clerk-to-Supabase JWT bridging is introduced.
- Added real vendor profile-view tracking through the existing `vendor_profile_views` table. Vendor detail API records non-owner profile views, `/api/dashboard/vendor` and `/api/vendor/analytics` surface monthly view counts, and analytics no longer hard-code profile views to `0`.
- Closed dashboard dead-route gaps with real pages for `/vendor/portfolio`, `/vendor/reviews`, `/vendor/inquiries`, `/vendor/calendar`, and `/manager/weddings`.
- Replaced blog seed placeholder bodies with real editorial copy for the seeded blog posts.
- Fixed Vercel build failure caused by Clerk hooks rendering during prerender.
- Added a remote-first Supabase workflow so migrations and ad-hoc SQL can run from repo scripts.
- Added cloud testing bootstrap docs and seed workflow for realistic Clerk plus Supabase test data.
- Improved dashboard loading performance and reduced slow sequential dashboard fetch patterns.
- Rebuilt the dashboard UI language across admin, client, manager, and vendor surfaces.
- Added wedding days and day-by-day event planning across client onboarding, API, UI, and schema.
- Deepened wedding event planning with menus, menu items, dietary tags, logistics, and event tasks.
- Linked budget line items to real wedding events via `budget_items.wedding_event_id`.
- Reworked budget saves to preserve existing category/item IDs instead of deleting and recreating the full budget tree.
- Added event-aware budget UI so each line item can be assigned to a Haldi, Sangeet, ceremony, reception, or custom event.
- Added budget summary comparison between event plan estimates and linked budget line items.
- Added booking event context so client, vendor, and manager booking pages show event, day, date, venue, guests, logistics, and menu context where available.
- Made booking creation use the selected wedding event date as source-of-truth when `wedding_event_id` is present.
- Merged wedding event tasks into the client timeline API, client timeline page, and client dashboard task preview.
- Replaced Clerk metadata saved-vendor persistence with the Supabase `saved_vendors` table while preserving the existing API response shape.
- Deepened the vendor offering/catalogue model end-to-end. Vendor service create/update endpoints (`/api/vendor/services` and `/api/vendor/services/[id]`) now accept `serviceScope`, `eventTypeFit`, `inclusions`, `deliverables`, `addOns`, and a typed `items` array (menu, setup, deliverable, performance, look, inclusion, addon) with dietary tags and sort order, and the GET endpoint hydrates those items plus the vendor's category slug.
- Rebuilt `/vendor/services` as a real offering editor with scope textarea, multi-line tag fields, and an itemized catalogue editor that swaps labels by category (catering shows dietary tag inputs, decor talks about setups, photography about coverage, entertainment about sets and tech, makeup about looks and touch-ups).
- Refined the client vendor profile preview at `/client/vendors` to title the catalogue section by category ("Menu and counters", "Setups and areas", "Coverage and deliverables", "Sets and tech", "Looks and coverage") and group itemized offerings by type rather than mixing menus, setups, and deliverables into one stream.
- Added `src/lib/vendor-offering.ts` to centralize array normalization, item-type whitelisting, and per-category copy (catalogue labels, scope prompt, example chips, item type options) shared by both the vendor editor and the client preview.
- Connected vendor offerings back into the Event Editor. Clients can select catalogue rows from a chosen vendor service, add catering rows directly into the event menu, and append decor/photography/entertainment scope into the relevant event notes with a follow-up confirmation task.
- Rebuilt the client budget page with a category/event view toggle, event-level planned/quoted/paid/due/variance cards, inline event reassignment, paid toggles, and unassigned-item surfacing.
- Rebuilt the manager bookings page into a booking command center with status metrics, tabbed inquiry/confirmed/completed/cancelled queues, a sticky operations brief, payment due totals, event/logistics/menu context, vendor scope/catalogue rows, and safe manager status actions.
- Rebuilt client and vendor messages around real booking threads. `/api/messages` now returns every relevant booking conversation, including empty inquiry threads, status labels, service scope, wedding day/event/date/venue context, notes, and correct unread direction; both inboxes show side context panels and suggested first-message prompts.
- Added persistent per-user message thread read state through `message_thread_reads`, so client/vendor inbox unread pills now survive refreshes and fresh vendor inquiries can be marked read before the first reply exists.
- Added a manager Message Command surface at `/manager/messages`, with all booking conversations, unread/status metrics, client-vendor thread inspection, booking context rail, and manager-safe read tracking.
- Made message unread state fully per-user for the active inbox surfaces, so manager/admin oversight no longer mutates a global read flag that could affect client or vendor unread state.
- Wired the dashboard notification bell to real Supabase notifications through `/api/notifications`, with unread counts, linked notification rows, empty/loading states, and per-user mark-read/mark-all-read actions.
- Reworked the shared dashboard shell/sidebar into a floating centered editorial nav card with grouped panels, stronger active states, ambient depth, a less monotonous gradient/grid dashboard background, translucent topbar treatment, and a matching premium mobile drawer.
- Reworked event-planning saves for menus, menu items, and tasks so the API updates/inserts/removes nested rows instead of deleting and recreating every row on each save. Existing row IDs are preserved by explicit ID when available, with stable key/order matching for the current client payload.
- Polished the client Event Editor into a guided step flow with horizontal section pills, previous/next controls, richer vendor/service empty states, and category-aware grouped catalogue previews that show real offering rows before importing them into an event plan.
- Reduced Event Editor DOM work by rendering only the active guided section, added show-all catalogue rows for deep vendor offerings, and upgraded the client payload to send existing menu/item/task IDs explicitly.
- Upgraded the marketing homepage flow with a cinematic assurance strip, sharper atmosphere-gallery layering, hover depth, and refined gold divider treatment below the hero.
- Refined the marketing JourneySteps section with chapter-style editorial labeling, an ornamented gold divider, ghost step numbers, a central planning thread, and richer icon cards.

## Verified Recently

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm audit --omit=dev` (zero vulnerabilities after the Next/PostCSS/Sharp patch upgrade)
- `npm run db:migrations`
- `npm run db:query` for newly added Supabase tables and columns
- `npm run db:push` for pending media + realtime migrations
- `npm run db:push` for `20260604000100_event_platform_definition_layer.sql`
- `npm run db:push` for `20260604000200_add_event_requirements.sql`
- Remote SQL checks for media columns and `messages` realtime publication membership
- Remote SQL checks for event-platform definition columns on `weddings` and `wedding_events`
- Remote SQL checks for `wedding_event_requirements` columns
- Remote migration synchronization through `20260713122345_final_pricing_fee_model.sql`
- Remote migration synchronization through `20260713124846_preserve_legacy_vendor_amounts.sql`, preserving all three legacy agreed vendor amounts and their historical fee value
- Remote migration synchronization through `20260713130159_lock_public_schema_behind_server_api.sql`
- Remote migration synchronization through `20260713135700_admin_owned_offline_pricing.sql`
- Remote migration synchronization through `20260802000100_harden_booking_pricing_and_selection.sql`; duplicate preflight returned zero groups, the three legacy amount mirrors were repaired, and remote checks confirm the mirror constraint plus active-selection unique index are present.
- Remote SQL checks confirm generated `bookings.service_fee`, all three final-pricing constraints, no vendor-amount lock trigger/function, and zero invalid final prices, publications, or fee mismatches
- Remote SQL proof: 39/39 public tables have RLS, browser roles have zero table/function grants, service role retains all 39 tables, and pricing has zero invalid finals, invalid publications, or fee mismatches
- Direct Supabase REST proof that the publishable key receives HTTP 401 / permission denied for `bookings`
- Live role-based API checks confirming no fee/vendor/draft-final/Clerk-ID leakage to client, vendor, or manager booking responses, and no sealed final total in `/api/budget`
- Live browser checks for admin final-pricing drill-down/editor, admin fee intelligence, client spend selector across all six dimensions, manager vendor data, and vendor agreed-payout visibility
- Live regression of all 15 admin routes, mobile navigation, notifications, account menu, destination creation form, client booking price privacy, and vendor pricing-state rendering
- Authenticated client browser checks at desktop and mobile widths for Enter-to-advance without auto-create, the 14-day Step 5 accordion, collapsed function rows, `Day / All time blocks` and `Day / Afternoon` context, Layer 2 flowchart drill-down, active-day Add Event targeting, scoped Basics editor, compact date/time/venue context, unsaved-change protection, and non-overlapping sticky save actions
- `127.0.0.1` development hydration/HMR verification with `allowedDevOrigins`, plus zero measured overlap from the collapsed local test-role dock
- Local dev server started at `http://localhost:3000`
- Basic HTTP smoke check passed for `/`
- Browser smoke check passed for `/` after the marketing updates, with no fresh console errors.
- Browser auth-gate smoke check passed for `/manager/messages`, redirecting signed-out users to Clerk login with no fresh console errors.
- `/client/budget` correctly redirects unauthenticated users to Clerk login
- Browser auth-gate smoke checks passed for `/vendor/portfolio`, `/vendor/reviews`, `/vendor/inquiries`, `/vendor/calendar`, and `/manager/weddings`, all redirecting signed-out users to Clerk login with no fresh console errors.

## Current Rebuild Order

1. Replace Clerk development credentials with live production keys before public launch.
2. Add Clerk-to-Supabase JWT bridging before restoring direct Supabase Realtime subscriptions.
3. Add automated authenticated browser regression for pricing, booking, vendor, admin, and budget flows.
4. Expand one-event budget links into split allocations only when a real planning case requires it.
5. Add true drag ordering for vendor catalogue media and rows.

## Known Risks

- Vercel CLI is linked and authenticated, but the current Production environment still uses Clerk development keys. Replace both Clerk keys with live credentials before launch.
- The current event-linked budget model supports one event per budget line item.
- Vendor service catalogue rows support image/reference attachments, but true drag ordering is still deferred.
- Manager booking notes and payment amounts can be viewed, but inline manager editing is still intentionally limited to status actions.
- Messages are real booking threads with persisted unread state and visibility-aware API polling; direct Realtime awaits a Clerk-to-Supabase JWT bridge. Visible read receipts and per-message attachments remain future work.
