-- Client billing sits above the directional payments ledger. An invoice is a
-- payment obligation; the linked CLIENT_IN ledger row remains the source of
-- truth for whether money has actually settled. Gateway attempts and webhook
-- delivery are deliberately separate so retries can never duplicate money.

create sequence if not exists public.billing_invoice_number_seq
  as bigint
  start with 1001
  increment by 1
  no cycle;

create or replace function public.next_billing_invoice_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select
    'ELYS-' || pg_catalog.to_char(current_date, 'YYYY') || '-' ||
    pg_catalog.lpad(
      pg_catalog.nextval('public.billing_invoice_number_seq'::pg_catalog.regclass)::text,
      6,
      '0'
    );
$$;

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default public.next_billing_invoice_number(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  payment_id uuid not null references public.payments(id) on delete restrict,
  idempotency_key text not null,
  client_profile_id uuid not null references public.client_profiles(id) on delete restrict,
  wedding_id uuid references public.weddings(id) on delete restrict,
  installment_number integer not null,
  label text not null,
  description text,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'ISSUED',
  due_date date not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_amount integer not null default 0,
  refunded_at timestamptz,
  voided_at timestamptz,
  voided_by text,
  void_reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_invoices_number_unique unique (invoice_number),
  constraint billing_invoices_payment_unique unique (payment_id),
  constraint billing_invoices_installment_unique
    unique (booking_id, installment_number),
  constraint billing_invoices_idempotency_unique
    unique (booking_id, idempotency_key),
  constraint billing_invoices_installment_positive
    check (installment_number > 0),
  constraint billing_invoices_amount_positive check (amount > 0),
  constraint billing_invoices_currency_valid check (currency = 'INR'),
  constraint billing_invoices_status_valid check (
    status in ('ISSUED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOID')
  ),
  constraint billing_invoices_idempotency_valid check (
    btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 160
  ),
  constraint billing_invoices_refund_amount_valid
    check (refunded_amount >= 0 and refunded_amount <= amount),
  constraint billing_invoices_label_valid
    check (btrim(label) <> '' and char_length(label) <= 160),
  constraint billing_invoices_description_length
    check (description is null or char_length(description) <= 1000),
  constraint billing_invoices_state_valid check (
    (
      status = 'ISSUED'
      and paid_at is null
      and refunded_amount = 0
      and refunded_at is null
      and voided_at is null
      and voided_by is null
      and void_reason is null
    )
    or
    (
      status = 'PAID'
      and paid_at is not null
      and refunded_amount = 0
      and refunded_at is null
      and voided_at is null
      and voided_by is null
      and void_reason is null
    )
    or
    (
      status = 'PARTIALLY_REFUNDED'
      and paid_at is not null
      and refunded_amount > 0
      and refunded_amount < amount
      and refunded_at is not null
      and voided_at is null
      and voided_by is null
      and void_reason is null
    )
    or
    (
      status = 'REFUNDED'
      and paid_at is not null
      and refunded_amount = amount
      and refunded_at is not null
      and voided_at is null
      and voided_by is null
      and void_reason is null
    )
    or
    (
      status = 'VOID'
      and paid_at is null
      and refunded_amount = 0
      and refunded_at is null
      and voided_at is not null
      and void_reason is not null
      and btrim(void_reason) <> ''
    )
  )
);

create index if not exists billing_invoices_client_status_due_idx
  on public.billing_invoices(client_profile_id, status, due_date, created_at desc);

create index if not exists billing_invoices_booking_status_idx
  on public.billing_invoices(booking_id, status, created_at desc);

create index if not exists billing_invoices_wedding_status_idx
  on public.billing_invoices(wedding_id, status, due_date)
  where wedding_id is not null;

-- Payment attempts contain gateway identifiers and state only. They never
-- contain card, bank-account, UPI PIN, or raw checkout payload data.
create table if not exists public.billing_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete restrict,
  provider text not null,
  idempotency_key text not null,
  provider_order_id text,
  provider_payment_id text,
  status text not null default 'CREATED',
  amount_minor bigint not null,
  currency text not null default 'INR',
  failure_code text,
  failure_message text,
  checkout_expires_at timestamptz,
  authorized_at timestamptz,
  captured_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_payment_attempts_idempotency_unique
    unique (provider, idempotency_key),
  constraint billing_payment_attempts_provider_valid
    check (btrim(provider) <> '' and char_length(provider) <= 32),
  constraint billing_payment_attempts_idempotency_valid
    check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 160),
  constraint billing_payment_attempts_status_valid check (
    status in (
      'CREATED',
      'PENDING',
      'AUTHORIZED',
      'CAPTURED',
      'FAILED',
      'CANCELLED'
    )
  ),
  constraint billing_payment_attempts_amount_positive check (amount_minor > 0),
  constraint billing_payment_attempts_currency_valid check (currency = 'INR'),
  constraint billing_payment_attempts_metadata_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint billing_payment_attempts_failure_length check (
    (failure_code is null or char_length(failure_code) <= 120)
    and (failure_message is null or char_length(failure_message) <= 500)
  )
);

