-- Admin pricing model: Elysian negotiates the vendor cost and sets the final
-- client-facing price per vendor pick (booking). Margin = final_price - vendor_cost.
-- price_published gates whether the locked final price is visible to the client
-- (client also only sees it once their event hits 100% readiness).

alter table public.bookings
  add column if not exists vendor_cost integer,
  add column if not exists final_price integer,
  add column if not exists price_published boolean not null default false;

comment on column public.bookings.vendor_cost is 'Negotiated cost Elysian pays the vendor (admin-only).';
comment on column public.bookings.final_price is 'Final client-facing price Elysian sets (admin-only until published).';
comment on column public.bookings.price_published is 'When true (and the event is 100% ready), the client sees final_price.';
