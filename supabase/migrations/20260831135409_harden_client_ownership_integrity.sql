-- Ownership is an invariant, not an API convention. The server already scopes
-- these writes, but database enforcement prevents a future route, maintenance
-- script, or compromised service credential from joining one client's plan to
-- another client's records.

do $$
begin
  if exists (
    select 1
    from public.weddings
    group by client_profile_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one event plan per client while duplicate plans exist'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.wedding_events as event
    join public.wedding_days as day on day.id = event.wedding_day_id
    where event.wedding_id is distinct from day.wedding_id
  ) then
    raise exception 'Cannot enforce function/day ownership while mismatched rows exist'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.budget_items as item
    join public.budget_categories as category
      on category.id = item.budget_category_id
    join public.budgets as budget on budget.id = category.budget_id
    join public.wedding_events as event on event.id = item.wedding_event_id
    join public.weddings as wedding on wedding.id = event.wedding_id
    where budget.client_profile_id is distinct from wedding.client_profile_id
  ) then
    raise exception 'Cannot enforce budget/function ownership while mismatched rows exist'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.bookings as booking
    join public.wedding_events as event on event.id = booking.wedding_event_id
    join public.weddings as wedding on wedding.id = event.wedding_id
    where booking.client_profile_id is distinct from wedding.client_profile_id
  ) then
    raise exception 'Cannot enforce booking/function ownership while mismatched rows exist'
      using errcode = '23514';
  end if;
end
$$;

-- The product supports one active event plan per client. The creation RPC also
-- serializes requests, while this constraint closes every other write path.
alter table public.weddings
  add constraint weddings_client_profile_singleton
  unique (client_profile_id);

-- The unique constraint's index covers the same lookup path.
drop index if exists public.weddings_client_profile_idx;

-- A function may only belong to a day inside the same event plan. Building the
-- composite FK as NOT VALID first avoids a long validation lock on larger data
-- sets. PostgreSQL 17's column-scoped SET NULL preserves wedding_id when a day
-- is deleted.
create unique index wedding_days_id_wedding_id_uidx
  on public.wedding_days(id, wedding_id);

alter table public.wedding_events
  add constraint wedding_events_day_ownership_fkey
  foreign key (wedding_day_id, wedding_id)
  references public.wedding_days(id, wedding_id)
  on update restrict
  on delete set null (wedding_day_id)
  not valid;

alter table public.wedding_events
  validate constraint wedding_events_day_ownership_fkey;

-- Ownership anchors cannot be reassigned after creation. Child records inherit
-- ownership through these anchors, so allowing re-parenting would bypass the
-- cross-owner checks below without touching the child row.
create or replace function public.guard_client_profile_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'A client profile cannot be reassigned to another user'
      using errcode = '23514',
            constraint = 'client_profiles_user_id_immutable';
  end if;
  return new;
end;
$$;

create or replace function public.guard_client_owned_parent()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.client_profile_id is distinct from old.client_profile_id then
    raise exception '% cannot be reassigned to another client profile', tg_table_name
      using errcode = '23514',
            constraint = pg_catalog.format('%s_client_profile_id_immutable', tg_table_name);
  end if;
  return new;
end;
$$;

drop trigger if exists guard_client_profile_identity on public.client_profiles;
create trigger guard_client_profile_identity
  before update of user_id on public.client_profiles
  for each row execute function public.guard_client_profile_identity();

drop trigger if exists guard_wedding_owner on public.weddings;
create trigger guard_wedding_owner
  before update of client_profile_id on public.weddings
  for each row execute function public.guard_client_owned_parent();

drop trigger if exists guard_budget_owner on public.budgets;
create trigger guard_budget_owner
  before update of client_profile_id on public.budgets
  for each row execute function public.guard_client_owned_parent();

drop trigger if exists guard_guest_list_owner on public.guest_lists;
create trigger guard_guest_list_owner
  before update of client_profile_id on public.guest_lists
  for each row execute function public.guard_client_owned_parent();

-- Historical test runs left duplicate empty containers. Keep the row that owns
-- the most child data (then the oldest row for a deterministic tie-break), but
-- refuse to guess if more than one duplicate contains real planning data.
do $$
begin
  if exists (
    with ranked_budgets as (
      select
        budget.id,
        coalesce(usage.category_count, 0) as category_count,
        coalesce(usage.item_count, 0) as item_count,
        row_number() over (
          partition by budget.client_profile_id
          order by
            coalesce(usage.item_count, 0) desc,
            coalesce(usage.category_count, 0) desc,
            budget.created_at asc,
            budget.id asc
        ) as position
      from public.budgets as budget
      left join lateral (
        select
          count(distinct category.id) as category_count,
          count(item.id) as item_count
        from public.budget_categories as category
        left join public.budget_items as item
          on item.budget_category_id = category.id
        where category.budget_id = budget.id
      ) as usage on true
    )
    select 1
    from ranked_budgets
    where position > 1
      and (category_count > 0 or item_count > 0)
  ) then
    raise exception 'Cannot canonicalize budgets while multiple duplicates contain planning data'
      using errcode = '23505';
  end if;

  if exists (
    with ranked_guest_lists as (
      select
        guest_list.id,
        coalesce(usage.guest_count, 0) as guest_count,
        row_number() over (
          partition by guest_list.client_profile_id
          order by
            coalesce(usage.guest_count, 0) desc,
            guest_list.created_at asc,
            guest_list.id asc
        ) as position
      from public.guest_lists as guest_list
      left join lateral (
        select count(guest.id) as guest_count
        from public.guests as guest
        where guest.guest_list_id = guest_list.id
      ) as usage on true
    )
    select 1
    from ranked_guest_lists
    where position > 1
      and guest_count > 0
  ) then
    raise exception 'Cannot canonicalize guest lists while multiple duplicates contain guests'
      using errcode = '23505';
  end if;