create index if not exists billing_payment_attempts_invoice_created_idx
  on public.billing_payment_attempts(invoice_id, created_at desc);

create unique index if not exists billing_payment_attempts_provider_order_unique
  on public.billing_payment_attempts(provider, provider_order_id)
  where provider_order_id is not null;

create unique index if not exists billing_payment_attempts_provider_payment_unique
  on public.billing_payment_attempts(provider, provider_payment_id)
  where provider_payment_id is not null;

create or replace function public.validate_billing_payment_attempt()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_invoice public.billing_invoices;
begin
  select * into v_invoice
  from public.billing_invoices
  where id = new.invoice_id;

  if not found then
    raise exception 'Invoice % does not exist', new.invoice_id
      using errcode = '23503';
  end if;

  new.provider := upper(btrim(new.provider));

  if new.amount_minor is distinct from v_invoice.amount::bigint * 100 then
    raise exception 'Checkout amount does not match the invoice'
      using errcode = '23514';
  end if;

  if v_invoice.status <> 'ISSUED'
     and new.status not in ('CAPTURED', 'CANCELLED', 'FAILED') then
    raise exception 'Only an issued invoice can start or continue checkout'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_billing_payment_attempt
  on public.billing_payment_attempts;
create trigger validate_billing_payment_attempt
  before insert or update on public.billing_payment_attempts
  for each row execute function public.validate_billing_payment_attempt();

-- Refunds are append-only financial events. A settled receipt is never voided;
-- manual or gateway refunds are recorded here and netted from the invoice.
create table if not exists public.billing_refunds (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete restrict,
  payment_attempt_id uuid references public.billing_payment_attempts(id) on delete restrict,
  provider text not null default 'MANUAL',
  idempotency_key text not null,
  provider_refund_id text,
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'PROCESSED',
  method text,
  reference text,
  reason text not null,
  requested_by text,
  processed_at timestamptz,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_refunds_idempotency_unique
    unique (provider, idempotency_key),
  constraint billing_refunds_provider_valid
    check (btrim(provider) <> '' and char_length(provider) <= 32),
  constraint billing_refunds_idempotency_valid
    check (btrim(idempotency_key) <> '' and char_length(idempotency_key) <= 160),
  constraint billing_refunds_amount_positive check (amount > 0),
  constraint billing_refunds_currency_valid check (currency = 'INR'),
  constraint billing_refunds_status_valid
    check (status in ('REQUESTED', 'PENDING', 'PROCESSED', 'FAILED', 'CANCELLED')),
  constraint billing_refunds_method_valid check (
    method is null or method in ('UPI', 'BANK', 'CASH', 'CARD', 'CHEQUE', 'OTHER')
  ),
  constraint billing_refunds_text_valid check (
    btrim(reason) <> ''
    and char_length(reason) <= 500
    and (reference is null or char_length(reference) <= 160)
    and (failure_code is null or char_length(failure_code) <= 120)
    and (failure_message is null or char_length(failure_message) <= 500)
  ),
  constraint billing_refunds_state_valid check (
    (status = 'PROCESSED' and processed_at is not null)
    or (status <> 'PROCESSED' and processed_at is null)
  )
);

create index if not exists billing_refunds_invoice_created_idx
  on public.billing_refunds(invoice_id, created_at desc);

create index if not exists billing_refunds_attempt_created_idx
  on public.billing_refunds(payment_attempt_id, created_at desc)
  where payment_attempt_id is not null;

create unique index if not exists billing_refunds_provider_refund_unique
  on public.billing_refunds(provider, provider_refund_id)
  where provider_refund_id is not null;

drop trigger if exists tr_billing_refunds_updated on public.billing_refunds;
create trigger tr_billing_refunds_updated
  before update on public.billing_refunds
  for each row execute function public.update_updated_at();

create or replace function public.validate_billing_refund_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_invoice public.billing_invoices;
  v_attempt public.billing_payment_attempts;
