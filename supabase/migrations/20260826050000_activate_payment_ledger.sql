-- Replace the ambiguous bookings.paid_amount mirror with an explicit,
-- directional ledger. CLIENT_IN is money received from the client;
-- VENDOR_OUT is money paid to the vendor. Ledger entries are never deleted:
-- mistakes are voided with an actor and reason so the financial history remains
-- explainable.

alter table public.payments
  add column if not exists reference text,
  add column if not exists notes text,
  add column if not exists created_by text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by text,
  add column if not exists void_reason text;

-- Existing installations may contain rows created before settlement-state
-- validation existed. Normalize those rows before adding the constraints.
update public.payments
set paid_at = coalesce(paid_at, created_at, now())
where is_paid and paid_at is null;

update public.payments
set paid_at = null
where not is_paid and paid_at is not null;

alter table public.payments
  alter column amount drop default;

alter table public.payments
  drop constraint if exists payments_amount_positive;
alter table public.payments
  add constraint payments_amount_positive check (amount > 0);

alter table public.payments
  drop constraint if exists payments_paid_at_matches_is_paid;
alter table public.payments
  add constraint payments_paid_at_matches_is_paid
  check ((is_paid and paid_at is not null) or (not is_paid and paid_at is null));

alter table public.payments
  drop constraint if exists payments_method_valid;
alter table public.payments
  add constraint payments_method_valid
  check (method is null or method in ('UPI', 'BANK', 'CASH', 'CARD', 'CHEQUE', 'OTHER'));

alter table public.payments
  drop constraint if exists payments_void_state_valid;
alter table public.payments
  add constraint payments_void_state_valid
  check (
    (voided_at is null and voided_by is null and void_reason is null)
    or
    (voided_at is not null and void_reason is not null and btrim(void_reason) <> '')
  );

create index if not exists payments_booking_kind_active_idx
  on public.payments(booking_id, kind, created_at desc)
  where booking_id is not null and voided_at is null;

create index if not exists payments_client_kind_active_idx
  on public.payments(client_profile_id, kind, created_at desc)
  where client_profile_id is not null and voided_at is null;

create index if not exists payments_vendor_kind_active_idx
  on public.payments(vendor_profile_id, kind, created_at desc)
  where vendor_profile_id is not null and voided_at is null;

-- A booking-linked ledger row must inherit the booking's parties and event.
-- This prevents an operations typo from crediting one client's receipt or one
-- vendor's payout to somebody else's account.
create or replace function public.sync_payment_booking_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_booking record;
begin
  if new.booking_id is null then
    return new;
  end if;

  select
    booking.client_profile_id,
    booking.vendor_profile_id,
    event.wedding_id
  into v_booking
  from public.bookings as booking
  left join public.wedding_events as event
    on event.id = booking.wedding_event_id
  where booking.id = new.booking_id;

  if not found then
    raise exception 'Booking % does not exist', new.booking_id
      using errcode = '23503';
  end if;

  if new.client_profile_id is not null
     and new.client_profile_id is distinct from v_booking.client_profile_id then
    raise exception 'Payment client does not match booking client'
      using errcode = '23514';
  end if;

  if new.vendor_profile_id is not null
     and new.vendor_profile_id is distinct from v_booking.vendor_profile_id then
    raise exception 'Payment vendor does not match booking vendor'
      using errcode = '23514';
  end if;

  if new.wedding_id is not null
     and v_booking.wedding_id is not null
     and new.wedding_id is distinct from v_booking.wedding_id then
    raise exception 'Payment event plan does not match booking event plan'
      using errcode = '23514';
  end if;

  new.client_profile_id := v_booking.client_profile_id;
  new.vendor_profile_id := v_booking.vendor_profile_id;
  new.wedding_id := coalesce(v_booking.wedding_id, new.wedding_id);
  return new;
end;
$$;

drop trigger if exists sync_payment_booking_context on public.payments;
create trigger sync_payment_booking_context
  before insert or update of booking_id, client_profile_id, vendor_profile_id, wedding_id
  on public.payments
  for each row execute function public.sync_payment_booking_context();

