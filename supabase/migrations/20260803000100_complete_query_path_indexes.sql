-- Completes 20260802000200_add_query_path_indexes.sql.
--
-- Three problems that migration left behind:
--
-- 1. `create index if not exists` matches on NAME, not on columns. An earlier
--    revision of supabase/schema.sql declared the same ten columns under
--    `idx_*` names, so any environment provisioned from that file and then
--    migrated ended up with two physical B-trees per column — double write
--    cost on the hottest planner tables. schema.sql has since been renamed to
--    the canonical `*_idx` names; this migration retires the `idx_*` twins so
--    already-provisioned environments converge on one index per column.
--
-- 2. Three foreign keys the client portal filters on every request were not
--    covered: guest_lists, mood_boards and budgets by client_profile_id.
--
-- 3. Two indexes serve zero queries in the codebase and only add write cost.
--
-- All statements are idempotent. Plain (non-concurrent) index builds are used
-- deliberately so this runs inside the migration transaction; at current row
-- counts the exclusive lock is momentary. Revisit with CONCURRENTLY if these
-- tables grow past ~1M rows.

-- ── 1. Missing foreign-key indexes on client-scoped lookups ──────────────
create index if not exists guest_lists_client_profile_idx
  on public.guest_lists(client_profile_id);
create index if not exists mood_boards_client_profile_idx
  on public.mood_boards(client_profile_id);
create index if not exists budgets_client_profile_idx
  on public.budgets(client_profile_id);

-- ── 2. Retire duplicate twins created by the older schema.sql ────────────
-- Each of these covers exactly the same column as the `*_idx` index created
-- by 20260802000200. Dropping is safe: the surviving index serves every plan
-- the dropped one did. No-ops on databases built purely from migrations.
drop index if exists public.idx_weddings_client_profile;
drop index if exists public.idx_wedding_events_wedding;
drop index if exists public.idx_bookings_wedding_event;
drop index if exists public.idx_bookings_vendor_service;
drop index if exists public.idx_budget_categories_budget;
drop index if exists public.idx_budget_items_category;
drop index if exists public.idx_timeline_items_wedding;
drop index if exists public.idx_venues_destination;
drop index if exists public.idx_vendor_services_vendor_profile;
drop index if exists public.idx_wedding_event_requirements_vendor_service;

-- ── 3. Drop indexes with no matching query ───────────────────────────────
-- weddings.event_type and wedding_events.time_block are read as row fields but
-- are never used as a filter or sort key anywhere in src/. They cost writes on
-- the two most frequently mutated planner tables and buy nothing. Re-add if a
-- query ever filters on them.
drop index if exists public.idx_weddings_event_type;
drop index if exists public.idx_wedding_events_time_block;