end
$$;

with ranked_budgets as (
  select
    budget.id,
    row_number() over (
      partition by budget.client_profile_id
      order by
        coalesce(usage.item_count, 0) desc,
        coalesce(usage.category_count, 0) desc,
        budget.created_at asc,
        budget.id asc
    ) as position
  from public.budgets as budget
  left join lateral (
    select
      count(distinct category.id) as category_count,
      count(item.id) as item_count
    from public.budget_categories as category
    left join public.budget_items as item
      on item.budget_category_id = category.id
    where category.budget_id = budget.id
  ) as usage on true
)
delete from public.budgets as budget
using ranked_budgets
where budget.id = ranked_budgets.id
  and ranked_budgets.position > 1;

with ranked_guest_lists as (
  select
    guest_list.id,
    row_number() over (
      partition by guest_list.client_profile_id
      order by
        coalesce(usage.guest_count, 0) desc,
        guest_list.created_at asc,
        guest_list.id asc
    ) as position
  from public.guest_lists as guest_list
  left join lateral (
    select count(guest.id) as guest_count
    from public.guests as guest
    where guest.guest_list_id = guest_list.id
  ) as usage on true
)
delete from public.guest_lists as guest_list
using ranked_guest_lists
where guest_list.id = ranked_guest_lists.id
  and ranked_guest_lists.position > 1;

alter table public.budgets
  add constraint budgets_client_profile_singleton
  unique (client_profile_id);

alter table public.guest_lists
  add constraint guest_lists_client_profile_singleton
  unique (client_profile_id);

drop index if exists public.budgets_client_profile_idx;
drop index if exists public.guest_lists_client_profile_idx;

create or replace function public.validate_budget_item_event_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_budget_owner uuid;
  v_event_owner uuid;
begin
  if new.wedding_event_id is null then
    return new;
  end if;

  select budget.client_profile_id
    into v_budget_owner
  from public.budget_categories as category
  join public.budgets as budget on budget.id = category.budget_id
  where category.id = new.budget_category_id;

  if not found then
    raise exception 'Budget category % does not exist', new.budget_category_id
      using errcode = '23503';
  end if;

  select wedding.client_profile_id
    into v_event_owner
  from public.wedding_events as event
  join public.weddings as wedding on wedding.id = event.wedding_id
  where event.id = new.wedding_event_id;

  if not found then
    raise exception 'Event function % does not exist', new.wedding_event_id
      using errcode = '23503';
  end if;

  if v_budget_owner is distinct from v_event_owner then
    raise exception 'A budget item cannot reference another client''s function'
      using errcode = '23514',
            constraint = 'budget_items_event_owner_check';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_budget_item_event_owner on public.budget_items;
create trigger validate_budget_item_event_owner
  before insert or update of budget_category_id, wedding_event_id
  on public.budget_items
  for each row execute function public.validate_budget_item_event_owner();

create or replace function public.validate_booking_event_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_owner uuid;
begin
  if new.wedding_event_id is null then
    return new;
  end if;

  select wedding.client_profile_id
    into v_event_owner
  from public.wedding_events as event
  join public.weddings as wedding on wedding.id = event.wedding_id
  where event.id = new.wedding_event_id;

  if not found then
    raise exception 'Event function % does not exist', new.wedding_event_id
      using errcode = '23503';
  end if;

  if new.client_profile_id is distinct from v_event_owner then
    raise exception 'A booking cannot reference another client''s function'
      using errcode = '23514',
            constraint = 'bookings_event_owner_check';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_booking_event_owner on public.bookings;
create trigger validate_booking_event_owner
  before insert or update of client_profile_id, wedding_event_id
  on public.bookings
  for each row execute function public.validate_booking_event_owner();

-- Trigger helpers are internal database machinery, never public RPCs. Trigger
-- execution does not require these direct function privileges.
revoke execute on function public.guard_client_profile_identity()
  from public, anon, authenticated, service_role;
revoke execute on function public.guard_client_owned_parent()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_budget_item_event_owner()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_booking_event_owner()
  from public, anon, authenticated, service_role;