drop trigger if exists tr_payments_updated on public.payments;
create trigger tr_payments_updated
  before update on public.payments
  for each row execute function public.update_updated_at();

-- paid_amount historically powered the client/manager collection display. The
-- database currently contains test data only, so preserve those values as
-- client receipts while starting vendor payouts from an honest zero.
insert into public.payments (
  kind,
  client_profile_id,
  vendor_profile_id,
  wedding_id,
  booking_id,
  label,
  amount,
  is_paid,
  paid_at,
  notes,
  created_by,
  created_at,
  updated_at
)
select
  'CLIENT_IN',
  booking.client_profile_id,
  booking.vendor_profile_id,
  event.wedding_id,
  booking.id,
  'Imported client payment',
  booking.paid_amount,
  true,
  coalesce(booking.updated_at, booking.created_at, now()),
  'Imported from the legacy paid amount during directional-ledger activation.',
  'migration:20260826050000',
  coalesce(booking.updated_at, booking.created_at, now()),
  coalesce(booking.updated_at, booking.created_at, now())
from public.bookings as booking
left join public.wedding_events as event on event.id = booking.wedding_event_id
where booking.paid_amount > 0
  and not exists (
    select 1
    from public.payments as payment
    where payment.booking_id = booking.id
      and payment.kind = 'CLIENT_IN'
      and payment.created_by = 'migration:20260826050000'
  );

-- Create one booking-linked entry while holding a row lock on the booking. The
-- target check and insert therefore cannot race with another operations write.
create or replace function public.record_booking_payment(
  p_booking_id uuid,
  p_kind text,
  p_amount integer,
  p_label text default null,
  p_due_date date default null,
  p_is_paid boolean default true,
  p_paid_at timestamptz default null,
  p_method text default null,
  p_reference text default null,
  p_notes text default null,
  p_actor_user_id text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_target integer;
  v_recorded bigint;
  v_payment public.payments;
begin
  if p_kind not in ('CLIENT_IN', 'VENDOR_OUT') then
    raise exception 'Invalid payment direction' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be positive' using errcode = '22023';
  end if;

  if p_method is not null
     and p_method not in ('UPI', 'BANK', 'CASH', 'CARD', 'CHEQUE', 'OTHER') then
    raise exception 'Invalid payment method' using errcode = '22023';
  end if;

  select
    booking.id,
    booking.client_profile_id,
    booking.vendor_profile_id,
    booking.final_price,
    booking.vendor_amount,
    event.wedding_id
  into v_booking
  from public.bookings as booking
  left join public.wedding_events as event
    on event.id = booking.wedding_event_id
  where booking.id = p_booking_id
  for update of booking;

  if not found then
    raise exception 'Booking does not exist' using errcode = 'P0002';
  end if;

  v_target := case
    when p_kind = 'CLIENT_IN' then v_booking.final_price
    else v_booking.vendor_amount
  end;

  if v_target is null then
    raise exception '% must be fixed before recording this payment',
      case when p_kind = 'CLIENT_IN' then 'Final client price' else 'Vendor payout' end
      using errcode = '23514';
  end if;

  select coalesce(sum(payment.amount), 0)
  into v_recorded
  from public.payments as payment
  where payment.booking_id = p_booking_id
    and payment.kind = p_kind
    and payment.voided_at is null;

  if v_recorded + p_amount > v_target then
    raise exception '% would exceed the fixed amount by %',
      case when p_kind = 'CLIENT_IN' then 'Client collection' else 'Vendor payout' end,
      (v_recorded + p_amount) - v_target
      using errcode = '23514';
  end if;

  insert into public.payments (
    kind,
    client_profile_id,
    vendor_profile_id,
    wedding_id,
    booking_id,
    label,
    amount,
    due_date,
    is_paid,
    paid_at,
    method,
    reference,
    notes,
    created_by
  )
  values (
    p_kind,
    v_booking.client_profile_id,
    v_booking.vendor_profile_id,
    v_booking.wedding_id,
    p_booking_id,
    nullif(left(btrim(coalesce(p_label, '')), 160), ''),
    p_amount,
    p_due_date,
    p_is_paid,
    case when p_is_paid then coalesce(p_paid_at, now()) else null end,
    p_method,
    nullif(left(btrim(coalesce(p_reference, '')), 160), ''),
    nullif(left(btrim(coalesce(p_notes, '')), 1000), ''),
    p_actor_user_id
  )
  returning * into v_payment;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'PAYMENT_RECORDED',
    'payment',
    v_payment.id::text,
    p_kind || ' payment recorded for booking ' || p_booking_id::text,
    pg_catalog.jsonb_build_object(
      'bookingId', p_booking_id,
      'kind', p_kind,
      'amount', p_amount,
      'settled', p_is_paid
    )
  );

  return v_payment;
