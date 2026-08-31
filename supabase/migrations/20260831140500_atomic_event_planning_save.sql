-- Nested event planning previously used separate PostgREST mutations for
-- logistics, menus, menu items, tasks, and (through a sibling endpoint)
-- requirements. A later failure could therefore leave an event partially
-- updated. Keep the application-side normalization, but make persistence one
-- transaction-safe database operation.

create or replace function public.save_event_planning(
  p_actor_user_id text,
  p_event_id uuid,
  p_menus jsonb,
  p_logistics jsonb,
  p_tasks jsonb,
  p_requirements jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owned_event_id uuid;
  v_menus jsonb := coalesce(p_menus, '[]'::jsonb);
  v_logistics jsonb := coalesce(p_logistics, '{}'::jsonb);
  v_tasks jsonb := coalesce(p_tasks, '[]'::jsonb);

  v_menu jsonb;
  v_menu_index integer;
  v_menu_id uuid;
  v_requested_id uuid;
  v_requested_id_text text;
  v_menu_name text;
  v_meal_period text;
  v_service_style text;
  v_notes text;
  v_items jsonb;
  v_existing_menu_ids uuid[] := '{}'::uuid[];
  v_kept_menu_ids uuid[] := '{}'::uuid[];
  v_seen_menu_ids uuid[] := '{}'::uuid[];

  v_item jsonb;
  v_item_index integer;
  v_item_id uuid;
  v_item_name text;
  v_course text;
  v_dietary_tags text[];
  v_existing_item_ids uuid[] := '{}'::uuid[];
  v_kept_item_ids uuid[] := '{}'::uuid[];
  v_seen_item_ids uuid[] := '{}'::uuid[];

  v_task jsonb;
  v_task_index integer;
  v_task_id uuid;
  v_task_title text;
  v_task_owner text;
  v_task_status text;
  v_task_due_date timestamptz;
  v_existing_task_ids uuid[] := '{}'::uuid[];
  v_kept_task_ids uuid[] := '{}'::uuid[];
  v_seen_task_ids uuid[] := '{}'::uuid[];

  v_requirement jsonb;
  v_requirement_index integer;
  v_requirement_id uuid;
  v_requirement_category text;
  v_requirement_title text;
  v_requirement_status text;
  v_requirement_priority text;
  v_requirement_payload jsonb;
  v_vendor_profile_id uuid;
  v_vendor_service_id uuid;
  v_resolved_vendor_profile_id uuid;
  v_existing_requirement_ids uuid[] := '{}'::uuid[];
  v_kept_requirement_ids uuid[] := '{}'::uuid[];
  v_seen_requirement_ids uuid[] := '{}'::uuid[];
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_event_id is null then
    raise exception 'event id is required' using errcode = '22004';
  end if;

  if pg_catalog.jsonb_typeof(v_menus) <> 'array'
    or pg_catalog.jsonb_typeof(v_logistics) <> 'object'
    or pg_catalog.jsonb_typeof(v_tasks) <> 'array'
    or (
      p_requirements is not null
      and pg_catalog.jsonb_typeof(p_requirements) <> 'array'
    ) then
    raise exception 'event planning payload has an invalid shape'
      using errcode = '22023';
  end if;

  if pg_catalog.jsonb_array_length(v_menus) > 8
    or pg_catalog.jsonb_array_length(v_tasks) > 40
    or (
      p_requirements is not null
      and pg_catalog.jsonb_array_length(p_requirements) > 60
    ) then
    raise exception 'event planning payload exceeds supported limits'
      using errcode = '22023';
  end if;

  -- The row lock serializes concurrent saves for one function. Ownership is
  -- checked again in the database because SECURITY DEFINER bypasses RLS.
  select event_row.id
  into v_owned_event_id
  from public.wedding_events as event_row
  join public.weddings as wedding on wedding.id = event_row.wedding_id
  join public.client_profiles as client
    on client.id = wedding.client_profile_id
  where event_row.id = p_event_id
    and client.user_id = p_actor_user_id
  for update of event_row;

  if v_owned_event_id is null then
    raise exception 'event not found for actor' using errcode = '42501';
  end if;

  insert into public.wedding_event_logistics (
    wedding_event_id,
    guest_arrival_time,
    vendor_load_in_time,
    family_call_time,
    transport_notes,
    rooming_notes,
    weather_plan,
    ceremony_notes
  )
  values (
    p_event_id,
    left(nullif(pg_catalog.btrim(v_logistics ->> 'guest_arrival_time'), ''), 40),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'vendor_load_in_time'), ''), 40),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'family_call_time'), ''), 40),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'transport_notes'), ''), 1000),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'rooming_notes'), ''), 1000),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'weather_plan'), ''), 1000),
    left(nullif(pg_catalog.btrim(v_logistics ->> 'ceremony_notes'), ''), 1000)
  )
  on conflict (wedding_event_id) do update set
    guest_arrival_time = excluded.guest_arrival_time,
    vendor_load_in_time = excluded.vendor_load_in_time,
    family_call_time = excluded.family_call_time,
    transport_notes = excluded.transport_notes,
    rooming_notes = excluded.rooming_notes,
    weather_plan = excluded.weather_plan,
    ceremony_notes = excluded.ceremony_notes;

  select coalesce(pg_catalog.array_agg(menu.id order by menu.sort_order, menu.id), '{}'::uuid[])
  into v_existing_menu_ids
  from public.wedding_event_menus as menu
  where menu.wedding_event_id = p_event_id;

  for v_menu, v_menu_index in
    select entry.value, (entry.ordinality - 1)::integer
    from pg_catalog.jsonb_array_elements(v_menus) with ordinality as entry(value, ordinality)
  loop
    if pg_catalog.jsonb_typeof(v_menu) <> 'object' then
      raise exception 'menu % must be an object', v_menu_index + 1
        using errcode = '22023';
    end if;

    v_items := coalesce(v_menu -> 'items', '[]'::jsonb);
    if pg_catalog.jsonb_typeof(v_items) <> 'array'
      or pg_catalog.jsonb_array_length(v_items) > 40 then
      raise exception 'menu % has invalid items', v_menu_index + 1
        using errcode = '22023';
    end if;

    v_menu_name := left(
      coalesce(nullif(pg_catalog.btrim(v_menu ->> 'name'), ''), 'Menu ' || (v_menu_index + 1)),
      160
    );
    v_meal_period := left(nullif(pg_catalog.btrim(v_menu ->> 'meal_period'), ''), 80);
    v_service_style := left(nullif(pg_catalog.btrim(v_menu ->> 'service_style'), ''), 120);
    v_notes := left(nullif(pg_catalog.btrim(v_menu ->> 'notes'), ''), 1000);
    v_requested_id_text := nullif(pg_catalog.btrim(v_menu ->> 'id'), '');
    v_menu_id := null;

    if v_requested_id_text is not null then
      begin
        v_requested_id := v_requested_id_text::uuid;
      exception when invalid_text_representation then
        raise exception 'menu % has an invalid id', v_menu_index + 1
          using errcode = '22023';
      end;

      if pg_catalog.array_position(v_seen_menu_ids, v_requested_id) is not null then
        raise exception 'menu id is duplicated in the payload'
          using errcode = '22023';
      end if;
      v_seen_menu_ids := pg_catalog.array_append(v_seen_menu_ids, v_requested_id);

      select menu.id
      into v_menu_id
      from public.wedding_event_menus as menu
      where menu.id = v_requested_id
        and menu.wedding_event_id = p_event_id
      for update;

      if v_menu_id is null then
        raise exception 'menu id does not belong to this event'
          using errcode = '42501';
      end if;
    else
      select menu.id
      into v_menu_id
      from public.wedding_event_menus as menu
      where menu.id = any(v_existing_menu_ids)
        and not (menu.id = any(v_kept_menu_ids))
        and pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(menu.name)), '\s+', ' ', 'g'
        ) = pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(v_menu_name)), '\s+', ' ', 'g'
        )
        and pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(coalesce(menu.meal_period, ''))),
          '\s+', ' ', 'g'
        ) = pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(coalesce(v_meal_period, ''))),
          '\s+', ' ', 'g'
        )
      order by menu.sort_order, menu.id
      limit 1
      for update;

      if v_menu_id is null then
        select menu.id
        into v_menu_id
        from public.wedding_event_menus as menu
        where menu.id = any(v_existing_menu_ids)
          and not (menu.id = any(v_kept_menu_ids))
          and menu.sort_order = v_menu_index
        order by menu.id
        limit 1
        for update;
      end if;
    end if;

    if v_menu_id is null then
      insert into public.wedding_event_menus (
        wedding_event_id, name, meal_period, service_style, notes, sort_order
      )
      values (
        p_event_id, v_menu_name, v_meal_period, v_service_style, v_notes,
        v_menu_index
      )
      returning id into v_menu_id;
    else
      update public.wedding_event_menus
      set name = v_menu_name,
          meal_period = v_meal_period,
          service_style = v_service_style,
          notes = v_notes,
          sort_order = v_menu_index
      where id = v_menu_id
        and wedding_event_id = p_event_id;
    end if;

    v_kept_menu_ids := pg_catalog.array_append(v_kept_menu_ids, v_menu_id);

    select coalesce(pg_catalog.array_agg(item.id order by item.sort_order, item.id), '{}'::uuid[])
    into v_existing_item_ids
    from public.wedding_event_menu_items as item
    where item.menu_id = v_menu_id;
    v_kept_item_ids := '{}'::uuid[];

    for v_item, v_item_index in
      select entry.value, (entry.ordinality - 1)::integer
      from pg_catalog.jsonb_array_elements(v_items) with ordinality as entry(value, ordinality)
    loop
      if pg_catalog.jsonb_typeof(v_item) <> 'object' then
        raise exception 'menu item % must be an object', v_item_index + 1
          using errcode = '22023';
      end if;

      if v_item ? 'dietary_tags'
        and pg_catalog.jsonb_typeof(v_item -> 'dietary_tags') <> 'array' then
        raise exception 'menu item dietary tags must be an array'
          using errcode = '22023';
      end if;

      if pg_catalog.jsonb_array_length(
        coalesce(v_item -> 'dietary_tags', '[]'::jsonb)
      ) > 40 then
        raise exception 'menu item has too many dietary tags'
          using errcode = '22023';
      end if;

      if exists (
        select 1
        from pg_catalog.jsonb_array_elements(
          coalesce(v_item -> 'dietary_tags', '[]'::jsonb)
        ) as tag(value)
        where pg_catalog.jsonb_typeof(tag.value) <> 'string'
      ) then
        raise exception 'menu item dietary tags must be strings'
          using errcode = '22023';
      end if;

      select coalesce(
        pg_catalog.array_agg(left(pg_catalog.btrim(tag.value), 80))
          filter (where nullif(pg_catalog.btrim(tag.value), '') is not null),
        '{}'::text[]
      )
      into v_dietary_tags
      from pg_catalog.jsonb_array_elements_text(
        coalesce(v_item -> 'dietary_tags', '[]'::jsonb)
      ) as tag(value);

      v_item_name := left(
        coalesce(
          nullif(pg_catalog.btrim(v_item ->> 'name'), ''),
          'Menu item ' || (v_item_index + 1)
        ),
        160
      );
      v_course := left(nullif(pg_catalog.btrim(v_item ->> 'course'), ''), 80);
      v_notes := left(nullif(pg_catalog.btrim(v_item ->> 'notes'), ''), 500);
      v_requested_id_text := nullif(pg_catalog.btrim(v_item ->> 'id'), '');
      v_item_id := null;

      if v_requested_id_text is not null then
        begin
          v_requested_id := v_requested_id_text::uuid;
        exception when invalid_text_representation then
          raise exception 'menu item % has an invalid id', v_item_index + 1
            using errcode = '22023';
        end;

        if pg_catalog.array_position(v_seen_item_ids, v_requested_id) is not null then
          raise exception 'menu item id is duplicated in the payload'
            using errcode = '22023';
        end if;
        v_seen_item_ids := pg_catalog.array_append(v_seen_item_ids, v_requested_id);

        select item.id
        into v_item_id
        from public.wedding_event_menu_items as item
        where item.id = v_requested_id
          and item.menu_id = v_menu_id
        for update;

        if v_item_id is null then
          raise exception 'menu item id does not belong to the selected menu'
            using errcode = '42501';
        end if;
      else
        select item.id
        into v_item_id
        from public.wedding_event_menu_items as item
        where item.id = any(v_existing_item_ids)
          and not (item.id = any(v_kept_item_ids))
          and pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(item.name)), '\s+', ' ', 'g'
          ) = pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(v_item_name)), '\s+', ' ', 'g'
          )
          and pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(coalesce(item.course, ''))),
            '\s+', ' ', 'g'
          ) = pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(coalesce(v_course, ''))),
            '\s+', ' ', 'g'
          )
        order by item.sort_order, item.id
        limit 1
        for update;

        if v_item_id is null then
          select item.id
          into v_item_id
          from public.wedding_event_menu_items as item
          where item.id = any(v_existing_item_ids)
            and not (item.id = any(v_kept_item_ids))
            and item.sort_order = v_item_index
          order by item.id
          limit 1
          for update;
        end if;
      end if;

      if v_item_id is null then
        insert into public.wedding_event_menu_items (
          menu_id, name, course, dietary_tags, notes, sort_order
        )
        values (
          v_menu_id, v_item_name, v_course, v_dietary_tags, v_notes,
          v_item_index
        )
        returning id into v_item_id;
      else
        update public.wedding_event_menu_items
        set name = v_item_name,
            course = v_course,
            dietary_tags = v_dietary_tags,
            notes = v_notes,
            sort_order = v_item_index
        where id = v_item_id
          and menu_id = v_menu_id;
      end if;

      v_kept_item_ids := pg_catalog.array_append(v_kept_item_ids, v_item_id);
    end loop;

    delete from public.wedding_event_menu_items as item
    where item.menu_id = v_menu_id
      and not (item.id = any(v_kept_item_ids));
  end loop;

  delete from public.wedding_event_menus as menu
  where menu.wedding_event_id = p_event_id
    and not (menu.id = any(v_kept_menu_ids));

  select coalesce(pg_catalog.array_agg(task.id order by task.sort_order, task.id), '{}'::uuid[])
  into v_existing_task_ids
  from public.wedding_event_tasks as task
  where task.wedding_event_id = p_event_id;

  for v_task, v_task_index in
    select entry.value, (entry.ordinality - 1)::integer
    from pg_catalog.jsonb_array_elements(v_tasks) with ordinality as entry(value, ordinality)
  loop
    if pg_catalog.jsonb_typeof(v_task) <> 'object' then
      raise exception 'task % must be an object', v_task_index + 1
        using errcode = '22023';
    end if;

    v_task_title := left(nullif(pg_catalog.btrim(v_task ->> 'title'), ''), 180);
    if v_task_title is null then
      raise exception 'task % requires a title', v_task_index + 1
        using errcode = '22023';
    end if;

    v_task_owner := left(nullif(pg_catalog.btrim(v_task ->> 'owner'), ''), 80);
    v_task_status := pg_catalog.upper(
      coalesce(nullif(pg_catalog.btrim(v_task ->> 'status'), ''), 'OPEN')
    );
    if v_task_status not in ('OPEN', 'IN_PROGRESS', 'DONE') then
      raise exception 'task % has an invalid status', v_task_index + 1
        using errcode = '22023';
    end if;

    if nullif(pg_catalog.btrim(v_task ->> 'due_date'), '') is null then
      v_task_due_date := null;
    else
      begin
        v_task_due_date := (v_task ->> 'due_date')::timestamptz;
      exception when invalid_datetime_format or datetime_field_overflow then
        raise exception 'task % has an invalid due date', v_task_index + 1
          using errcode = '22007';
      end;
    end if;

    v_requested_id_text := nullif(pg_catalog.btrim(v_task ->> 'id'), '');
    v_task_id := null;

    if v_requested_id_text is not null then
      begin
        v_requested_id := v_requested_id_text::uuid;
      exception when invalid_text_representation then
        raise exception 'task % has an invalid id', v_task_index + 1
          using errcode = '22023';
      end;

      if pg_catalog.array_position(v_seen_task_ids, v_requested_id) is not null then
        raise exception 'task id is duplicated in the payload'
          using errcode = '22023';
      end if;
      v_seen_task_ids := pg_catalog.array_append(v_seen_task_ids, v_requested_id);

      select task.id
      into v_task_id
      from public.wedding_event_tasks as task
      where task.id = v_requested_id
        and task.wedding_event_id = p_event_id
      for update;

      if v_task_id is null then
        raise exception 'task id does not belong to this event'
          using errcode = '42501';
      end if;
    else
      select task.id
      into v_task_id
      from public.wedding_event_tasks as task
      where task.id = any(v_existing_task_ids)
        and not (task.id = any(v_kept_task_ids))
        and pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(task.title)), '\s+', ' ', 'g'
        ) = pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(v_task_title)), '\s+', ' ', 'g'
        )
        and pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(coalesce(task.owner, ''))),
          '\s+', ' ', 'g'
        ) = pg_catalog.regexp_replace(
          pg_catalog.lower(pg_catalog.btrim(coalesce(v_task_owner, ''))),
          '\s+', ' ', 'g'
        )
      order by task.sort_order, task.id
      limit 1
      for update;

      if v_task_id is null then
        select task.id
        into v_task_id
        from public.wedding_event_tasks as task
        where task.id = any(v_existing_task_ids)
          and not (task.id = any(v_kept_task_ids))
          and task.sort_order = v_task_index
        order by task.id
        limit 1
        for update;
      end if;
    end if;

    if v_task_id is null then
      insert into public.wedding_event_tasks (
        wedding_event_id, title, owner, status, due_date, sort_order
      )
      values (
        p_event_id, v_task_title, v_task_owner, v_task_status,
        v_task_due_date, v_task_index
      )
      returning id into v_task_id;
    else
      update public.wedding_event_tasks
      set title = v_task_title,
          owner = v_task_owner,
          status = v_task_status,
          due_date = v_task_due_date,
          sort_order = v_task_index
      where id = v_task_id
        and wedding_event_id = p_event_id;
    end if;

    v_kept_task_ids := pg_catalog.array_append(v_kept_task_ids, v_task_id);
  end loop;

  delete from public.wedding_event_tasks as task
  where task.wedding_event_id = p_event_id
    and not (task.id = any(v_kept_task_ids));

  -- Requirements are optional for backwards compatibility. NULL means that
  -- this endpoint's caller did not include them and they must remain untouched.
  if p_requirements is not null then
    select coalesce(
      pg_catalog.array_agg(requirement.id order by requirement.sort_order, requirement.id),
      '{}'::uuid[]
    )
    into v_existing_requirement_ids
    from public.wedding_event_requirements as requirement
    where requirement.wedding_event_id = p_event_id;

    for v_requirement, v_requirement_index in
      select entry.value, (entry.ordinality - 1)::integer
      from pg_catalog.jsonb_array_elements(p_requirements) with ordinality as entry(value, ordinality)
    loop
      if pg_catalog.jsonb_typeof(v_requirement) <> 'object' then
        raise exception 'requirement % must be an object', v_requirement_index + 1
          using errcode = '22023';
      end if;

      v_requirement_category := pg_catalog.lower(
        coalesce(nullif(pg_catalog.btrim(v_requirement ->> 'category'), ''), 'custom')
      );
      if v_requirement_category not in (
        'food', 'decor', 'photo-video', 'entertainment',
        'hospitality', 'logistics', 'custom'
      ) then
        raise exception 'requirement % has an invalid category', v_requirement_index + 1
          using errcode = '22023';
      end if;

      v_requirement_title := left(
        coalesce(nullif(pg_catalog.btrim(v_requirement ->> 'title'), ''), 'Requirement'),
        160
      );
      v_requirement_status := pg_catalog.upper(
        coalesce(nullif(pg_catalog.btrim(v_requirement ->> 'status'), ''), 'DRAFT')
      );
      if v_requirement_status not in (
        'DRAFT', 'NEEDS_VENDOR', 'QUOTE_NEEDED', 'CONFIRMED', 'DONE'
      ) then
        raise exception 'requirement % has an invalid status', v_requirement_index + 1
          using errcode = '22023';
      end if;

      v_requirement_priority := pg_catalog.upper(
        coalesce(nullif(pg_catalog.btrim(v_requirement ->> 'priority'), ''), 'NORMAL')
      );
      if v_requirement_priority not in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL') then
        raise exception 'requirement % has an invalid priority', v_requirement_index + 1
          using errcode = '22023';
      end if;

      v_requirement_payload := coalesce(v_requirement -> 'payload', '{}'::jsonb);
      if pg_catalog.jsonb_typeof(v_requirement_payload) <> 'object' then
        raise exception 'requirement % payload must be an object', v_requirement_index + 1
          using errcode = '22023';
      end if;
      v_notes := left(nullif(pg_catalog.btrim(v_requirement ->> 'notes'), ''), 4000);

      v_vendor_profile_id := null;
      v_vendor_service_id := null;
      v_resolved_vendor_profile_id := null;

      if nullif(pg_catalog.btrim(v_requirement ->> 'vendor_profile_id'), '') is not null then
        begin
          v_vendor_profile_id := (v_requirement ->> 'vendor_profile_id')::uuid;
        exception when invalid_text_representation then
          raise exception 'requirement % has an invalid vendor id', v_requirement_index + 1
            using errcode = '22023';
        end;
      end if;

      if nullif(pg_catalog.btrim(v_requirement ->> 'vendor_service_id'), '') is not null then
        begin
          v_vendor_service_id := (v_requirement ->> 'vendor_service_id')::uuid;
        exception when invalid_text_representation then
          raise exception 'requirement % has an invalid service id', v_requirement_index + 1
            using errcode = '22023';
        end;

        select service.vendor_profile_id
        into v_resolved_vendor_profile_id
        from public.vendor_services as service
        join public.vendor_profiles as vendor
          on vendor.id = service.vendor_profile_id
        where service.id = v_vendor_service_id
          and service.is_active
          and vendor.is_verified;

        if v_resolved_vendor_profile_id is null then
          raise exception 'vendor service is not available'
            using errcode = '23503';
        end if;

        if v_vendor_profile_id is not null
          and v_vendor_profile_id <> v_resolved_vendor_profile_id then
          raise exception 'vendor service does not belong to selected vendor'
            using errcode = '22023';
        end if;

        v_vendor_profile_id := v_resolved_vendor_profile_id;
      elsif v_vendor_profile_id is not null and not exists (
        select 1
        from public.vendor_profiles as vendor
        where vendor.id = v_vendor_profile_id
          and vendor.is_verified
      ) then
        raise exception 'vendor is not available' using errcode = '23503';
      end if;

      v_requested_id_text := nullif(pg_catalog.btrim(v_requirement ->> 'id'), '');
      v_requirement_id := null;

      if v_requested_id_text is not null then
        begin
          v_requested_id := v_requested_id_text::uuid;
        exception when invalid_text_representation then
          raise exception 'requirement % has an invalid id', v_requirement_index + 1
            using errcode = '22023';
        end;

        if pg_catalog.array_position(v_seen_requirement_ids, v_requested_id) is not null then
          raise exception 'requirement id is duplicated in the payload'
            using errcode = '22023';
        end if;
        v_seen_requirement_ids := pg_catalog.array_append(
          v_seen_requirement_ids, v_requested_id
        );

        select requirement.id
        into v_requirement_id
        from public.wedding_event_requirements as requirement
        where requirement.id = v_requested_id
          and requirement.wedding_event_id = p_event_id
        for update;

        if v_requirement_id is null then
          raise exception 'requirement id does not belong to this event'
            using errcode = '42501';
        end if;
      else
        select requirement.id
        into v_requirement_id
        from public.wedding_event_requirements as requirement
        where requirement.id = any(v_existing_requirement_ids)
          and not (requirement.id = any(v_kept_requirement_ids))
          and requirement.category = v_requirement_category
          and pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(requirement.title)), '\s+', ' ', 'g'
          ) = pg_catalog.regexp_replace(
            pg_catalog.lower(pg_catalog.btrim(v_requirement_title)), '\s+', ' ', 'g'
          )
        order by requirement.sort_order, requirement.id
        limit 1
        for update;

        if v_requirement_id is null then
          select requirement.id
          into v_requirement_id
          from public.wedding_event_requirements as requirement
          where requirement.id = any(v_existing_requirement_ids)
            and not (requirement.id = any(v_kept_requirement_ids))
            and requirement.sort_order = v_requirement_index
          order by requirement.id
          limit 1
          for update;
        end if;
      end if;

      if v_requirement_id is null then
        insert into public.wedding_event_requirements (
          wedding_event_id,
          category,
          title,
          status,
          priority,
          vendor_profile_id,
          vendor_service_id,
          payload,
          notes,
          sort_order
        )
        values (
          p_event_id,
          v_requirement_category,
          v_requirement_title,
          v_requirement_status,
          v_requirement_priority,
          v_vendor_profile_id,
          v_vendor_service_id,
          v_requirement_payload,
          v_notes,
          v_requirement_index
        )
        returning id into v_requirement_id;
      else
        update public.wedding_event_requirements
        set category = v_requirement_category,
            title = v_requirement_title,
            status = v_requirement_status,
            priority = v_requirement_priority,
            vendor_profile_id = v_vendor_profile_id,
            vendor_service_id = v_vendor_service_id,
            payload = v_requirement_payload,
            notes = v_notes,
            sort_order = v_requirement_index
        where id = v_requirement_id
          and wedding_event_id = p_event_id;
      end if;

      v_kept_requirement_ids := pg_catalog.array_append(
        v_kept_requirement_ids, v_requirement_id
      );
    end loop;

    delete from public.wedding_event_requirements as requirement
    where requirement.wedding_event_id = p_event_id
      and not (requirement.id = any(v_kept_requirement_ids));
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'eventId', p_event_id,
    'menus', pg_catalog.jsonb_array_length(v_menus),
    'tasks', pg_catalog.jsonb_array_length(v_tasks),
    'requirementsSynced', p_requirements is not null
  );
end;
$$;

revoke execute on function public.save_event_planning(
  text, uuid, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.save_event_planning(
  text, uuid, jsonb, jsonb, jsonb, jsonb
) to service_role;
