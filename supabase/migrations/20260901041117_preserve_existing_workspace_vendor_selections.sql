-- Preserve existing commercial selections even when a vendor later pauses
-- new inquiries. This replaces the initial workspace function before release.

-- One click in the Layer 2 editor represents one workspace save. Persist the
-- function details, nested planning records, and planner-managed vendor
-- selections in a single transaction so a late validation failure cannot
-- leave the client with a partially-updated event.

create or replace function public.save_event_workspace(
  p_actor_user_id text,
  p_event_id uuid,
  p_event jsonb,
  p_menus jsonb,
  p_logistics jsonb,
  p_tasks jsonb,
  p_requirements jsonb,
  p_vendor_selections jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event jsonb := coalesce(p_event, '{}'::jsonb);
  v_vendor_selections jsonb := coalesce(p_vendor_selections, '[]'::jsonb);
  v_planning_result jsonb;

  v_wedding_id uuid;
  v_client_profile_id uuid;
  v_wedding_day_id uuid;
  v_venue_id uuid;
  v_event_name text;
  v_event_date timestamptz;
  v_guest_count integer;
  v_estimated_budget integer;
  v_food_preferences text[] := '{}'::text[];
  v_requirement_payload jsonb;

  v_selection jsonb;
  v_selection_index integer;
  v_vendor_profile_id uuid;
  v_vendor_service_id uuid;
  v_service_vendor_profile_id uuid;
  v_existing_selection boolean;
  v_selection_key text;
  v_selection_keys text[] := '{}'::text[];
  v_normalized_selections jsonb := '[]'::jsonb;

  v_booking record;
  v_booking_id uuid;
  v_booking_count integer := 0;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_event_id is null then
    raise exception 'event id is required' using errcode = '22004';
  end if;

  if pg_catalog.jsonb_typeof(v_event) <> 'object'
    or pg_catalog.jsonb_typeof(v_vendor_selections) <> 'array'
    or pg_catalog.jsonb_array_length(v_vendor_selections) > 60 then
    raise exception 'event workspace payload has an invalid shape'
      using errcode = '22023';
  end if;

  -- The event lock serializes every full workspace save for this function.
  -- Ownership is repeated here because SECURITY DEFINER bypasses RLS.
  select event_row.wedding_id, wedding.client_profile_id
  into v_wedding_id, v_client_profile_id
  from public.wedding_events as event_row
  join public.weddings as wedding on wedding.id = event_row.wedding_id
  join public.client_profiles as client
    on client.id = wedding.client_profile_id
  where event_row.id = p_event_id
    and client.user_id = p_actor_user_id
  for update of event_row;

  if v_wedding_id is null or v_client_profile_id is null then
    raise exception 'event not found for actor' using errcode = '42501';
  end if;

  begin
    v_wedding_day_id := nullif(
      pg_catalog.btrim(v_event ->> 'wedding_day_id'), ''
    )::uuid;
  exception when invalid_text_representation then
    raise exception 'event has an invalid celebration day id'
      using errcode = '22023';
  end;

  if v_wedding_day_id is null then
    raise exception 'event must belong to a celebration day'
      using errcode = '22004';
  end if;

  if not exists (
    select 1
    from public.wedding_days as day
    where day.id = v_wedding_day_id
      and day.wedding_id = v_wedding_id
  ) then
    raise exception 'celebration day does not belong to this event plan'
      using errcode = '23503';
  end if;

  begin
    v_venue_id := nullif(pg_catalog.btrim(v_event ->> 'venue_id'), '')::uuid;
  exception when invalid_text_representation then
    raise exception 'event has an invalid venue id' using errcode = '22023';
  end;

  begin
    v_event_date := nullif(pg_catalog.btrim(v_event ->> 'date'), '')::timestamptz;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception 'event has an invalid date' using errcode = '22007';
  end;

  begin
    v_guest_count := nullif(pg_catalog.btrim(v_event ->> 'guest_count'), '')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'event has an invalid guest count' using errcode = '22023';
  end;
  if v_guest_count is not null and (v_guest_count < 1 or v_guest_count > 1000000) then
    raise exception 'guest count is outside the supported range'
      using errcode = '22023';
  end if;

  begin
    v_estimated_budget := nullif(
      pg_catalog.btrim(v_event ->> 'estimated_budget'), ''
    )::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'event has an invalid estimate' using errcode = '22023';
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

  v_event_name := left(
    coalesce(nullif(pg_catalog.btrim(v_event ->> 'name'), ''), 'Event'),
    160
  );

  update public.wedding_events
  set wedding_day_id = v_wedding_day_id,
      name = v_event_name,
      event_type = left(nullif(pg_catalog.btrim(v_event ->> 'event_type'), ''), 120),
      date = v_event_date,
      start_time = left(nullif(pg_catalog.btrim(v_event ->> 'start_time'), ''), 40),
      end_time = left(nullif(pg_catalog.btrim(v_event ->> 'end_time'), ''), 40),
      venue = left(nullif(pg_catalog.btrim(v_event ->> 'venue'), ''), 240),
      venue_id = v_venue_id,
      guest_count = v_guest_count,
      estimated_budget = v_estimated_budget,
      food_style = left(nullif(pg_catalog.btrim(v_event ->> 'food_style'), ''), 160),
      food_preferences = v_food_preferences,
      menu_notes = left(nullif(pg_catalog.btrim(v_event ->> 'menu_notes'), ''), 4000),
      decor_style = left(nullif(pg_catalog.btrim(v_event ->> 'decor_style'), ''), 160),
      decor_notes = left(nullif(pg_catalog.btrim(v_event ->> 'decor_notes'), ''), 4000),
      attire_notes = left(nullif(pg_catalog.btrim(v_event ->> 'attire_notes'), ''), 4000),
      notes = left(nullif(pg_catalog.btrim(v_event ->> 'notes'), ''), 4000),
      requirement_payload = v_requirement_payload
  where id = p_event_id
    and wedding_id = v_wedding_id;

  -- Calling the nested planning function stays inside this function's current
  -- transaction. Any later vendor-selection error rolls this work back too.
  v_planning_result := public.save_event_planning(
    p_actor_user_id,
    p_event_id,
    p_menus,
    p_logistics,
    p_tasks,
    p_requirements
  );

  for v_selection, v_selection_index in
    select entry.value, (entry.ordinality - 1)::integer
    from pg_catalog.jsonb_array_elements(v_vendor_selections)
      with ordinality as entry(value, ordinality)
  loop
    if pg_catalog.jsonb_typeof(v_selection) <> 'object' then
      raise exception 'vendor selection % must be an object', v_selection_index + 1
        using errcode = '22023';
    end if;

    begin
      v_vendor_profile_id := nullif(
        pg_catalog.btrim(v_selection ->> 'vendor_profile_id'), ''
      )::uuid;
      v_vendor_service_id := nullif(
        pg_catalog.btrim(v_selection ->> 'vendor_service_id'), ''
      )::uuid;
    exception when invalid_text_representation then
      raise exception 'vendor selection % has an invalid id', v_selection_index + 1
        using errcode = '22023';
    end;

    if v_vendor_profile_id is null then
      raise exception 'vendor selection % requires a vendor', v_selection_index + 1
        using errcode = '22004';
    end if;

    select exists (
      select 1
      from public.bookings as booking
      where booking.client_profile_id = v_client_profile_id
        and booking.wedding_event_id = p_event_id
        and booking.vendor_profile_id = v_vendor_profile_id
        and booking.vendor_service_id is not distinct from v_vendor_service_id
        and booking.status <> 'CANCELLED'
    )
    into v_existing_selection;

    -- Pausing inquiries or retiring a service blocks new planner additions, but
    -- must never make an existing inquiry/booking impossible to preserve while
    -- the couple edits unrelated event details.
    if not v_existing_selection then
      if not exists (
        select 1
        from public.vendor_profiles as vendor
        where vendor.id = v_vendor_profile_id
          and vendor.is_verified
          and vendor.accepting_inquiries
      ) then
        raise exception 'selected vendor is not accepting planner inquiries'
          using errcode = '23503';
      end if;

      if v_vendor_service_id is not null then
        select service.vendor_profile_id
        into v_service_vendor_profile_id
        from public.vendor_services as service
        where service.id = v_vendor_service_id
          and service.is_active;

        if v_service_vendor_profile_id is null then
          raise exception 'selected vendor service is not available'
            using errcode = '23503';
        end if;

        if v_service_vendor_profile_id <> v_vendor_profile_id then
          raise exception 'selected service does not belong to selected vendor'
            using errcode = '22023';
        end if;
      end if;
    end if;

    v_selection_key := v_vendor_profile_id::text || ':' ||
      coalesce(v_vendor_service_id::text, '');
    if pg_catalog.array_position(v_selection_keys, v_selection_key) is not null then
      raise exception 'vendor selection is duplicated in the payload'
        using errcode = '22023';
    end if;

    v_selection_keys := pg_catalog.array_append(v_selection_keys, v_selection_key);
    v_normalized_selections := v_normalized_selections || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'vendor_profile_id', v_vendor_profile_id,
        'vendor_service_id', v_vendor_service_id
      )
    );
  end loop;

  -- Lock booking rows in a deterministic order before deciding which draft
  -- inquiries can be removed. Confirmed or priced work is commercial history,
  -- so omitting it from the planner payload is a conflict, never a delete.
  perform booking.id
  from public.bookings as booking
  where booking.client_profile_id = v_client_profile_id
    and booking.wedding_event_id = p_event_id
    and booking.status <> 'CANCELLED'
  order by booking.id
  for update;

  for v_booking in
    select booking.id, booking.status, booking.vendor_profile_id,
      booking.vendor_service_id
    from public.bookings as booking
    where booking.client_profile_id = v_client_profile_id
      and booking.wedding_event_id = p_event_id
      and booking.status <> 'CANCELLED'
    order by booking.id
  loop
    if not exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_normalized_selections) as desired(value)
      where (desired.value ->> 'vendor_profile_id')::uuid = v_booking.vendor_profile_id
        and nullif(desired.value ->> 'vendor_service_id', '')::uuid
          is not distinct from v_booking.vendor_service_id
    ) then
      if v_booking.status <> 'INQUIRY' then
        raise exception
          'A vendor selection has progressed beyond inquiry and must be changed from bookings'
          using errcode = '55000';
      end if;

      delete from public.bookings where id = v_booking.id;
    end if;
  end loop;

  for v_selection in
    select entry.value
    from pg_catalog.jsonb_array_elements(v_normalized_selections) as entry(value)
  loop
    v_vendor_profile_id := (v_selection ->> 'vendor_profile_id')::uuid;
    v_vendor_service_id := nullif(
      v_selection ->> 'vendor_service_id', ''
    )::uuid;
    v_booking_id := null;

    select booking.id
    into v_booking_id
    from public.bookings as booking
    where booking.client_profile_id = v_client_profile_id
      and booking.wedding_event_id = p_event_id
      and booking.vendor_profile_id = v_vendor_profile_id
      and booking.vendor_service_id is not distinct from v_vendor_service_id
      and booking.status <> 'CANCELLED'
    order by booking.id
    limit 1
    for update;

    if v_booking_id is null then
      insert into public.bookings (
        client_profile_id,
        vendor_profile_id,
        vendor_service_id,
        wedding_event_id,
        event_date,
        notes
      )
      values (
        v_client_profile_id,
        v_vendor_profile_id,
        v_vendor_service_id,
        p_event_id,
        v_event_date,
        'Planner selection for ' || v_event_name
      )
      on conflict do nothing
      returning id into v_booking_id;

      if v_booking_id is null then
        select booking.id
        into v_booking_id
        from public.bookings as booking
        where booking.client_profile_id = v_client_profile_id
          and booking.wedding_event_id = p_event_id
          and booking.vendor_profile_id = v_vendor_profile_id
          and booking.vendor_service_id is not distinct from v_vendor_service_id
          and booking.status <> 'CANCELLED'
        order by booking.id
        limit 1
        for update;
      end if;
    end if;

    if v_booking_id is null then
      raise exception 'failed to synchronize vendor selection'
        using errcode = '40001';
    end if;

    update public.bookings
    set event_date = v_event_date,
        updated_at = pg_catalog.now()
    where id = v_booking_id;

    v_booking_count := v_booking_count + 1;
  end loop;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'eventId', p_event_id,
    'planning', v_planning_result,
    'vendorSelections', v_booking_count
  );
end;
$$;

revoke execute on function public.save_event_workspace(
  text, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.save_event_workspace(
  text, uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to service_role;
