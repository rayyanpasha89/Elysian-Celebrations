-- Retiring a catalogue venue must prevent new assignments without freezing
-- functions that already reference it. Workspace saves resend venue_id and
-- guest_count even when the user only changes menus, tasks, or notes.
create or replace function public.validate_wedding_event_venue()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_venue record;
  v_event_destination uuid;
begin
  if new.venue_id is null then
    return new;
  end if;

  select id, name, capacity, destination_id, is_active
    into v_venue
  from public.venues
  where id = new.venue_id;

  if not found then
    raise exception 'Venue % does not exist', new.venue_id
      using errcode = '23503';
  end if;

  if not v_venue.is_active then
    if tg_op = 'INSERT'
       or (tg_op = 'UPDATE' and old.venue_id is distinct from new.venue_id) then
      raise exception 'Venue "%" is no longer available', v_venue.name
        using errcode = '23514';
    end if;
  end if;

  if v_venue.capacity is not null
     and new.guest_count is not null
     and new.guest_count > v_venue.capacity then
    raise exception
      'Venue "%" holds % guests but this function expects %',
      v_venue.name, v_venue.capacity, new.guest_count
      using errcode = '23514';
  end if;

  select destination_id into v_event_destination
  from public.weddings
  where id = new.wedding_id;

  if v_event_destination is not null
     and v_venue.destination_id is distinct from v_event_destination then
    raise exception
      'Venue "%" is not in this event''s destination', v_venue.name
      using errcode = '23514';
  end if;

  if new.venue is null or pg_catalog.btrim(new.venue) = '' then
    new.venue := v_venue.name;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_wedding_event_venue()
  from public, anon, authenticated, service_role;
