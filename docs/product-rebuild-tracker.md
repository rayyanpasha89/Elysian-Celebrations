# Product Rebuild Tracker

This is the working tracker for the recent Elysian Celebrations rebuild push. Keep it updated when a slice is shipped, verified, or intentionally deferred.

## Deployment Handoff

- Current source branch: `main`
- Primary GitHub remote: `origin` -> `rayyanpasha89/Elysian-Celebrations`
- Vercel handoff path: pushes to `origin/main`
- Base pushed commit before this tracker was added: `e79873b Deepen wedding planning and event budgets`
- Follow-up slice: bookings event context, event-task timeline integration, Supabase saved vendors
- Local Vercel CLI state: installed but not authenticated, so deploy status must be checked in the Vercel dashboard unless credentials/token are added locally.

## Cloud / Supabase State

- Supabase project URL: `https://zauzcmiuefypwljwdcmc.supabase.co`
- Remote migrations verified through `npm run db:migrations`.
- Applied remote migrations:
  - `20260331000000_baseline_schema.sql`
  - `20260401000000_add_manager_role.sql`
  - `20260401010000_add_clerk_user_sync.sql`
  - `20260412000100_add_wedding_days_and_event_planning.sql`
  - `20260512000100_deepen_event_planning.sql`
  - `20260512000200_link_budget_items_to_events.sql`
  - `20260514000100_deepen_vendor_offerings.sql`
  - `20260514000200_add_message_thread_reads.sql`
  - `20260601000100_add_vendor_service_item_media.sql`
  - `20260601000200_enable_message_realtime.sql`
  - `20260604000100_event_platform_definition_layer.sql`
- `20260604000200_add_event_requirements.sql`
- `20260713122345_final_pricing_fee_model.sql`
- `20260713124846_preserve_legacy_vendor_amounts.sql`
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
  - final-price validation constraints and the vendor-amount immutability trigger

## Shipped Recently

- Replaced the active admin margin/negotiation workflow with one complete final-price contract. Vendors submit one quote, `bookings.vendor_amount` freezes with that first quote, admins set a complete `final_price`, and Supabase generates `service_fee = final_price - vendor_amount`. Published client prices cannot be empty, final prices cannot undercut the vendor amount, and the legacy negotiation table is retained read-only only for historical audit compatibility.
- Rebuilt `/admin/pricing` around client → day → function → vendor-pick drill-down. The editor exposes the fixed vendor amount, one final client price, the automatically calculated Elysian fee, and an explicit publish/unpublish action. `/admin/revenue` now reports final value, vendor base, Elysian fee, category contribution, and client contribution with no margin/GST/negotiation language.
- Added multi-angle spend intelligence to `/client/budget` with a live pie/donut view and selector for function, day, category (including food), vendor, final-versus-estimate, and paid-versus-due analysis. Published final prices replace estimates only when every active pick for the function is published and the function definition is complete.
- Hardened booking pricing privacy by projecting role-specific response shapes: clients do not receive vendor amount, fee, draft final price, or Clerk identity IDs; vendors see only their amount; managers see the published client total or vendor amount without fee data; admins receive the full commercial record.
- Unified client estimate and final-price visibility behind one shared 10-check event-readiness contract. Cost estimates, published totals, and booking details stay sealed until the function reaches 100%; unpublished vendor quotes and sealed final totals are never serialized to the client.
- Locked the Supabase public schema behind the server API with migration `20260713130159_lock_public_schema_behind_server_api.sql`. RLS is enabled on all 39 public tables, `anon` and `authenticated` have zero table/sequence/function privileges, and only role-checked Next.js handlers use `service_role`.
- Made test-role switching development-only. Production builds now ignore the test-auth bypass unconditionally, so a copied environment flag or `?testRole=admin` query cannot grant portal access outside local development.
- Closed admin and cross-role QA defects around suspended-user authorization, manager vendor response mapping, unpublished review leakage, cross-vendor storage deletion, vendor inquiry deletion, and admin service deletion with linked-booking protection.
- Added the Layer 2 "mind-map celebration board" under `src/components/dashboard/event-flow/` and wired its radial `CelebrationCanvas` into the client event planner. The reusable kit includes shaped day/function nodes, step orbits, connectors, status language, a map legend, and guided empty states; the same drill-down interaction now also powers admin final pricing.
- Added the event-platform definition layer so Elysian can move beyond wedding-only planning. Migration `20260604000100_event_platform_definition_layer.sql` adds `weddings.event_type`, `custom_event_type`, `event_platform_version`, and `definition_payload`, plus `wedding_events.time_block` and `requirement_payload`. The remote Supabase database has the migration applied and column checks passed.
- Added `src/lib/event-platform.ts` as the shared source of truth for the new flow: 14 top-level event types including custom events, Morning/Afternoon/Evening time blocks, requirement categories for food/decor/photo-video/entertainment/hospitality/logistics/custom needs, a finalization checklist, and safe JSON payload normalization for future custom requirements.
- Updated `/api/wedding` to accept either the old onboarding payload or a new layered `eventDefinition.days[].timeBlocks[]` payload. Old wedding onboarding still creates the classic starter plan; new event-definition payloads create real day/time-block events with stable event IDs that budgets, bookings, menus, vendors, logistics, and tasks can keep using.
- Updated `/api/wedding/events` and `/api/wedding/events/[id]` so individual events can store and return `time_block` plus a sanitized `requirement_payload`, giving the frontend a safe backend path for Layer 2 customization without another route rewrite.
- Added structured Layer 2 requirement persistence through migration `20260604000200_add_event_requirements.sql`. Each event block can now own `wedding_event_requirements` rows with category, title, status, priority, linked vendor/service, sanitized JSON payload, notes, and sort order. `/api/wedding/events/[id]/requirements` supports client-owned GET and id-preserving PUT sync, and `/api/wedding` now hydrates requirements alongside menus, logistics, tasks, bookings, and vendor selections.
- Added vendor catalogue media: new `vendor_service_items.image_urls text[]` and `reference_url text` columns (migration `20260601000100_add_vendor_service_item_media.sql`), with the vendor offering normalizer enforcing http/https-only URLs, a six-image cap, and per-URL length caps. Vendor editor now supports both Supabase Storage uploads and pasted public URLs per catalogue row, plus remove controls. Client vendor previews and the Event Editor's `ServiceOfferingPreview` render thumbnails + optional moodboard links with graceful text-only fallback.
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
- Remote SQL checks for generated `bookings.service_fee`, all three final-pricing constraints, the vendor-amount lock trigger, and zero negative fees
- Remote SQL proof: 39/39 public tables have RLS, browser roles have zero table/function grants, service role retains all 39 tables, and pricing has zero invalid finals, invalid publications, or fee mismatches
- Direct Supabase REST proof that the publishable key receives HTTP 401 / permission denied for `bookings`
- Live role-based API checks confirming no fee/vendor/draft-final/Clerk-ID leakage to client, vendor, or manager booking responses, and no sealed final total in `/api/budget`
- Live browser checks for admin final-pricing drill-down/editor, admin fee intelligence, client spend selector across all six dimensions, manager vendor data, and vendor quote entry
- Live regression of all 15 admin routes, mobile navigation, notifications, account menu, destination creation form, client booking price privacy, and vendor quote editor remount behavior
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
