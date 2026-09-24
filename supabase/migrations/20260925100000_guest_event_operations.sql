-- Event-specific guest operations replace disconnected rooming, travel,
-- transfer, key, luggage, and hospitality workbooks. Browser roles never
-- access these tables directly; authenticated route handlers use service_role.

create table public.event_guest_operations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  household_name text,
  relationship_group text,
  invitation_status text not null default 'NOT_INVITED',
  vip_level text not null default 'STANDARD',
  accessibility_notes text,
  owner_label text,
  version integer not null default 1,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_guest_operations_event_guest_unique unique (wedding_id, guest_id),
  constraint event_guest_operations_id_event_unique unique (id, wedding_id),
  constraint event_guest_operations_household_valid check (
    household_name is null or char_length(household_name) <= 180
  ),
  constraint event_guest_operations_relationship_valid check (
    relationship_group is null or char_length(relationship_group) <= 180
  ),
  constraint event_guest_operations_invitation_valid check (
    invitation_status in ('NOT_INVITED', 'INVITED', 'CONFIRMED', 'DECLINED', 'WAITLIST')
  ),
  constraint event_guest_operations_vip_valid check (
    vip_level in ('STANDARD', 'VIP', 'VVIP')
  ),
  constraint event_guest_operations_accessibility_valid check (
    accessibility_notes is null or char_length(accessibility_notes) <= 2000
  ),
  constraint event_guest_operations_owner_valid check (
    owner_label is null or char_length(owner_label) <= 160
  ),
  constraint event_guest_operations_version_valid check (version >= 1)
);

create table public.guest_travel_legs (
  id uuid primary key default gen_random_uuid(),
  event_guest_operation_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  mode text not null,
  provider text,
  reference_label text,
  origin text not null,
  destination text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  status text not null default 'PLANNED',
  pickup_required boolean not null default false,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_travel_legs_id_event_unique unique (id, wedding_id),
  constraint guest_travel_legs_parent_fk
    foreign key (event_guest_operation_id, wedding_id)
    references public.event_guest_operations(id, wedding_id)
    on delete cascade,
  constraint guest_travel_legs_mode_valid check (
    mode in ('FLIGHT', 'TRAIN', 'CAR', 'COACH', 'BUS', 'BOAT', 'OTHER')
  ),
  constraint guest_travel_legs_provider_valid check (
    provider is null or char_length(provider) <= 180
  ),
  constraint guest_travel_legs_reference_valid check (
    reference_label is null or char_length(reference_label) <= 180
  ),
  constraint guest_travel_legs_origin_valid check (
    btrim(origin) <> '' and char_length(origin) <= 180
  ),
  constraint guest_travel_legs_destination_valid check (
    btrim(destination) <> '' and char_length(destination) <= 180
  ),
  constraint guest_travel_legs_chronology_valid check (arrival_at > departure_at),
  constraint guest_travel_legs_status_valid check (
    status in ('OPTION', 'PLANNED', 'BOOKED', 'CHECKED_IN', 'ARRIVED', 'CANCELLED')
  ),
  constraint guest_travel_legs_notes_valid check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint guest_travel_legs_sort_valid check (sort_order between 0 and 15)
);