begin
  select * into v_invoice
  from public.billing_invoices
  where id = new.invoice_id;

  if not found then
    raise exception 'Invoice % does not exist', new.invoice_id
      using errcode = '23503';
  end if;

  new.provider := upper(btrim(new.provider));

  if new.amount > v_invoice.amount then
    raise exception 'Refund cannot exceed the invoice amount'
      using errcode = '23514';
  end if;

  if new.payment_attempt_id is not null then
    select * into v_attempt
    from public.billing_payment_attempts
    where id = new.payment_attempt_id;

    if not found
       or v_attempt.invoice_id <> new.invoice_id
       or v_attempt.provider <> new.provider then
      raise exception 'Refund attempt does not match the invoice and provider'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_billing_refund_context on public.billing_refunds;
create trigger validate_billing_refund_context
  before insert or update on public.billing_refunds
  for each row execute function public.validate_billing_refund_context();

-- Store delivery identity and a SHA-256 digest, not the raw provider payload.
-- The unique provider/event pair makes webhook replay safe.
create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  payment_attempt_id uuid references public.billing_payment_attempts(id) on delete set null,
  status text not null default 'RECEIVED',
  delivery_count integer not null default 1,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint billing_webhook_events_delivery_unique
    unique (provider, provider_event_id),
  constraint billing_webhook_events_provider_valid
    check (btrim(provider) <> '' and char_length(provider) <= 32),
  constraint billing_webhook_events_identity_valid check (
    btrim(provider_event_id) <> ''
    and char_length(provider_event_id) <= 200
    and btrim(event_type) <> ''
    and char_length(event_type) <= 160
  ),
  constraint billing_webhook_events_digest_valid
    check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  constraint billing_webhook_events_status_valid
    check (status in ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED')),
  constraint billing_webhook_events_delivery_count_positive
    check (delivery_count > 0),
  constraint billing_webhook_events_error_length
    check (last_error is null or char_length(last_error) <= 1000)
);

create index if not exists billing_webhook_events_status_received_idx
  on public.billing_webhook_events(status, received_at)
  where status in ('RECEIVED', 'FAILED');

create index if not exists billing_webhook_events_attempt_idx
  on public.billing_webhook_events(payment_attempt_id, received_at desc)
  where payment_attempt_id is not null;

-- Keep invoice identity and settlement state derived from its linked ledger
-- row. This also catches accidental service-role writes that bypass the RPCs.
create or replace function public.sync_billing_invoice_context()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_refunded bigint;
  v_refunded_at timestamptz;
begin
  select * into v_payment
  from public.payments
  where id = new.payment_id;

  if not found then
    raise exception 'Payment % does not exist', new.payment_id
      using errcode = '23503';
  end if;

  if v_payment.kind <> 'CLIENT_IN' then
    raise exception 'Invoices can only link to client collection entries'
      using errcode = '23514';
  end if;

  if v_payment.booking_id is distinct from new.booking_id then
    raise exception 'Invoice booking does not match its payment'
      using errcode = '23514';
  end if;

  if v_payment.amount is distinct from new.amount then
    raise exception 'Invoice amount does not match its payment'
      using errcode = '23514';
  end if;

  if v_payment.due_date is distinct from new.due_date then
    raise exception 'Invoice due date does not match its payment'
      using errcode = '23514';
  end if;

  new.client_profile_id := v_payment.client_profile_id;
  new.wedding_id := v_payment.wedding_id;

  select
    coalesce(sum(refund.amount), 0),
    max(refund.processed_at)
  into v_refunded, v_refunded_at
  from public.billing_refunds as refund
  where refund.invoice_id = new.id
    and refund.status = 'PROCESSED';

  if v_refunded > new.amount then
    raise exception 'Processed refunds exceed the invoice amount'
      using errcode = '23514';
  end if;

  new.refunded_amount := v_refunded::integer;
  new.refunded_at := v_refunded_at;

  if v_payment.voided_at is not null then
    new.status := 'VOID';
    new.paid_at := null;
    new.voided_at := v_payment.voided_at;
    new.voided_by := v_payment.voided_by;
    new.void_reason := v_payment.void_reason;
  elsif v_payment.is_paid then
    new.status := case
      when v_refunded = new.amount then 'REFUNDED'
      when v_refunded > 0 then 'PARTIALLY_REFUNDED'
      else 'PAID'
    end;
    new.paid_at := v_payment.paid_at;
    new.voided_at := null;
    new.voided_by := null;
    new.void_reason := null;
  else
    new.status := 'ISSUED';
    new.paid_at := null;
    new.refunded_amount := 0;
    new.refunded_at := null;
    new.voided_at := null;
    new.voided_by := null;
    new.void_reason := null;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_billing_invoice_context on public.billing_invoices;
