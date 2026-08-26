-- Event plan creation was performed as a sequence of separate PostgREST calls.
-- Those are not transactional, so a failure part-way through left orphaned rows
-- and the route had to compensate by deleting the wedding afterwards. If the
-- process died between the failing insert and the compensating delete, or the
-- delete itself failed, the client was left with a half-built plan that then
-- collided with the "event plan already exists" guard.
--
-- This function performs the whole creation inside one transaction. A plpgsql
-- function body is atomic, so any exception rolls the entire structure back and
-- no compensating delete is required.
--
-- The caller still computes the plan shape in application code (day/function
-- layout, requirement seeding, meal periods). This function only guarantees the
-- write is all-or-nothing.
--
-- Columns that carry a database default are wrapped in coalesce rather than
-- passed straight through. Handing an explicit NULL to an INSERT overrides the
-- default instead of falling back to it, which would break the NOT NULL columns
-- whenever the caller omits an optional key.

create or replace function public.create_event_plan(
  p_client_profile_id uuid,
  p_wedding jsonb,
  p_days jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wedding_id uuid;
  v_day jsonb;
  v_day_id uuid;
  v_event jsonb;
  v_event_id uuid;
  v_menu jsonb;
  v_task jsonb;
  v_requirement jsonb;
begin
  if p_client_profile_id is null then
    raise exception 'client profile is required' using errcode = '22004';
  end if;

  -- weddings.client_profile_id carries no unique constraint yet, because legacy
  -- duplicate containers still have to be merged before one can be added. Until
  -- then two concurrent creates could both pass an existence check and both
  -- insert. Serialise per client profile for the life of this transaction so the
  -- check below is authoritative.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_client_profile_id::text)::bigint
  );

  if exists (
    select 1 from public.weddings
    where client_profile_id = p_client_profile_id
  ) then
    -- Mapped to a 409 by the caller. Matches the unique-violation code the route
    -- already handles so behaviour is identical once a constraint does exist.
    raise exception 'Event plan already exists' using errcode = '23505';
  end if;

  insert into public.weddings (
    client_profile_id, name, date, event_type, custom_event_type,
    event_platform_version, definition_payload, destination_id, status
  )
  values (
    p_client_profile_id,
    p_wedding ->> 'name',
    (p_wedding ->> 'date')::timestamptz,
    coalesce(p_wedding ->> 'event_type', 'wedding'),
    p_wedding ->> 'custom_event_type',
    coalesce((p_wedding ->> 'event_platform_version')::integer, 1),
    coalesce(p_wedding -> 'definition_payload', '{}'::jsonb),
    (p_wedding ->> 'destination_id')::uuid,
    coalesce(p_wedding ->> 'status', 'PLANNING')::public.wedding_status
  )
  returning id into v_wedding_id;

  for v_day in
    select value from pg_catalog.jsonb_array_elements(coalesce(p_days, '[]'::jsonb))
  loop
    insert into public.wedding_days (wedding_id, name, date, notes, sort_order)
    values (
      v_wedding_id,
      v_day ->> 'name',
      (v_day ->> 'date')::timestamptz,
      v_day ->> 'notes',
      coalesce((v_day ->> 'sort_order')::integer, 0)
    )
    returning id into v_day_id;

    for v_event in
      select value from pg_catalog.jsonb_array_elements(
        coalesce(v_day -> 'events', '[]'::jsonb)
      )
    loop
      insert into public.wedding_events (
        wedding_id, wedding_day_id, name, event_type, time_block, date,
        start_time, end_time, venue, guest_count, food_style, decor_style,
        notes, sort_order
      )
      values (
        v_wedding_id,
        v_day_id,
        v_event ->> 'name',
        v_event ->> 'event_type',
        v_event ->> 'time_block',
        (v_event ->> 'date')::timestamptz,
        v_event ->> 'start_time',
        v_event ->> 'end_time',
        v_event ->> 'venue',
        (v_event ->> 'guest_count')::integer,
        v_event ->> 'food_style',
        v_event ->> 'decor_style',
        v_event ->> 'notes',
        coalesce((v_event ->> 'sort_order')::integer, 0)
      )
      returning id into v_event_id;

      v_menu := v_event -> 'menu';
      if v_menu is not null and pg_catalog.jsonb_typeof(v_menu) = 'object' then
        insert into public.wedding_event_menus (
          wedding_event_id, name, meal_period, service_style, notes, sort_order
        )
        values (
          v_event_id,
          coalesce(v_menu ->> 'name', 'Primary menu'),
          v_menu ->> 'meal_period',
          v_menu ->> 'service_style',
          v_menu ->> 'notes',
          coalesce((v_menu ->> 'sort_order')::integer, 0)
        );
      end if;

      for v_task in
        select value from pg_catalog.jsonb_array_elements(
          coalesce(v_event -> 'tasks', '[]'::jsonb)
        )
      loop
        insert into public.wedding_event_tasks (
          wedding_event_id, title, owner, status, sort_order
        )
        values (
          v_event_id,
          v_task ->> 'title',
          v_task ->> 'owner',
          coalesce(v_task ->> 'status', 'OPEN'),
          coalesce((v_task ->> 'sort_order')::integer, 0)
        );
      end loop;

      for v_requirement in
        select value from pg_catalog.jsonb_array_elements(
          coalesce(v_event -> 'requirements', '[]'::jsonb)
        )
      loop
        insert into public.wedding_event_requirements (
          wedding_event_id, category, title, status, priority, payload,
          notes, sort_order
        )
        values (
          v_event_id,
          v_requirement ->> 'category',
          coalesce(v_requirement ->> 'title', 'Requirement'),
          coalesce(v_requirement ->> 'status', 'DRAFT'),
          coalesce(v_requirement ->> 'priority', 'NORMAL'),
          coalesce(v_requirement -> 'payload', '{}'::jsonb),
          v_requirement ->> 'notes',
          coalesce((v_requirement ->> 'sort_order')::integer, 0)
        );
      end loop;
    end loop;
  end loop;

  -- The planner expects a guest list to exist. Creating it here keeps it inside
  -- the same transaction instead of being a trailing write that can fail alone.
  if not exists (
    select 1 from public.guest_lists
    where client_profile_id = p_client_profile_id
  ) then
    insert into public.guest_lists (client_profile_id, name)
    values (p_client_profile_id, 'Main Guest List');
  end if;

  return v_wedding_id;
end;
$$;

revoke execute on function public.create_event_plan(uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_event_plan(uuid, jsonb, jsonb)
  to service_role;
