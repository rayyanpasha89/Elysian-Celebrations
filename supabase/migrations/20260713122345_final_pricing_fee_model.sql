-- Replace the active negotiation/margin workflow with a frozen vendor amount,
-- one complete client-facing final price, and a database-derived Elysian fee.

alter table public.bookings
  add column if not exists vendor_amount integer;

-- Snapshot the best vendor amount currently available. Legacy vendor_cost is
-- the agreed historical amount, while new rows use the vendor's submitted
-- total. Existing final prices are preserved exactly; rows where an old final
-- is below the recorded vendor amount are capped so we never invent a negative
-- fee during migration.
update public.bookings as booking
set vendor_amount = case
  when booking.final_price is not null then
    greatest(
      0,
      least(
        coalesce(
          booking.vendor_cost,
          booking.total_amount,
          service.base_price,
          booking.final_price
        ),
        booking.final_price
      )
    )
  when coalesce(booking.vendor_cost, booking.total_amount, service.base_price) is not null then
    greatest(
      0,
      coalesce(booking.vendor_cost, booking.total_amount, service.base_price)
    )
  else null
end
from public.vendor_services as service
where booking.vendor_service_id = service.id
  and booking.vendor_amount is null;

update public.bookings
set vendor_amount = greatest(
  0,
  case
    when final_price is not null then
      least(coalesce(vendor_cost, total_amount, final_price), final_price)
    else coalesce(vendor_cost, total_amount)
  end
)
where vendor_amount is null
  and (vendor_cost is not null or total_amount is not null or final_price is not null);

alter table public.bookings
  add column if not exists service_fee integer
  generated always as (
    case
      when final_price is null or vendor_amount is null then null
      else final_price - vendor_amount
    end
  ) stored;

alter table public.bookings
  drop constraint if exists bookings_vendor_amount_nonnegative,
  add constraint bookings_vendor_amount_nonnegative
    check (vendor_amount is null or vendor_amount >= 0),
  drop constraint if exists bookings_final_price_valid,
  add constraint bookings_final_price_valid
    check (
      final_price is null
      or (vendor_amount is not null and final_price >= vendor_amount)
    ),
  drop constraint if exists bookings_published_price_complete,
  add constraint bookings_published_price_complete
    check (price_published = false or final_price is not null);

create or replace function public.lock_booking_vendor_amount()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.vendor_amount is not null
     and new.vendor_amount is distinct from old.vendor_amount then
    raise exception 'vendor_amount is immutable once captured';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_lock_vendor_amount on public.bookings;
create trigger bookings_lock_vendor_amount
before update of vendor_amount on public.bookings
for each row execute function public.lock_booking_vendor_amount();

comment on column public.bookings.vendor_cost is
  'Legacy negotiated cost retained for historical audit records; no longer written by the application.';
comment on column public.bookings.vendor_amount is
  'Frozen vendor/listed amount captured when Elysian first sets a final client price.';
comment on column public.bookings.final_price is
  'Complete client-facing price set by Elysian; never lower than vendor_amount.';
comment on column public.bookings.service_fee is
  'Generated Elysian fee: final_price minus vendor_amount.';
comment on column public.bookings.price_published is
  'When true, the complete final_price may be revealed after the event is ready.';
comment on table public.negotiation_entries is
  'Legacy negotiation history retained read-only for audit compatibility.';
