-- Load every versioned partner-travel aggregate through one consistent SQL statement so
-- the parent version and all child rows share the same MVCC snapshot.
create or replace function public.load_event_partner_travel_snapshot(p_wedding_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'parties', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at, p.id)
      from public.event_partner_travel_parties p
      where p.wedding_id = p_wedding_id
    ), '[]'::jsonb),
    'travelLegs', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.party_id, l.sort_order, l.id)
      from public.event_partner_travel_legs l
      where l.wedding_id = p_wedding_id
    ), '[]'::jsonb),
    'stays', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.party_id, s.sort_order, s.id)
      from public.event_partner_stays s
      where s.wedding_id = p_wedding_id
    ), '[]'::jsonb),
    'transfers', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.party_id, t.sort_order, t.id)
      from public.event_partner_transfers t
      where t.wedding_id = p_wedding_id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.load_event_partner_travel_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function public.load_event_partner_travel_snapshot(uuid)
  to service_role;

-- A booking deletion intentionally detaches the manifest through ON DELETE SET
-- NULL. Preserve that historical vendor link for later edits, but reject new or
-- changed free-floating vendor references that never came from a booking.
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
  if pg_trigger_depth() > 1 then
    return new;
  end if;

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
  elsif new.vendor_profile_id is not null and (
    tg_op = 'INSERT'
    or old.booking_id is not null
    or new.vendor_profile_id is distinct from old.vendor_profile_id
  ) then
    raise foreign_key_violation using message = 'Vendor requires a selected booking';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_event_partner_travel_scope()
  from public, anon, authenticated;