create table public.guest_stays (
  id uuid primary key default gen_random_uuid(),
  event_guest_operation_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  hotel_name text not null,
  room_type text,
  room_number text,
  check_in_date date not null,
  check_out_date date not null,
  status text not null default 'PLANNED',
  key_status text not null default 'PENDING',
  luggage_status text not null default 'EXPECTED',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_stays_parent_fk
    foreign key (event_guest_operation_id, wedding_id)
    references public.event_guest_operations(id, wedding_id)
    on delete cascade,
  constraint guest_stays_hotel_valid check (
    btrim(hotel_name) <> '' and char_length(hotel_name) <= 180
  ),
  constraint guest_stays_room_type_valid check (
    room_type is null or char_length(room_type) <= 120
  ),
  constraint guest_stays_room_number_valid check (
    room_number is null or char_length(room_number) <= 80
  ),
  constraint guest_stays_chronology_valid check (check_out_date > check_in_date),
  constraint guest_stays_status_valid check (
    status in ('PLANNED', 'HELD', 'ALLOCATED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED')
  ),
  constraint guest_stays_key_valid check (
    key_status in ('NOT_REQUIRED', 'PENDING', 'READY', 'ISSUED', 'RETURNED', 'LOST')
  ),
  constraint guest_stays_luggage_valid check (
    luggage_status in (
      'NOT_REQUIRED', 'EXPECTED', 'RECEIVED', 'IN_TRANSIT',
      'IN_ROOM', 'COLLECTED', 'MISSING'
    )
  ),
  constraint guest_stays_notes_valid check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint guest_stays_sort_valid check (sort_order between 0 and 7)
);

