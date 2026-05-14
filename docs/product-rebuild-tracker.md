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
- Remote table/column checks passed for:
  - `wedding_event_menus`
  - `wedding_event_menu_items`
  - `wedding_event_logistics`
  - `wedding_event_tasks`
  - `budget_items.wedding_event_id`
  - `message_thread_reads`

## Shipped Recently

- Added vendor catalogue media: new `vendor_service_items.image_urls text[]` and `reference_url text` columns (migration `20260601000100_add_vendor_service_item_media.sql`), with the vendor offering normalizer enforcing http/https-only URLs, a six-image cap, and per-URL length caps. Vendor editor exposes a paste-URL + remove media flow per row, and both the client vendor preview and the Event Editor's `ServiceOfferingPreview` render thumbnails + optional moodboard link. Fallback is graceful — rows without images render exactly as before. No Supabase Storage upload helper added in this slice; URLs can be pasted from any public CDN/Storage public bucket.
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
- Local dev server started at `http://localhost:3000`
- Basic HTTP smoke check passed for `/`
- Browser smoke check passed for `/` after the marketing updates, with no fresh console errors.
- Browser auth-gate smoke check passed for `/manager/messages`, redirecting signed-out users to Clerk login with no fresh console errors.
- `/client/budget` correctly redirects unauthenticated users to Clerk login

## Current Rebuild Order

1. Bookings should treat `wedding_event_id` as the source of truth and return event/day/menu/logistics context.
2. Event tasks should surface in `/client/timeline` and dashboard previews instead of living only inside the wedding editor.
3. Saved vendors should use the Supabase `saved_vendors` table instead of Clerk metadata.
4. Event planning menu/task saves should become id-preserving upserts instead of destructive replacement.
5. Budget item event linking can later be expanded from one event per item to split allocations with a `budget_item_allocations` table.
6. Vercel deploy state should be checked in the dashboard or through CLI after `vercel login` / `VERCEL_TOKEN`.

Items 1, 2, and 3 are implemented in the follow-up slice and should be rechecked after every related refactor.

## Known Risks

- Vercel auto-deploy is assumed from the connected GitHub project, but local CLI verification is blocked by missing Vercel credentials.
- The current event-linked budget model supports one event per budget line item.
- Vendor service catalogue rows do not yet support drag ordering or image/reference attachments.
- Manager booking notes and payment amounts can be viewed, but inline manager editing is still intentionally limited to status actions.
- Messages are real booking threads with persisted unread state, but visible read receipts and per-message attachments are still future work.
- Message unread state is persisted per thread, but live delivery still needs Supabase Realtime or a polling layer.
