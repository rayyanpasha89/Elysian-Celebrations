-- Standalone function creation and deletion previously used several independent
-- PostgREST writes. Keep each lifecycle action inside one database transaction so
-- a late child-row or booking-history failure cannot leave partial planner state.

create or replace function public.create_event_function(
  p_actor_user_id text,
  p_wedding_id uuid,
  p_day_id uuid,
  p_event jsonb,
  p_menus jsonb,
  p_logistics jsonb,
  p_tasks jsonb,
  p_requirements jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event jsonb := coalesce(p_event, '{}'::jsonb);
  v_client_profile_id uuid;
  v_event_id uuid;
  v_created_event public.wedding_events%rowtype;
  v_event_name text;
  v_time_block text;
  v_event_date timestamptz;
  v_venue_id uuid;
  v_guest_count integer;
  v_estimated_budget integer;
  v_food_preferences text[] := '{}'::text[];
  v_requirement_payload jsonb;
  v_sort_order integer;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_wedding_id is null or p_day_id is null then
    raise exception 'event plan and day are required' using errcode = '22004';
  end if;

  if pg_catalog.jsonb_typeof(v_event) <> 'object' then
    raise exception 'event payload must be an object' using errcode = '22023';
  end if;

  select wedding.client_profile_id
  into v_client_profile_id
  from public.weddings as wedding
  join public.client_profiles as client
    on client.id = wedding.client_profile_id
  where wedding.id = p_wedding_id
    and client.user_id = p_actor_user_id
  for update of wedding;

  if v_client_profile_id is null then
    raise exception 'event plan not found for actor' using errcode = '42501';
  end if;

  perform day.id
  from public.wedding_days as day
  where day.id = p_day_id
    and day.wedding_id = p_wedding_id
  for update;

  if not found then
    raise exception 'celebration day does not belong to this event plan'
      using errcode = '23503';
  end if;

  v_event_name := left(nullif(pg_catalog.btrim(v_event ->> 'name'), ''), 160);
  if v_event_name is null then
    raise exception 'event name is required' using errcode = '22004';
  end if;

  v_time_block := pg_catalog.lower(
    coalesce(nullif(pg_catalog.btrim(v_event ->> 'time_block'), ''), 'evening')
  );
  if v_time_block not in ('morning', 'afternoon', 'evening') then
    raise exception 'event time block is invalid' using errcode = '22023';
  end if;

  begin
    v_event_date := nullif(pg_catalog.btrim(v_event ->> 'date'), '')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'event date is invalid' using errcode = '22007';
  end;

  begin
    v_venue_id := nullif(pg_catalog.btrim(v_event ->> 'venue_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'event venue id is invalid' using errcode = '22023';
  end;

  begin
    v_guest_count := nullif(pg_catalog.btrim(v_event ->> 'guest_count'), '')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'event guest count is invalid' using errcode = '22023';
  end;
  if v_guest_count is not null and (v_guest_count < 1 or v_guest_count > 1000000) then
    raise exception 'event guest count is outside the supported range'
      using errcode = '22023';
  end if;

  begin
    v_estimated_budget := nullif(
      pg_catalog.btrim(v_event ->> 'estimated_budget'), ''
    )::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'event estimate is invalid' using errcode = '22023';
  end;
  if v_estimated_budget is not null and v_estimated_budget < 0 then
    raise exception 'event estimate cannot be negative' using errcode = '22023';
  end if;

  if v_event ? 'food_preferences' then
    if pg_catalog.jsonb_typeof(v_event -> 'food_preferences') <> 'array'
      or pg_catalog.jsonb_array_length(v_event -> 'food_preferences') > 40
      or exists (
        select 1
        from pg_catalog.jsonb_array_elements(v_event -> 'food_preferences') as item(value)
        where pg_catalog.jsonb_typeof(item.value) <> 'string'
      ) then
      raise exception 'food preferences must be a list of text values'
        using errcode = '22023';
    end if;

    select coalesce(
      pg_catalog.array_agg(left(pg_catalog.btrim(item.value), 80))
        filter (where nullif(pg_catalog.btrim(item.value), '') is not null),
      '{}'::text[]
    )
    into v_food_preferences
    from pg_catalog.jsonb_array_elements_text(
      v_event -> 'food_preferences'
    ) as item(value);
  end if;

  v_requirement_payload := coalesce(
    v_event -> 'requirement_payload', '{}'::jsonb
  );
  if pg_catalog.jsonb_typeof(v_requirement_payload) <> 'object' then
    raise exception 'event requirement payload must be an object'
      using errcode = '22023';
  end if;

  select coalesce(pg_catalog.max(event.sort_order), -1) + 1
  into v_sort_order
  from public.wedding_events as event
  where event.wedding_day_id = p_day_id;

  insert into public.wedding_events (
    wedding_id, wedding_day_id, name, event_type, time_block, date,
    start_time, end_time, venue, venue_id, guest_count, estimated_budget,
    food_style, food_preferences, menu_notes, decor_style, decor_notes,
    attire_notes, notes, requirement_payload, sort_order
  )
  values (
    p_wedding_id,
    p_day_id,
    v_event_name,
    left(nullif(pg_catalog.btrim(v_event ->> 'event_type'), ''), 120),
    v_time_block,
    v_event_date,
    left(nullif(pg_catalog.btrim(v_event ->> 'start_time'), ''), 40),
    left(nullif(pg_catalog.btrim(v_event ->> 'end_time'), ''), 40),
    left(nullif(pg_catalog.btrim(v_event ->> 'venue'), ''), 240),
    v_venue_id,
    v_guest_count,
    v_estimated_budget,
    left(nullif(pg_catalog.btrim(v_event ->> 'food_style'), ''), 160),
    v_food_preferences,
    left(nullif(pg_catalog.btrim(v_event ->> 'menu_notes'), ''), 4000),
    left(nullif(pg_catalog.btrim(v_event ->> 'decor_style'), ''), 160),
    left(nullif(pg_catalog.btrim(v_event ->> 'decor_notes'), ''), 4000),
    left(nullif(pg_catalog.btrim(v_event ->> 'attire_notes'), ''), 4000),
    left(nullif(pg_catalog.btrim(v_event ->> 'notes'), ''), 4000),
    v_requirement_payload,
    v_sort_order
  )
  returning * into v_created_event;

  v_event_id := v_created_event.id;

  perform public.save_event_planning(
    p_actor_user_id,
    v_event_id,
    p_menus,
    p_logistics,
    p_tasks,
    p_requirements
  );

  return pg_catalog.to_jsonb(v_created_event);
end;
$$;

create or replace function public.delete_event_function(
  p_actor_user_id text,
  p_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wedding_id uuid;
  v_client_profile_id uuid;
  v_deleted_booking_count integer := 0;
  v_unlinked_booking_count integer := 0;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_event_id is null then
    raise exception 'event id is required' using errcode = '22004';
  end if;

  select event.wedding_id, wedding.client_profile_id
  into v_wedding_id, v_client_profile_id
  from public.wedding_events as event
  join public.weddings as wedding on wedding.id = event.wedding_id
  join public.client_profiles as client
    on client.id = wedding.client_profile_id
  where event.id = p_event_id
    and client.user_id = p_actor_user_id
  for update of event;

  if v_wedding_id is null or v_client_profile_id is null then
    raise exception 'event not found for actor' using errcode = '42501';
  end if;

  perform booking.id
  from public.bookings as booking
  where booking.wedding_event_id = p_event_id
  order by booking.id
  for update;

  if exists (
    select 1
    from public.bookings as booking
    where booking.wedding_event_id = p_event_id
      and booking.status not in ('INQUIRY', 'CANCELLED')
  ) then
    raise exception 'event has progressed vendor bookings'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.bookings as booking
    where booking.wedding_event_id = p_event_id
      and booking.status = 'INQUIRY'
      and (
        exists (
          select 1 from public.payments as payment
          where payment.booking_id = booking.id
        )
        or exists (
          select 1 from public.billing_invoices as invoice
          where invoice.booking_id = booking.id
        )
      )
  ) then
    raise exception 'event has vendor selections with financial history'
      using errcode = '55000';
  end if;

  delete from public.bookings as booking
  where booking.wedding_event_id = p_event_id
    and booking.status = 'INQUIRY';
  get diagnostics v_deleted_booking_count = row_count;

  update public.bookings as booking
  set wedding_event_id = null,
      updated_at = pg_catalog.now()
  where booking.wedding_event_id = p_event_id
    and booking.status = 'CANCELLED';
  get diagnostics v_unlinked_booking_count = row_count;

  delete from public.wedding_events as event
  where event.id = p_event_id
    and event.wedding_id = v_wedding_id;

  if not found then
    raise exception 'event disappeared during deletion' using errcode = '40001';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'eventId', p_event_id,
    'deletedDraftSelections', v_deleted_booking_count,
    'unlinkedCancelledBookings', v_unlinked_booking_count
  );
end;
$$;

revoke execute on function public.create_event_function(
  text, uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.create_event_function(
  text, uuid, uuid, jsonb, jsonb, jsonb, jsonb, jsonb
) to service_role;

revoke execute on function public.delete_event_function(text, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_event_function(text, uuid)
  to service_role;
