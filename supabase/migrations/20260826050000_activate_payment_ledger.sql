-- bookings.paid_amount is read in two opposite directions: vendor analytics
-- treats it as payout progress, the client surfaces treat it as collection
-- progress. Whichever number operations enters, one of those is wrong, and
-- there is no way to express "client has paid Elysian half, Elysian has paid
-- the vendor nothing".
--
-- The column cannot be split by backfill. It exists in the baseline schema from
-- March, while final_price and service_fee - the two-price model that creates
-- the distinction at all - arrived in July. When paid_amount was written there
-- was a single price, so the historical values do not encode a direction and
-- inferring one would be inventing data.
--
-- public.payments already models the two flows correctly and has never had a
-- reader or a writer. This activates it as the source of truth for payment
-- progress. bookings.paid_amount is left exactly as it is: still written by the
-- legacy path, no longer the basis for a direction-specific figure, and
-- reported separately so operations can attribute the balance deliberately
-- rather than having a direction guessed for them.

alter table public.payments
  drop constraint if exists payments_amount_nonnegative;
alter table public.payments
  add constraint payments_amount_nonnegative check (amount >= 0);

-- A settled payment needs a settlement date, and an unsettled one must not
-- claim a date it does not have.
alter table public.payments
  drop constraint if exists payments_paid_at_matches_is_paid;
alter table public.payments
  add constraint payments_paid_at_matches_is_paid
  check ((is_paid and paid_at is not null) or (not is_paid and paid_at is null));

-- Progress is read per booking and per direction on every booking and
-- analytics surface.
create index if not exists payments_booking_kind_idx
  on public.payments(booking_id, kind)
  where booking_id is not null;

create index if not exists payments_client_profile_kind_idx
  on public.payments(client_profile_id, kind)
  where client_profile_id is not null;

create index if not exists payments_vendor_profile_kind_idx
  on public.payments(vendor_profile_id, kind)
  where vendor_profile_id is not null;

revoke all privileges on table public.payments from anon, authenticated;
grant select, insert, update, delete on table public.payments to service_role;

comment on table public.payments is
  'Directional payment ledger. CLIENT_IN is money received from a client; VENDOR_OUT is money paid to a vendor. Source of truth for payment progress.';

comment on column public.bookings.paid_amount is
  'Legacy single-direction total, kept for historical balances only. It predates the client/vendor price split and does not encode a direction. Use public.payments for payment progress.';