create trigger sync_billing_invoice_context
  before insert or update on public.billing_invoices
  for each row execute function public.sync_billing_invoice_context();

drop trigger if exists tr_billing_invoices_updated on public.billing_invoices;
create trigger tr_billing_invoices_updated
  before update on public.billing_invoices
  for each row execute function public.update_updated_at();

drop trigger if exists tr_billing_payment_attempts_updated
  on public.billing_payment_attempts;
create trigger tr_billing_payment_attempts_updated
  before update on public.billing_payment_attempts
  for each row execute function public.update_updated_at();

-- A linked invoice makes the payment's direction, context, amount, and due date
-- immutable. Settlement and void state remain mutable through audited RPCs.
create or replace function public.guard_invoiced_payment_context()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.billing_invoices as invoice
    where invoice.payment_id = old.id
  ) and (
    new.kind is distinct from old.kind
    or new.booking_id is distinct from old.booking_id
    or new.client_profile_id is distinct from old.client_profile_id
    or new.vendor_profile_id is distinct from old.vendor_profile_id
    or new.wedding_id is distinct from old.wedding_id
    or new.amount is distinct from old.amount
    or new.due_date is distinct from old.due_date
  ) then
    raise exception 'An invoiced payment obligation cannot be re-shaped'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_invoiced_payment_context on public.payments;
create trigger guard_invoiced_payment_context
  before update of kind, booking_id, client_profile_id, vendor_profile_id,
    wedding_id, amount, due_date
  on public.payments
  for each row execute function public.guard_invoiced_payment_context();

create or replace function public.sync_invoice_from_payment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.billing_invoices
  set
    status = case
      when new.voided_at is not null then 'VOID'
      when new.is_paid then 'PAID'
      else 'ISSUED'
    end,
    paid_at = case
      when new.voided_at is null and new.is_paid then new.paid_at
      else null
    end,
    voided_at = new.voided_at,
    voided_by = new.voided_by,
    void_reason = new.void_reason
  where payment_id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_invoice_from_payment on public.payments;
create trigger sync_invoice_from_payment
  after update of is_paid, paid_at, voided_at, voided_by, void_reason
  on public.payments
  for each row execute function public.sync_invoice_from_payment();

-- Issue one installment atomically. record_booking_payment already locks the
-- booking and rejects obligations above final_price; the same transaction then
-- wraps that scheduled ledger row in an immutable client invoice.
create or replace function public.issue_booking_invoice(
  p_booking_id uuid,
  p_amount integer,
  p_due_date date,
  p_idempotency_key text,
  p_label text default null,
  p_description text default null,
  p_actor_user_id text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking record;
  v_payment public.payments;
  v_invoice public.billing_invoices;
  v_existing public.billing_invoices;
  v_installment_number integer;
  v_idempotency_key text;
  v_label text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Invoice amount must be positive' using errcode = '22023';
  end if;

  if p_due_date is null then
    raise exception 'Invoice due date is required' using errcode = '22023';
  end if;

  v_idempotency_key := nullif(
    left(btrim(coalesce(p_idempotency_key, '')), 160),
    ''
  );
  if v_idempotency_key is null then
    raise exception 'Invoice idempotency key is required'
      using errcode = '22023';
  end if;

  select
    booking.id,
    booking.final_price,
    booking.price_published,
    booking.status
  into v_booking
  from public.bookings as booking
  where booking.id = p_booking_id
  for update of booking;

  if not found then
    raise exception 'Booking does not exist' using errcode = 'P0002';
  end if;

  if v_booking.status = 'CANCELLED' then
    raise exception 'A cancelled booking cannot be invoiced'
      using errcode = '23514';
  end if;

  if not v_booking.price_published or v_booking.final_price is null then
    raise exception 'Publish the final client price before issuing an invoice'
      using errcode = '23514';
  end if;

  select * into v_existing
  from public.billing_invoices as invoice
  where invoice.booking_id = p_booking_id
    and invoice.idempotency_key = v_idempotency_key;

  if found then
    if v_existing.amount <> p_amount
       or v_existing.due_date <> p_due_date
       or (
         nullif(btrim(coalesce(p_label, '')), '') is not null
         and v_existing.label <> left(btrim(p_label), 160)
       )
       or (
         nullif(btrim(coalesce(p_description, '')), '') is not null
         and v_existing.description is distinct from left(btrim(p_description), 1000)
       ) then
      raise exception 'Idempotency key was already used for a different invoice'
        using errcode = '23514';
    end if;

    return v_existing;
  end if;

  select coalesce(max(invoice.installment_number), 0) + 1
  into v_installment_number
  from public.billing_invoices as invoice
  where invoice.booking_id = p_booking_id;

  v_label := coalesce(
    nullif(left(btrim(coalesce(p_label, '')), 160), ''),
    'Installment ' || v_installment_number::text
  );

  select payment.* into v_payment
  from public.record_booking_payment(
    p_booking_id,
    'CLIENT_IN',
    p_amount,
    v_label,
    p_due_date,
    false,
    null,
    null,
    null,
    nullif(left(btrim(coalesce(p_description, '')), 1000), ''),
    p_actor_user_id
  ) as payment;

  insert into public.billing_invoices (
    booking_id,
    payment_id,
    idempotency_key,
    client_profile_id,
    wedding_id,
    installment_number,
    label,
    description,
    amount,
    due_date,
    created_by
  )
  values (
    p_booking_id,
    v_payment.id,
    v_idempotency_key,
    v_payment.client_profile_id,
    v_payment.wedding_id,
    v_installment_number,
    v_label,
    nullif(left(btrim(coalesce(p_description, '')), 1000), ''),
    p_amount,
    p_due_date,
    p_actor_user_id
  )
  returning * into v_invoice;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'BILLING_INVOICE_ISSUED',
    'billing_invoice',
    v_invoice.id::text,
    'Invoice ' || v_invoice.invoice_number || ' issued for booking ' || p_booking_id::text,
    pg_catalog.jsonb_build_object(
      'bookingId', p_booking_id,
      'paymentId', v_payment.id,
      'invoiceNumber', v_invoice.invoice_number,
      'installmentNumber', v_installment_number,
      'amount', p_amount,
      'dueDate', p_due_date
    )
  );

  return v_invoice;
