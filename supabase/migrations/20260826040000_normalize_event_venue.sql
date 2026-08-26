-- wedding_events.venue was free text with no link to the venues catalogue, so
-- nothing connected a planned function to the venue it is actually booked into:
-- capacity could not be checked, a venue could be renamed without the plan
-- noticing, and a function could reference a venue in a different destination
-- from the event itself.
--
-- venue_id adds that link. The existing venue text is kept as a point-in-time
-- snapshot rather than being replaced: a custom area ("Garden Lawn", "Poolside
-- Deck") has no catalogue row, and a booked function should keep the name it was
-- planned under even if the catalogue entry is later renamed or retired.

alter table public.wedding_events
  add column if not exists venue_id uuid
    references public.venues(id) on delete set null;

create index if not exists wedding_events_venue_id_idx
  on public.wedding_events(venue_id)
  where venue_id is not null;

comment on column public.wedding_events.venue_id is
  'Catalogue venue this function is booked into. Null for a custom area; venue holds the display snapshot either way.';

-- Existing rows keep venue_id null on purpose. Matching free text back to
-- catalogue names would be a guess, and a wrong link is worse than no link
-- because capacity and destination checks would then run against the wrong
-- venue. Rows adopt an id the next time a venue is chosen from the catalogue.

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
    raise exception 'Venue "%" is no longer available', v_venue.name
      using errcode = '23514';
  end if;

  -- A function cannot be planned into a venue that cannot hold its guests.
  -- Only checked when both numbers are known; an unset capacity or guest count
  -- means the plan is still being shaped.
  if v_venue.capacity is not null
     and new.guest_count is not null
     and new.guest_count > v_venue.capacity then
    raise exception
      'Venue "%" holds % guests but this function expects %',
      v_venue.name, v_venue.capacity, new.guest_count
      using errcode = '23514';
  end if;

  -- When the event has a destination, its functions must be booked inside it.
  select destination_id into v_event_destination
  from public.weddings
  where id = new.wedding_id;

  if v_event_destination is not null
     and v_venue.destination_id is distinct from v_event_destination then
    raise exception
      'Venue "%" is not in this event''s destination', v_venue.name
      using errcode = '23514';
  end if;

  -- Keep the display snapshot aligned when the caller did not supply one.
  if new.venue is null or pg_catalog.btrim(new.venue) = '' then
    new.venue := v_venue.name;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_wedding_event_venue on public.wedding_events;
create trigger validate_wedding_event_venue
  before insert or update of venue_id, guest_count, wedding_id
  on public.wedding_events
  for each row
  execute function public.validate_wedding_event_venue();