end;
$$;

create or replace function public.settle_booking_payment(
  p_booking_id uuid,
  p_payment_id uuid,
  p_method text,
  p_paid_at timestamptz default null,
  p_reference text default null,
  p_actor_user_id text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
begin
  if p_method is null
     or p_method not in ('UPI', 'BANK', 'CASH', 'CARD', 'CHEQUE', 'OTHER') then
    raise exception 'A valid payment method is required' using errcode = '22023';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id and booking_id = p_booking_id
  for update;

  if not found then
    raise exception 'Payment does not exist' using errcode = 'P0002';
  end if;

  if v_payment.voided_at is not null then
    raise exception 'A voided payment cannot be settled' using errcode = '23514';
  end if;

  if not v_payment.is_paid then
    update public.payments
    set
      is_paid = true,
      paid_at = coalesce(p_paid_at, now()),
      method = p_method,
      reference = coalesce(
        nullif(left(btrim(coalesce(p_reference, '')), 160), ''),
        reference
      )
    where id = p_payment_id
    returning * into v_payment;

    insert into public.admin_audit_log (
      actor_user_id, action, entity_type, entity_id, summary, meta
    )
    values (
      p_actor_user_id,
      'PAYMENT_SETTLED',
      'payment',
      v_payment.id::text,
      'Scheduled payment settled for booking ' || p_booking_id::text,
      pg_catalog.jsonb_build_object(
        'bookingId', p_booking_id,
        'kind', v_payment.kind,
        'amount', v_payment.amount
      )
    );
  end if;

  return v_payment;
end;
$$;

create or replace function public.void_booking_payment(
  p_booking_id uuid,
  p_payment_id uuid,
  p_reason text,
  p_actor_user_id text default null
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_reason text;
begin
  v_reason := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
  if v_reason is null then
    raise exception 'A void reason is required' using errcode = '22023';
  end if;

  update public.payments
  set
    voided_at = now(),
    voided_by = p_actor_user_id,
    void_reason = v_reason
  where id = p_payment_id
    and booking_id = p_booking_id
    and voided_at is null
  returning * into v_payment;

  if not found then
    raise exception 'Active payment does not exist' using errcode = 'P0002';
  end if;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'PAYMENT_VOIDED',
    'payment',
    v_payment.id::text,
    'Payment voided for booking ' || p_booking_id::text,
    pg_catalog.jsonb_build_object(
      'bookingId', p_booking_id,
      'kind', v_payment.kind,
      'amount', v_payment.amount,
      'reason', v_reason
    )
  );

  return v_payment;
end;
$$;

alter table public.payments enable row level security;
revoke all privileges on table public.payments from public, anon, authenticated;
grant select, insert, update on table public.payments to service_role;

revoke execute on function public.record_booking_payment(
  uuid, text, integer, text, date, boolean, timestamptz, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_booking_payment(
  uuid, text, integer, text, date, boolean, timestamptz, text, text, text, text
) to service_role;

revoke execute on function public.settle_booking_payment(
  uuid, uuid, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.settle_booking_payment(
  uuid, uuid, text, timestamptz, text, text
) to service_role;

revoke execute on function public.void_booking_payment(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.void_booking_payment(uuid, uuid, text, text)
  to service_role;

comment on table public.payments is
  'Directional booking ledger. CLIENT_IN is client collection; VENDOR_OUT is vendor payout. Entries are settled or scheduled and corrections are voided, never deleted.';

comment on column public.bookings.paid_amount is
  'Deprecated historical client-collection mirror. New payment progress is derived from public.payments by kind.';