end;
$$;

create or replace function public.settle_billing_invoice(
  p_invoice_id uuid,
  p_method text,
  p_paid_at timestamptz default null,
  p_reference text default null,
  p_actor_user_id text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.billing_invoices;
begin
  select * into v_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice does not exist' using errcode = 'P0002';
  end if;

  if v_invoice.status = 'VOID' then
    raise exception 'A void invoice cannot be settled' using errcode = '23514';
  end if;

  perform public.settle_booking_payment(
    v_invoice.booking_id,
    v_invoice.payment_id,
    p_method,
    p_paid_at,
    p_reference,
    p_actor_user_id
  );

  select * into v_invoice
  from public.billing_invoices
  where id = p_invoice_id;

  return v_invoice;
end;
$$;

create or replace function public.void_billing_invoice(
  p_invoice_id uuid,
  p_reason text,
  p_actor_user_id text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.billing_invoices;
begin
  select * into v_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice does not exist' using errcode = 'P0002';
  end if;

  if v_invoice.status = 'PAID' then
    raise exception 'A paid invoice must be refunded, not voided'
      using errcode = '23514';
  end if;

  if v_invoice.status = 'VOID' then
    return v_invoice;
  end if;

  perform public.void_booking_payment(
    v_invoice.booking_id,
    v_invoice.payment_id,
    p_reason,
    p_actor_user_id
  );

  select * into v_invoice
  from public.billing_invoices
  where id = p_invoice_id;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'BILLING_INVOICE_VOIDED',
    'billing_invoice',
    v_invoice.id::text,
    'Invoice ' || v_invoice.invoice_number || ' voided',
    pg_catalog.jsonb_build_object(
      'bookingId', v_invoice.booking_id,
      'paymentId', v_invoice.payment_id,
      'invoiceNumber', v_invoice.invoice_number,
      'amount', v_invoice.amount,
      'reason', v_invoice.void_reason
    )
  );

  return v_invoice;
end;
$$;

-- Settled receipts remain immutable. Corrections after settlement are explicit
-- append-only refunds, never a void that erases received money from history.
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

  select * into v_payment
  from public.payments
  where id = p_payment_id
    and booking_id = p_booking_id
  for update;

  if not found or v_payment.voided_at is not null then
    raise exception 'Active payment does not exist' using errcode = 'P0002';
  end if;

  if v_payment.is_paid then
    raise exception 'A settled payment must be refunded, not voided'
      using errcode = '23514';
  end if;

  update public.payments
  set
    voided_at = now(),
    voided_by = p_actor_user_id,
    void_reason = v_reason
  where id = p_payment_id
  returning * into v_payment;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'PAYMENT_VOIDED',
    'payment',
    v_payment.id::text,
    'Unsettled payment obligation voided for booking ' || p_booking_id::text,
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

create or replace function public.record_billing_refund(
  p_invoice_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_method text,
  p_reference text,
  p_reason text,
  p_actor_user_id text default null
)
returns public.billing_refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_id uuid;
  v_invoice public.billing_invoices;
  v_existing public.billing_refunds;
  v_refund public.billing_refunds;
  v_refunded bigint;
  v_idempotency_key text;
  v_reason text;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Refund amount must be positive' using errcode = '22023';
  end if;

  if p_method is null
     or p_method not in ('UPI', 'BANK', 'CASH', 'CARD', 'CHEQUE', 'OTHER') then
    raise exception 'A valid refund method is required' using errcode = '22023';
  end if;

  v_idempotency_key := nullif(
    left(btrim(coalesce(p_idempotency_key, '')), 160),
    ''
  );
  if v_idempotency_key is null then
    raise exception 'Refund idempotency key is required'
      using errcode = '22023';
  end if;

  v_reason := nullif(left(btrim(coalesce(p_reason, '')), 500), '');
  if v_reason is null then
    raise exception 'A refund reason is required' using errcode = '22023';
  end if;

  select invoice.booking_id into v_booking_id
  from public.billing_invoices as invoice
  where invoice.id = p_invoice_id;

  if not found then
    raise exception 'Invoice does not exist' using errcode = 'P0002';
  end if;

  perform 1
  from public.bookings as booking
  where booking.id = v_booking_id
  for update of booking;

  select * into v_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  select * into v_existing
  from public.billing_refunds as refund
  where refund.provider = 'MANUAL'
    and refund.idempotency_key = v_idempotency_key;

  if found then
    if v_existing.invoice_id <> p_invoice_id
       or v_existing.amount <> p_amount
       or v_existing.method is distinct from p_method
       or v_existing.reason <> v_reason then
      raise exception 'Idempotency key was already used for a different refund'
        using errcode = '23514';
    end if;

    return v_existing;
  end if;

  if v_invoice.status not in ('PAID', 'PARTIALLY_REFUNDED') then
    raise exception 'Only a paid invoice can be refunded'
      using errcode = '23514';
  end if;

  select coalesce(sum(refund.amount), 0)
  into v_refunded
  from public.billing_refunds as refund
  where refund.invoice_id = p_invoice_id
    and refund.status = 'PROCESSED';

  if v_refunded + p_amount > v_invoice.amount then
    raise exception 'Refund would exceed the settled invoice amount by %',
      (v_refunded + p_amount) - v_invoice.amount
      using errcode = '23514';
  end if;

  insert into public.billing_refunds (
    invoice_id,
    provider,
    idempotency_key,
    amount,
    status,
    method,
    reference,
    reason,
    requested_by,
    processed_at
  )
  values (
    p_invoice_id,
    'MANUAL',
    v_idempotency_key,
    p_amount,
    'PROCESSED',
    p_method,
    nullif(left(btrim(coalesce(p_reference, '')), 160), ''),
    v_reason,
    p_actor_user_id,
    now()
  )
  returning * into v_refund;

  -- Re-run invoice derivation now that the append-only refund exists.
  update public.billing_invoices
  set updated_at = now()
  where id = p_invoice_id
  returning * into v_invoice;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    'BILLING_REFUND_RECORDED',
    'billing_refund',
    v_refund.id::text,
    'Refund recorded for invoice ' || v_invoice.invoice_number,
    pg_catalog.jsonb_build_object(
      'invoiceId', p_invoice_id,
      'invoiceNumber', v_invoice.invoice_number,
      'bookingId', v_invoice.booking_id,
      'amount', p_amount,
      'method', p_method,
      'reason', v_reason
    )
  );

  return v_refund;
