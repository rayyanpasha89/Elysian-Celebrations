-- First-class vendor, artist, speaker, performer, and crew movement manifests.
-- Raw identity values are deliberately absent; browser roles have no direct
-- table access and route handlers reject passport/Aadhaar/PAN/PNR fields.

create table public.event_partner_travel_parties (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete set null,
  wedding_event_id uuid references public.wedding_events(id) on delete set null,
  party_type text not null,
  name text not null,
  company text,
  department_label text,
  role_label text,
  head_count integer not null default 1,
  contact_label text,
  food_plan text,
  per_diem_amount numeric(14,2),
  owner_label text,
  notes text,
  version integer not null default 1,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_partner_travel_party_id_event_unique unique (id, wedding_id),
  constraint event_partner_travel_party_type_valid check (
    party_type in ('VENDOR','ARTIST','CREW','SPEAKER','PERFORMER','OTHER')
  ),
  constraint event_partner_travel_party_name_valid check (btrim(name) <> '' and char_length(name) <= 180),
  constraint event_partner_travel_party_company_valid check (company is null or char_length(company) <= 180),
  constraint event_partner_travel_party_department_valid check (department_label is null or char_length(department_label) <= 120),
  constraint event_partner_travel_party_role_valid check (role_label is null or char_length(role_label) <= 120),
  constraint event_partner_travel_party_head_count_valid check (head_count between 1 and 500),
  constraint event_partner_travel_party_contact_valid check (contact_label is null or char_length(contact_label) <= 180),
  constraint event_partner_travel_party_food_valid check (food_plan is null or char_length(food_plan) <= 500),
  constraint event_partner_travel_party_per_diem_valid check (per_diem_amount is null or per_diem_amount between 0 and 100000000),
  constraint event_partner_travel_party_owner_valid check (owner_label is null or char_length(owner_label) <= 160),
  constraint event_partner_travel_party_notes_valid check (notes is null or char_length(notes) <= 1500),
  constraint event_partner_travel_party_version_valid check (version >= 1)
);

create table public.event_partner_travel_legs (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null,
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
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_partner_travel_leg_id_event_unique unique (id, wedding_id),
  constraint event_partner_travel_leg_parent_fk foreign key (party_id, wedding_id)
    references public.event_partner_travel_parties(id, wedding_id) on delete cascade,
  constraint event_partner_travel_leg_mode_valid check (mode in ('FLIGHT','TRAIN','CAR','COACH','BUS','BOAT','OTHER')),
  constraint event_partner_travel_leg_provider_valid check (provider is null or char_length(provider) <= 180),
  constraint event_partner_travel_leg_reference_valid check (reference_label is null or char_length(reference_label) <= 120),
  constraint event_partner_travel_leg_origin_valid check (btrim(origin) <> '' and char_length(origin) <= 180),
  constraint event_partner_travel_leg_destination_valid check (btrim(destination) <> '' and char_length(destination) <= 180),
  constraint event_partner_travel_leg_chronology_valid check (arrival_at > departure_at),
  constraint event_partner_travel_leg_status_valid check (status in ('OPTION','PLANNED','BOOKED','CHECKED_IN','ARRIVED','CANCELLED')),
  constraint event_partner_travel_leg_sort_valid check (sort_order between 0 and 15)
);

create table public.event_partner_stays (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  hotel_name text not null,
  room_type text,
  room_count integer not null default 1,
  check_in_date date not null,
  check_out_date date not null,
  status text not null default 'PLANNED',
  food_plan text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_partner_stay_parent_fk foreign key (party_id, wedding_id)
    references public.event_partner_travel_parties(id, wedding_id) on delete cascade,
  constraint event_partner_stay_hotel_valid check (btrim(hotel_name) <> '' and char_length(hotel_name) <= 180),
  constraint event_partner_stay_room_type_valid check (room_type is null or char_length(room_type) <= 120),
  constraint event_partner_stay_room_count_valid check (room_count between 1 and 250),
  constraint event_partner_stay_chronology_valid check (check_out_date > check_in_date),
  constraint event_partner_stay_status_valid check (status in ('PLANNED','HELD','ALLOCATED','CHECKED_IN','CHECKED_OUT','CANCELLED')),
  constraint event_partner_stay_food_valid check (food_plan is null or char_length(food_plan) <= 500),
  constraint event_partner_stay_sort_valid check (sort_order between 0 and 7)
);