create table public.guest_transfers (
  id uuid primary key default gen_random_uuid(),
  event_guest_operation_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  travel_leg_id uuid,
  vehicle_label text,
  route_label text not null,
  pickup_at timestamptz not null,
  pickup_location text not null,
  drop_location text not null,
  seat_label text,
  status text not null default 'PLANNED',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_transfers_parent_fk
    foreign key (event_guest_operation_id, wedding_id)
    references public.event_guest_operations(id, wedding_id)
    on delete cascade,
  constraint guest_transfers_travel_fk
    foreign key (travel_leg_id, wedding_id)
    references public.guest_travel_legs(id, wedding_id)
    on delete set null,
  constraint guest_transfers_vehicle_valid check (
    vehicle_label is null or char_length(vehicle_label) <= 120
  ),
  constraint guest_transfers_route_valid check (
    btrim(route_label) <> '' and char_length(route_label) <= 180
  ),
  constraint guest_transfers_pickup_valid check (
    btrim(pickup_location) <> '' and char_length(pickup_location) <= 240
  ),
  constraint guest_transfers_drop_valid check (
    btrim(drop_location) <> '' and char_length(drop_location) <= 240
  ),
  constraint guest_transfers_seat_valid check (
    seat_label is null or char_length(seat_label) <= 80
  ),
  constraint guest_transfers_status_valid check (
    status in ('PLANNED', 'ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'DROPPED', 'NO_SHOW', 'CANCELLED')
  ),
  constraint guest_transfers_notes_valid check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint guest_transfers_sort_valid check (sort_order between 0 and 15)
);

create table public.guest_hospitality_items (
  id uuid primary key default gen_random_uuid(),
  event_guest_operation_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  item_type text not null,
  title text not null,
  status text not null default 'PLANNED',
  owner_label text,
  due_at timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_hospitality_items_parent_fk
    foreign key (event_guest_operation_id, wedding_id)
    references public.event_guest_operations(id, wedding_id)
    on delete cascade,
  constraint guest_hospitality_items_type_valid check (
    item_type in (
      'WELCOME', 'HAMPER', 'SALON', 'BUTLER', 'MEAL',
      'ACCESSIBILITY', 'SERVICE_RECOVERY', 'OTHER'
    )
  ),
  constraint guest_hospitality_items_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint guest_hospitality_items_status_valid check (
    status in ('PLANNED', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED')
  ),
  constraint guest_hospitality_items_owner_valid check (
    owner_label is null or char_length(owner_label) <= 160
  ),
  constraint guest_hospitality_items_notes_valid check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint guest_hospitality_items_sort_valid check (sort_order between 0 and 23)
);

create table public.event_guest_operations_activity (
  id uuid primary key default gen_random_uuid(),
  event_guest_operation_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  action text not null default 'SNAPSHOT_SAVED',
  actor_user_id text not null,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint event_guest_operations_activity_parent_fk
    foreign key (event_guest_operation_id, wedding_id)
    references public.event_guest_operations(id, wedding_id)
    on delete cascade,
  constraint event_guest_operations_activity_action_valid check (
    action in ('SNAPSHOT_SAVED')
  ),
  constraint event_guest_operations_activity_version_valid check (version >= 1),
  constraint event_guest_operations_activity_snapshot_valid check (
    jsonb_typeof(snapshot) = 'object'
  )
);

create index event_guest_operations_event_idx
  on public.event_guest_operations(wedding_id, invitation_status, vip_level);
create index guest_travel_legs_event_idx
  on public.guest_travel_legs(wedding_id, departure_at, status);
create index guest_stays_event_idx
  on public.guest_stays(wedding_id, check_in_date, status);
create index guest_transfers_event_idx
  on public.guest_transfers(wedding_id, pickup_at, status);
create index guest_hospitality_items_event_idx
  on public.guest_hospitality_items(wedding_id, status, due_at);
create index event_guest_operations_activity_parent_idx
  on public.event_guest_operations_activity(event_guest_operation_id, created_at desc);

create trigger tr_event_guest_operations_updated
  before update on public.event_guest_operations
  for each row execute function public.update_updated_at();
create trigger tr_guest_travel_legs_updated
  before update on public.guest_travel_legs
  for each row execute function public.update_updated_at();
create trigger tr_guest_stays_updated
  before update on public.guest_stays
  for each row execute function public.update_updated_at();
create trigger tr_guest_transfers_updated
  before update on public.guest_transfers
  for each row execute function public.update_updated_at();
create trigger tr_guest_hospitality_items_updated
  before update on public.guest_hospitality_items
  for each row execute function public.update_updated_at();

create or replace function public.validate_event_guest_ownership()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.weddings wedding
    join public.guest_lists guest_list
      on guest_list.client_profile_id = wedding.client_profile_id
    join public.guests guest on guest.guest_list_id = guest_list.id
    where wedding.id = new.wedding_id
      and guest.id = new.guest_id
  ) then
    raise foreign_key_violation using
      message = 'Guest does not belong to this event client';
  end if;
  return new;
end;
$$;

create trigger tr_event_guest_operations_ownership
  before insert or update of wedding_id, guest_id on public.event_guest_operations
  for each row execute function public.validate_event_guest_ownership();

create or replace function public.prevent_event_guest_operations_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise insufficient_privilege using
    message = 'Guest operations activity is append-only';
end;
$$;

create trigger tr_event_guest_operations_activity_append_only
  before update or delete on public.event_guest_operations_activity
  for each row execute function public.prevent_event_guest_operations_activity_mutation();

create or replace function public.load_guest_operations_snapshot(
  p_wedding_id uuid,
  p_guest_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when operation.id is null then jsonb_build_object(
      'id', null,
      'version', null,
      'profile', jsonb_build_object(
        'householdName', null,
        'relationshipGroup', null,
        'invitationStatus', 'NOT_INVITED',
        'vipLevel', 'STANDARD',
        'accessibilityNotes', null,
        'ownerLabel', null
      ),
      'travelLegs', '[]'::jsonb,
      'stays', '[]'::jsonb,
      'transfers', '[]'::jsonb,
      'hospitalityItems', '[]'::jsonb
    )
    else jsonb_build_object(
      'id', operation.id,
      'version', operation.version,
      'profile', jsonb_build_object(
        'householdName', operation.household_name,
        'relationshipGroup', operation.relationship_group,
        'invitationStatus', operation.invitation_status,
        'vipLevel', operation.vip_level,
        'accessibilityNotes', operation.accessibility_notes,
        'ownerLabel', operation.owner_label
      ),
      'travelLegs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', leg.id,
          'mode', leg.mode,
          'provider', leg.provider,
          'referenceLabel', leg.reference_label,
          'origin', leg.origin,
          'destination', leg.destination,
          'departureAt', leg.departure_at,
          'arrivalAt', leg.arrival_at,
          'status', leg.status,
          'pickupRequired', leg.pickup_required,
          'notes', leg.notes
        ) order by leg.sort_order, leg.departure_at, leg.id)
        from public.guest_travel_legs leg
        where leg.event_guest_operation_id = operation.id
      ), '[]'::jsonb),
      'stays', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', stay.id,
          'hotelName', stay.hotel_name,
          'roomType', stay.room_type,
          'roomNumber', stay.room_number,
          'checkInDate', stay.check_in_date,
          'checkOutDate', stay.check_out_date,
          'status', stay.status,
          'keyStatus', stay.key_status,
          'luggageStatus', stay.luggage_status,
          'notes', stay.notes
        ) order by stay.sort_order, stay.check_in_date, stay.id)
        from public.guest_stays stay
        where stay.event_guest_operation_id = operation.id
      ), '[]'::jsonb),
      'transfers', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', transfer.id,
          'travelLegId', transfer.travel_leg_id,
          'vehicleLabel', transfer.vehicle_label,
          'routeLabel', transfer.route_label,
          'pickupAt', transfer.pickup_at,
          'pickupLocation', transfer.pickup_location,
          'dropLocation', transfer.drop_location,
          'seatLabel', transfer.seat_label,
          'status', transfer.status,
          'notes', transfer.notes
        ) order by transfer.sort_order, transfer.pickup_at, transfer.id)
        from public.guest_transfers transfer
        where transfer.event_guest_operation_id = operation.id
      ), '[]'::jsonb),
      'hospitalityItems', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', item.id,
          'type', item.item_type,
          'title', item.title,
          'status', item.status,
          'ownerLabel', item.owner_label,
          'dueAt', item.due_at,
          'notes', item.notes
        ) order by item.sort_order, item.due_at nulls last, item.id)
        from public.guest_hospitality_items item
        where item.event_guest_operation_id = operation.id
      ), '[]'::jsonb)
    )
  end
  from (select 1) singleton
  left join public.event_guest_operations operation
    on operation.wedding_id = p_wedding_id
   and operation.guest_id = p_guest_id;