end;
$$;

-- Pricing, payment obligations, and publication state move under one booking
-- row lock. Once an active invoice exists, commercial terms are immutable
-- until operations voids that invoice.
create or replace function public.set_booking_pricing(
  p_booking_id uuid,
  p_vendor_amount integer,
  p_fee integer,
  p_price_published boolean,
  p_expected_updated_at timestamptz,
  p_actor_user_id text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_updated public.bookings;
  v_final_price integer;
  v_client_recorded bigint;
  v_vendor_recorded bigint;
  v_active_invoice_count integer;
begin
  if (p_vendor_amount is null) <> (p_fee is null) then
    raise exception 'Vendor amount and Elysian fee must be set or cleared together'
      using errcode = '22023';
  end if;

  if p_vendor_amount is not null and p_vendor_amount <= 0 then
    raise exception 'Vendor amount must be greater than zero'
      using errcode = '22023';
  end if;

  if p_fee is not null and p_fee < 0 then
    raise exception 'Elysian fee cannot be negative' using errcode = '22023';
  end if;

  if p_vendor_amount is not null
     and p_vendor_amount::bigint + p_fee::bigint > 2147483647 then
    raise exception 'Combined price is too large' using errcode = '22023';
  end if;

  v_final_price := case
    when p_vendor_amount is null then null
    else p_vendor_amount + p_fee
  end;

  if p_price_published and v_final_price is null then
    raise exception 'Set a final price before publishing' using errcode = '22023';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Booking does not exist' using errcode = 'P0002';
  end if;

  if p_expected_updated_at is null
     or v_booking.updated_at is distinct from p_expected_updated_at then
    raise exception 'Pricing changed in another session. Refresh before saving again.'
      using errcode = '40001';
  end if;

  select count(*)
  into v_active_invoice_count
  from public.billing_invoices as invoice
  where invoice.booking_id = p_booking_id
    and invoice.status <> 'VOID';

  if v_active_invoice_count > 0 and (
    v_booking.vendor_amount is distinct from p_vendor_amount
    or v_booking.final_price is distinct from v_final_price
    or v_booking.price_published is distinct from p_price_published
  ) then
    raise exception 'Void active invoices before changing published pricing'
      using errcode = '23514';
  end if;

  select
    coalesce(sum(payment.amount) filter (where payment.kind = 'CLIENT_IN'), 0),
    coalesce(sum(payment.amount) filter (where payment.kind = 'VENDOR_OUT'), 0)
  into v_client_recorded, v_vendor_recorded
  from public.payments as payment
  where payment.booking_id = p_booking_id
    and payment.voided_at is null;

  if v_final_price is null and v_client_recorded > 0 then
    raise exception 'Void unsettled client obligations before clearing pricing'
      using errcode = '23514';
  end if;

  if p_vendor_amount is null and v_vendor_recorded > 0 then
    raise exception 'Void unsettled vendor obligations before clearing pricing'
      using errcode = '23514';
  end if;

  if v_final_price is not null and v_final_price < v_client_recorded then
    raise exception 'Final price cannot be lower than recorded client obligations'
      using errcode = '23514';
  end if;

  if p_vendor_amount is not null and p_vendor_amount < v_vendor_recorded then
    raise exception 'Vendor amount cannot be lower than recorded vendor obligations'
      using errcode = '23514';
  end if;

  update public.bookings
  set
    vendor_amount = p_vendor_amount,
    total_amount = p_vendor_amount,
    final_price = v_final_price,
    price_published = case when v_final_price is null then false else p_price_published end
  where id = p_booking_id
  returning * into v_updated;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  )
  values (
    p_actor_user_id,
    case
      when v_updated.price_published and not v_booking.price_published then 'PRICE_PUBLISH'
      when not v_updated.price_published and v_booking.price_published then 'PRICE_UNPUBLISH'
      else 'PRICE_SET'
    end,
    'booking',
    p_booking_id::text,
    'Booking commercial terms updated under lock',
    pg_catalog.jsonb_build_object(
      'vendorAmount', v_updated.vendor_amount,
      'fee', v_updated.service_fee,
      'finalPrice', v_updated.final_price,
      'published', v_updated.price_published
    )
  );

  return v_updated;
