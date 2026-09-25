-- Foreign-key SET NULL actions run inside constraint-trigger cascades. They
-- must be allowed to detach travel references while an event, booking, or
-- vendor is being deleted; ordinary API writes still run at trigger depth 1
-- and receive the full event-scope validation below.
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
  end if;
  return new;
end;
$$;

revoke all on function public.validate_event_partner_travel_scope() from public, anon, authenticated;