create table public.event_partner_transfers (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  travel_leg_id uuid,
  route_label text not null,
  pickup_at timestamptz not null,
  pickup_location text not null,
  drop_location text not null,
  vehicle_label text,
  status text not null default 'PLANNED',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_partner_transfer_parent_fk foreign key (party_id, wedding_id)
    references public.event_partner_travel_parties(id, wedding_id) on delete cascade,
  constraint event_partner_transfer_leg_fk foreign key (travel_leg_id, wedding_id)
    references public.event_partner_travel_legs(id, wedding_id) on delete set null,
  constraint event_partner_transfer_route_valid check (btrim(route_label) <> '' and char_length(route_label) <= 180),
  constraint event_partner_transfer_pickup_valid check (btrim(pickup_location) <> '' and char_length(pickup_location) <= 240),
  constraint event_partner_transfer_drop_valid check (btrim(drop_location) <> '' and char_length(drop_location) <= 240),
  constraint event_partner_transfer_vehicle_valid check (vehicle_label is null or char_length(vehicle_label) <= 120),
  constraint event_partner_transfer_status_valid check (status in ('PLANNED','ASSIGNED','DISPATCHED','PICKED_UP','DROPPED','NO_SHOW','CANCELLED')),
  constraint event_partner_transfer_sort_valid check (sort_order between 0 and 15)
);

create table public.event_partner_travel_activity (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  action text not null,
  actor_user_id text not null,
  version integer not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint event_partner_travel_activity_parent_fk foreign key (party_id, wedding_id)
    references public.event_partner_travel_parties(id, wedding_id) on delete cascade,
  constraint event_partner_travel_activity_action_valid check (action in ('CREATED','SNAPSHOT_SAVED','DELETED')),
  constraint event_partner_travel_activity_version_valid check (version >= 1),
  constraint event_partner_travel_activity_snapshot_valid check (jsonb_typeof(snapshot) = 'object')
);

create index event_partner_travel_parties_event_idx on public.event_partner_travel_parties(wedding_id, party_type, name);
create index event_partner_travel_legs_event_idx on public.event_partner_travel_legs(wedding_id, arrival_at, status);
create index event_partner_stays_event_idx on public.event_partner_stays(wedding_id, check_in_date, status);
create index event_partner_transfers_event_idx on public.event_partner_transfers(wedding_id, pickup_at, status);
create index event_partner_travel_activity_idx on public.event_partner_travel_activity(party_id, created_at desc);

create trigger tr_event_partner_travel_parties_updated before update on public.event_partner_travel_parties
for each row execute function public.update_updated_at();
create trigger tr_event_partner_travel_legs_updated before update on public.event_partner_travel_legs
for each row execute function public.update_updated_at();
create trigger tr_event_partner_stays_updated before update on public.event_partner_stays
for each row execute function public.update_updated_at();
create trigger tr_event_partner_transfers_updated before update on public.event_partner_transfers
for each row execute function public.update_updated_at();

create or replace function public.validate_event_partner_travel_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_booking_vendor uuid;
  v_booking_client uuid;
  v_booking_event uuid;
  v_event_client uuid;
begin
  select client_profile_id into v_event_client from public.weddings where id = new.wedding_id;
  if v_event_client is null then raise foreign_key_violation using message = 'Event not found'; end if;

  if new.wedding_event_id is not null and not exists (
    select 1 from public.wedding_events where id = new.wedding_event_id and wedding_id = new.wedding_id
  ) then
    raise foreign_key_violation using message = 'Function belongs to another event';
  end if;

  if new.booking_id is not null then
    select vendor_profile_id, client_profile_id, wedding_event_id
      into v_booking_vendor, v_booking_client, v_booking_event
      from public.bookings where id = new.booking_id;
    if v_booking_client is null or v_booking_client <> v_event_client then
      raise foreign_key_violation using message = 'Booking belongs to another event client';
    end if;
    if new.vendor_profile_id is null then new.vendor_profile_id := v_booking_vendor; end if;
    if new.vendor_profile_id <> v_booking_vendor then
      raise foreign_key_violation using message = 'Vendor does not match booking';
    end if;
    if v_booking_event is not null and not exists (
      select 1 from public.wedding_events
      where id = v_booking_event and wedding_id = new.wedding_id
    ) then
      raise foreign_key_violation using message = 'Booking belongs to another event';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_event_partner_travel_scope() from public, anon, authenticated;