end;
$$;

-- Cloud fixture reset remains possible without granting general-purpose
-- financial DELETE. Every supplied booking must belong to the reserved
-- testing+*@elysiancelebrations.app identity namespace or the call aborts.
create or replace function public.purge_test_booking_financials(
  p_booking_ids uuid[],
  p_actor_user_id text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requested integer;
  v_allowed integer;
  v_deleted integer;
begin
  v_requested := coalesce(cardinality(p_booking_ids), 0);
  if v_requested = 0 then
    return 0;
  end if;

  select count(*)
  into v_allowed
  from public.bookings as booking
  join public.client_profiles as profile on profile.id = booking.client_profile_id
  join public.users as app_user on app_user.id = profile.user_id
  where booking.id = any(p_booking_ids)
    and lower(app_user.email) like 'testing+%@elysiancelebrations.app';

  if v_allowed <> v_requested then
    raise exception 'Financial fixture purge rejected: every booking must belong to a test identity'
      using errcode = '42501';
  end if;

  delete from public.billing_webhook_events as webhook
  using public.billing_payment_attempts as attempt,
        public.billing_invoices as invoice
  where webhook.payment_attempt_id = attempt.id
    and attempt.invoice_id = invoice.id
    and invoice.booking_id = any(p_booking_ids);

  delete from public.billing_refunds as refund
  using public.billing_invoices as invoice
  where refund.invoice_id = invoice.id
    and invoice.booking_id = any(p_booking_ids);

  delete from public.billing_payment_attempts as attempt
  using public.billing_invoices as invoice
  where attempt.invoice_id = invoice.id
    and invoice.booking_id = any(p_booking_ids);

  delete from public.billing_invoices
  where booking_id = any(p_booking_ids);

  delete from public.payments
  where booking_id = any(p_booking_ids);
  get diagnostics v_deleted = row_count;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, summary, meta
  )
  values (
    p_actor_user_id,
    'TEST_FINANCIAL_FIXTURES_PURGED',
    'test_fixture',
    'Test-only financial fixtures purged before deterministic bootstrap',
    pg_catalog.jsonb_build_object(
      'bookingCount', v_requested,
      'paymentCount', v_deleted
    )
  );

  return v_deleted;
