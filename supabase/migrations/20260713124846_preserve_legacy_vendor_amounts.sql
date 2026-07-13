-- The first final-pricing migration initially preferred total_amount for its
-- legacy snapshot. In the old workflow, vendor_cost was the auditable agreed
-- vendor amount, so preserve that value wherever it produces a valid final
-- price. New bookings never write vendor_cost and are unaffected.

drop trigger if exists bookings_lock_vendor_amount on public.bookings;

update public.bookings
set vendor_amount = greatest(0, vendor_cost)
where vendor_cost is not null
  and (final_price is null or final_price >= vendor_cost)
  and vendor_amount is distinct from greatest(0, vendor_cost);

create trigger bookings_lock_vendor_amount
before update of vendor_amount on public.bookings
for each row execute function public.lock_booking_vendor_amount();