create trigger tr_event_partner_travel_scope before insert or update of wedding_id, booking_id, vendor_profile_id, wedding_event_id
on public.event_partner_travel_parties for each row execute function public.validate_event_partner_travel_scope();

create or replace function public.prevent_event_partner_travel_activity_mutation()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception 'Partner travel activity is append-only' using errcode = '55000';
end;
$$;
revoke all on function public.prevent_event_partner_travel_activity_mutation() from public, anon, authenticated;
create trigger tr_event_partner_travel_activity_append_only before update or delete on public.event_partner_travel_activity
for each row execute function public.prevent_event_partner_travel_activity_mutation();

create or replace function public.save_event_partner_travel_party(
  p_wedding_id uuid,
  p_party_id uuid,
  p_expected_version integer,
  p_party jsonb,
  p_travel_legs jsonb,
  p_stays jsonb,
  p_transfers jsonb,
  p_actor_user_id text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_party public.event_partner_travel_parties%rowtype;
  v_party_id uuid;
begin
  if jsonb_typeof(p_party) <> 'object'
    or jsonb_typeof(p_travel_legs) <> 'array'
    or jsonb_typeof(p_stays) <> 'array'
    or jsonb_typeof(p_transfers) <> 'array'
    or jsonb_array_length(p_travel_legs) > 16
    or jsonb_array_length(p_stays) > 8
    or jsonb_array_length(p_transfers) > 16 then
    raise check_violation using message = 'Invalid partner travel snapshot';
  end if;

  if p_party_id is null then
    if p_expected_version is not null then raise check_violation using message = 'New party cannot have a version'; end if;
    insert into public.event_partner_travel_parties (
      wedding_id, booking_id, vendor_profile_id, wedding_event_id, party_type,
      name, company, department_label, role_label, head_count, contact_label,
      food_plan, per_diem_amount, owner_label, notes, created_by, updated_by
    ) values (
      p_wedding_id, (p_party->>'bookingId')::uuid, (p_party->>'vendorProfileId')::uuid,
      (p_party->>'weddingEventId')::uuid, p_party->>'partyType', p_party->>'name',
      nullif(p_party->>'company',''), nullif(p_party->>'departmentLabel',''),
      nullif(p_party->>'roleLabel',''), (p_party->>'headCount')::integer,
      nullif(p_party->>'contactLabel',''), nullif(p_party->>'foodPlan',''),
      nullif(p_party->>'perDiemAmount','')::numeric, nullif(p_party->>'ownerLabel',''),
      nullif(p_party->>'notes',''), p_actor_user_id, p_actor_user_id
    ) returning * into v_party;
    v_party_id := v_party.id;
  else
    select * into v_party from public.event_partner_travel_parties
      where id = p_party_id and wedding_id = p_wedding_id for update;
    if not found then raise foreign_key_violation using message = 'Travel party not found'; end if;
    if p_expected_version is null or v_party.version <> p_expected_version then
      raise check_violation using message = 'Partner travel changed; reload before saving';
    end if;
    update public.event_partner_travel_parties set
      booking_id = (p_party->>'bookingId')::uuid,
      vendor_profile_id = (p_party->>'vendorProfileId')::uuid,
      wedding_event_id = (p_party->>'weddingEventId')::uuid,
      party_type = p_party->>'partyType', name = p_party->>'name',
      company = nullif(p_party->>'company',''), department_label = nullif(p_party->>'departmentLabel',''),
      role_label = nullif(p_party->>'roleLabel',''), head_count = (p_party->>'headCount')::integer,
      contact_label = nullif(p_party->>'contactLabel',''), food_plan = nullif(p_party->>'foodPlan',''),
      per_diem_amount = nullif(p_party->>'perDiemAmount','')::numeric,
      owner_label = nullif(p_party->>'ownerLabel',''), notes = nullif(p_party->>'notes',''),
      version = version + 1, updated_by = p_actor_user_id
      where id = p_party_id returning * into v_party;
    v_party_id := v_party.id;
  end if;

  delete from public.event_partner_transfers where party_id = v_party_id;
  delete from public.event_partner_stays where party_id = v_party_id;
  delete from public.event_partner_travel_legs where party_id = v_party_id;

  insert into public.event_partner_travel_legs (
    id, party_id, wedding_id, mode, provider, reference_label, origin, destination,
    departure_at, arrival_at, status, pickup_required, sort_order
  ) select
    coalesce((item->>'id')::uuid, gen_random_uuid()), v_party_id, p_wedding_id,
    item->>'mode', nullif(item->>'provider',''), nullif(item->>'referenceLabel',''),
    item->>'origin', item->>'destination', (item->>'departureAt')::timestamptz,
    (item->>'arrivalAt')::timestamptz, item->>'status',
    coalesce((item->>'pickupRequired')::boolean, false), ordinality - 1
  from jsonb_array_elements(p_travel_legs) with ordinality as rows(item, ordinality);

  insert into public.event_partner_stays (
    id, party_id, wedding_id, hotel_name, room_type, room_count, check_in_date,
    check_out_date, status, food_plan, sort_order
  ) select
    coalesce((item->>'id')::uuid, gen_random_uuid()), v_party_id, p_wedding_id,
    item->>'hotelName', nullif(item->>'roomType',''), (item->>'roomCount')::integer,
    (item->>'checkInDate')::date, (item->>'checkOutDate')::date, item->>'status',
    nullif(item->>'foodPlan',''), ordinality - 1
  from jsonb_array_elements(p_stays) with ordinality as rows(item, ordinality);

  insert into public.event_partner_transfers (
    id, party_id, wedding_id, travel_leg_id, route_label, pickup_at,
    pickup_location, drop_location, vehicle_label, status, sort_order
  ) select
    coalesce((item->>'id')::uuid, gen_random_uuid()), v_party_id, p_wedding_id,
    (item->>'travelLegId')::uuid, item->>'routeLabel', (item->>'pickupAt')::timestamptz,
    item->>'pickupLocation', item->>'dropLocation', nullif(item->>'vehicleLabel',''),
    item->>'status', ordinality - 1
  from jsonb_array_elements(p_transfers) with ordinality as rows(item, ordinality);

  insert into public.event_partner_travel_activity (
    party_id, wedding_id, action, actor_user_id, version, snapshot
  ) values (
    v_party_id, p_wedding_id,
    case when p_party_id is null then 'CREATED' else 'SNAPSHOT_SAVED' end,
    p_actor_user_id, v_party.version,
    jsonb_build_object('party', to_jsonb(v_party), 'travelLegs', p_travel_legs, 'stays', p_stays, 'transfers', p_transfers)
  );
  return v_party_id;
end;
$$;

alter table public.event_partner_travel_parties enable row level security;
alter table public.event_partner_travel_legs enable row level security;
alter table public.event_partner_stays enable row level security;
alter table public.event_partner_transfers enable row level security;
alter table public.event_partner_travel_activity enable row level security;

revoke all on public.event_partner_travel_parties, public.event_partner_travel_legs,
  public.event_partner_stays, public.event_partner_transfers,
  public.event_partner_travel_activity from public, anon, authenticated;
grant select, insert, update on public.event_partner_travel_parties to service_role;
grant select, insert, update, delete on public.event_partner_travel_legs,
  public.event_partner_stays, public.event_partner_transfers to service_role;
grant select, insert on public.event_partner_travel_activity to service_role;
revoke all on function public.save_event_partner_travel_party(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.save_event_partner_travel_party(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text)
  to service_role;