end;
$$;

-- Financial history must outlive mutable planning records.
alter table public.payments
  drop constraint if exists payments_client_profile_id_fkey,
  drop constraint if exists payments_vendor_profile_id_fkey,
  drop constraint if exists payments_wedding_id_fkey,
  drop constraint if exists payments_booking_id_fkey;

alter table public.payments
  add constraint payments_client_profile_id_fkey
    foreign key (client_profile_id) references public.client_profiles(id) on delete restrict,
  add constraint payments_vendor_profile_id_fkey
    foreign key (vendor_profile_id) references public.vendor_profiles(id) on delete restrict,
  add constraint payments_wedding_id_fkey
    foreign key (wedding_id) references public.weddings(id) on delete restrict,
  add constraint payments_booking_id_fkey
    foreign key (booking_id) references public.bookings(id) on delete restrict;

alter table public.billing_invoices enable row level security;
alter table public.billing_payment_attempts enable row level security;
alter table public.billing_refunds enable row level security;
alter table public.billing_webhook_events enable row level security;

revoke all privileges on sequence public.billing_invoice_number_seq
  from public, anon, authenticated;
grant usage, select on sequence public.billing_invoice_number_seq to service_role;

revoke all privileges on table public.billing_invoices
  from public, anon, authenticated;
revoke all privileges on table public.billing_payment_attempts
  from public, anon, authenticated;
revoke all privileges on table public.billing_refunds
  from public, anon, authenticated;
revoke all privileges on table public.billing_webhook_events
  from public, anon, authenticated;

-- Application reads may use service_role, but all financial mutations go
-- through the audited security-definer functions below.
revoke insert, update, delete on table public.payments from service_role;
grant select on table public.payments to service_role;
grant select on table public.billing_invoices to service_role;
grant select on table public.billing_payment_attempts to service_role;
grant select on table public.billing_refunds to service_role;
grant select on table public.billing_webhook_events to service_role;

revoke execute on function public.next_billing_invoice_number()
  from public, anon, authenticated;
grant execute on function public.next_billing_invoice_number() to service_role;

revoke execute on function public.issue_booking_invoice(
  uuid, integer, date, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.issue_booking_invoice(
  uuid, integer, date, text, text, text, text
) to service_role;

revoke execute on function public.settle_billing_invoice(
  uuid, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.settle_billing_invoice(
  uuid, text, timestamptz, text, text
) to service_role;

revoke execute on function public.void_billing_invoice(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.void_billing_invoice(uuid, text, text)
  to service_role;

revoke execute on function public.record_billing_refund(
  uuid, integer, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.record_billing_refund(
  uuid, integer, text, text, text, text, text
) to service_role;

revoke execute on function public.set_booking_pricing(
  uuid, integer, integer, boolean, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.set_booking_pricing(
  uuid, integer, integer, boolean, timestamptz, text
) to service_role;

revoke execute on function public.purge_test_booking_financials(uuid[], text)
  from public, anon, authenticated;
grant execute on function public.purge_test_booking_financials(uuid[], text)
  to service_role;

comment on table public.billing_invoices is
  'Client installment obligations linked one-to-one to scheduled CLIENT_IN ledger rows. Amounts are whole INR rupees to match bookings and payments.';

comment on table public.billing_payment_attempts is
  'Provider-neutral checkout attempts. amount_minor is paise for INR. Never store raw card, bank-account, UPI PIN, or checkout payload data.';

comment on table public.billing_refunds is
  'Append-only client refund events. Settled receipts remain in the ledger; processed refunds are netted on billing_invoices.';

comment on table public.billing_webhook_events is
  'Idempotent gateway webhook delivery registry. Stores event identity and payload digest, never the raw payment payload.';
