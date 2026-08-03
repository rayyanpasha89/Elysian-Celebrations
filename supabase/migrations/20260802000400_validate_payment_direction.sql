-- The ledger already models two opposite money flows. Encode the documented
-- values so future writes cannot introduce an ambiguous third direction.

alter table public.payments
  drop constraint if exists payments_kind_valid;
alter table public.payments
  add constraint payments_kind_valid
  check (kind in ('CLIENT_IN', 'VENDOR_OUT'));
