-- Pricing is agreed offline and recorded by Elysian operations. The previous
-- trigger froze the first vendor-submitted amount, which no longer matches the
-- product workflow and prevented administrators from correcting an agreement.
drop trigger if exists bookings_lock_vendor_amount on public.bookings;
drop function if exists public.lock_booking_vendor_amount();

comment on column public.bookings.vendor_amount is
  'Event-specific vendor price agreed offline and recorded by Elysian operations.';
comment on column public.bookings.total_amount is
  'Legacy compatibility mirror of vendor_amount; new pricing writes are admin-owned.';
comment on column public.bookings.final_price is
  'Client-facing total derived from vendor_amount plus a flat Elysian service fee.';
comment on column public.bookings.service_fee is
  'Generated flat Elysian fee: final_price minus vendor_amount.';
comment on column public.bookings.price_published is
  'When true, final_price may be revealed to the client under application visibility rules.';
