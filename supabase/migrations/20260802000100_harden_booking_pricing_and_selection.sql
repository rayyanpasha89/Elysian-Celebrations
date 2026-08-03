-- Keep the legacy amount column as a strict compatibility mirror so older
-- readers cannot drift away from the admin-owned vendor payout.
update public.bookings
set total_amount = vendor_amount
where total_amount is distinct from vendor_amount;

alter table public.bookings
  drop constraint if exists bookings_total_amount_matches_vendor_amount;
alter table public.bookings
  add constraint bookings_total_amount_matches_vendor_amount
  check (total_amount is not distinct from vendor_amount);

comment on column public.bookings.total_amount is
  'Legacy compatibility mirror constrained to equal vendor_amount.';

-- A planner retry must not create a second billable selection for the same
-- function/vendor/service tuple. Cancelled history remains reusable.
create unique index if not exists bookings_unique_active_event_vendor_service
  on public.bookings (
    client_profile_id,
    wedding_event_id,
    vendor_profile_id,
    vendor_service_id
  ) nulls not distinct
  where wedding_event_id is not null and status <> 'CANCELLED';