$$;

create or replace function public.save_guest_operations_snapshot(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_expected_version integer,
  p_profile jsonb,
  p_travel_legs jsonb,
  p_stays jsonb,
  p_transfers jsonb,
  p_hospitality_items jsonb,
  p_actor_user_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_operation public.event_guest_operations%rowtype;
  v_next_version integer;
  v_snapshot jsonb;
begin
  if jsonb_typeof(p_profile) <> 'object'
    or jsonb_typeof(p_travel_legs) <> 'array'
    or jsonb_typeof(p_stays) <> 'array'
    or jsonb_typeof(p_transfers) <> 'array'
    or jsonb_typeof(p_hospitality_items) <> 'array'
  then
    raise check_violation using message = 'Invalid guest operations snapshot';
  end if;
  if jsonb_array_length(p_travel_legs) > 16
    or jsonb_array_length(p_stays) > 8
    or jsonb_array_length(p_transfers) > 16
    or jsonb_array_length(p_hospitality_items) > 24
  then
    raise check_violation using message = 'Guest operations snapshot exceeds allowed limits';
  end if;
  if btrim(coalesce(p_actor_user_id, '')) = '' then
    raise check_violation using message = 'Actor is required';
  end if;

  select * into v_operation
  from public.event_guest_operations
  where wedding_id = p_wedding_id and guest_id = p_guest_id
  for update;

  if found then
    if p_expected_version is null or p_expected_version <> v_operation.version then
      raise serialization_failure using message = 'Guest operations changed; reload before saving';
    end if;
    v_next_version := v_operation.version + 1;
    update public.event_guest_operations
    set household_name = nullif(btrim(p_profile ->> 'householdName'), ''),
        relationship_group = nullif(btrim(p_profile ->> 'relationshipGroup'), ''),
        invitation_status = coalesce(nullif(p_profile ->> 'invitationStatus', ''), 'NOT_INVITED'),
        vip_level = coalesce(nullif(p_profile ->> 'vipLevel', ''), 'STANDARD'),
        accessibility_notes = nullif(btrim(p_profile ->> 'accessibilityNotes'), ''),
        owner_label = nullif(btrim(p_profile ->> 'ownerLabel'), ''),
        version = v_next_version,
        updated_by = p_actor_user_id
    where id = v_operation.id
    returning * into v_operation;
  else
    if p_expected_version is not null then
      raise serialization_failure using message = 'Guest operations no longer exist; reload before saving';
    end if;
    insert into public.event_guest_operations (
      wedding_id,
      guest_id,
      household_name,
      relationship_group,
      invitation_status,
      vip_level,
      accessibility_notes,
      owner_label,
      created_by,
      updated_by
    ) values (
      p_wedding_id,
      p_guest_id,
      nullif(btrim(p_profile ->> 'householdName'), ''),
      nullif(btrim(p_profile ->> 'relationshipGroup'), ''),
      coalesce(nullif(p_profile ->> 'invitationStatus', ''), 'NOT_INVITED'),
      coalesce(nullif(p_profile ->> 'vipLevel', ''), 'STANDARD'),
      nullif(btrim(p_profile ->> 'accessibilityNotes'), ''),
      nullif(btrim(p_profile ->> 'ownerLabel'), ''),
      p_actor_user_id,
      p_actor_user_id
    ) returning * into v_operation;
    v_next_version := v_operation.version;
  end if;

  delete from public.guest_transfers where event_guest_operation_id = v_operation.id;
  delete from public.guest_hospitality_items where event_guest_operation_id = v_operation.id;
  delete from public.guest_stays where event_guest_operation_id = v_operation.id;
  delete from public.guest_travel_legs where event_guest_operation_id = v_operation.id;

  insert into public.guest_travel_legs (
    id,
    event_guest_operation_id,
    wedding_id,
    mode,
    provider,
    reference_label,
    origin,
    destination,
    departure_at,
    arrival_at,
    status,
    pickup_required,
    notes,
    sort_order
  )
  select
    (entry ->> 'id')::uuid,
    v_operation.id,
    p_wedding_id,
    entry ->> 'mode',
    nullif(btrim(entry ->> 'provider'), ''),
    nullif(btrim(entry ->> 'referenceLabel'), ''),
    entry ->> 'origin',
    entry ->> 'destination',
    (entry ->> 'departureAt')::timestamptz,
    (entry ->> 'arrivalAt')::timestamptz,
    entry ->> 'status',
    coalesce((entry ->> 'pickupRequired')::boolean, false),
    nullif(btrim(entry ->> 'notes'), ''),
    ordinal - 1
  from jsonb_array_elements(p_travel_legs) with ordinality as item(entry, ordinal);

  insert into public.guest_stays (
    id,
    event_guest_operation_id,
    wedding_id,
    hotel_name,
    room_type,
    room_number,
    check_in_date,
    check_out_date,
    status,
    key_status,
    luggage_status,
    notes,
    sort_order
  )
  select
    (entry ->> 'id')::uuid,
    v_operation.id,
    p_wedding_id,
    entry ->> 'hotelName',
    nullif(btrim(entry ->> 'roomType'), ''),
    nullif(btrim(entry ->> 'roomNumber'), ''),
    (entry ->> 'checkInDate')::date,
    (entry ->> 'checkOutDate')::date,
    entry ->> 'status',
    entry ->> 'keyStatus',
    entry ->> 'luggageStatus',
    nullif(btrim(entry ->> 'notes'), ''),
    ordinal - 1
  from jsonb_array_elements(p_stays) with ordinality as item(entry, ordinal);

  insert into public.guest_transfers (
    id,
    event_guest_operation_id,
    wedding_id,
    travel_leg_id,
    vehicle_label,
    route_label,
    pickup_at,
    pickup_location,
    drop_location,
    seat_label,
    status,
    notes,
    sort_order
  )
  select
    (entry ->> 'id')::uuid,
    v_operation.id,
    p_wedding_id,
    nullif(entry ->> 'travelLegId', '')::uuid,
    nullif(btrim(entry ->> 'vehicleLabel'), ''),
    entry ->> 'routeLabel',
    (entry ->> 'pickupAt')::timestamptz,
    entry ->> 'pickupLocation',
    entry ->> 'dropLocation',
    nullif(btrim(entry ->> 'seatLabel'), ''),
    entry ->> 'status',
    nullif(btrim(entry ->> 'notes'), ''),
    ordinal - 1
  from jsonb_array_elements(p_transfers) with ordinality as item(entry, ordinal);

  insert into public.guest_hospitality_items (
    id,
    event_guest_operation_id,
    wedding_id,
    item_type,
    title,
    status,
    owner_label,
    due_at,
    notes,
    sort_order
  )
  select
    (entry ->> 'id')::uuid,
    v_operation.id,
    p_wedding_id,
    entry ->> 'type',
    entry ->> 'title',
    entry ->> 'status',
    nullif(btrim(entry ->> 'ownerLabel'), ''),
    nullif(entry ->> 'dueAt', '')::timestamptz,
    nullif(btrim(entry ->> 'notes'), ''),
    ordinal - 1
  from jsonb_array_elements(p_hospitality_items) with ordinality as item(entry, ordinal);

  v_snapshot := jsonb_build_object(
    'profile', jsonb_build_object(
      'householdName', v_operation.household_name,
      'relationshipGroup', v_operation.relationship_group,
      'invitationStatus', v_operation.invitation_status,
      'vipLevel', v_operation.vip_level,
      'accessibilityNotes', v_operation.accessibility_notes,
      'ownerLabel', v_operation.owner_label
    ),
    'travelLegs', p_travel_legs,
    'stays', p_stays,
    'transfers', p_transfers,
    'hospitalityItems', p_hospitality_items
  );

  insert into public.event_guest_operations_activity (
    event_guest_operation_id,
    wedding_id,
    actor_user_id,
    version,
    snapshot
  ) values (
    v_operation.id,
    p_wedding_id,
    p_actor_user_id,
    v_next_version,
    v_snapshot
  );

  return jsonb_build_object(
    'id', v_operation.id,
    'version', v_next_version
  );
end;
$$;

alter table public.event_guest_operations enable row level security;
alter table public.guest_travel_legs enable row level security;
alter table public.guest_stays enable row level security;
alter table public.guest_transfers enable row level security;
alter table public.guest_hospitality_items enable row level security;
alter table public.event_guest_operations_activity enable row level security;

revoke all on table public.event_guest_operations from public, anon, authenticated;
revoke all on table public.guest_travel_legs from public, anon, authenticated;
revoke all on table public.guest_stays from public, anon, authenticated;
revoke all on table public.guest_transfers from public, anon, authenticated;
revoke all on table public.guest_hospitality_items from public, anon, authenticated;
revoke all on table public.event_guest_operations_activity from public, anon, authenticated;

grant select, insert, update, delete on table public.event_guest_operations to service_role;
grant select, insert, update, delete on table public.guest_travel_legs to service_role;
grant select, insert, update, delete on table public.guest_stays to service_role;
grant select, insert, update, delete on table public.guest_transfers to service_role;
grant select, insert, update, delete on table public.guest_hospitality_items to service_role;
grant select, insert on table public.event_guest_operations_activity to service_role;

revoke all on function public.validate_event_guest_ownership() from public, anon, authenticated;
revoke all on function public.prevent_event_guest_operations_activity_mutation() from public, anon, authenticated;
revoke all on function public.load_guest_operations_snapshot(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.load_guest_operations_snapshot(uuid, uuid)
  to service_role;
revoke all on function public.save_guest_operations_snapshot(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public, anon, authenticated;
grant execute on function public.save_guest_operations_snapshot(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to service_role;
