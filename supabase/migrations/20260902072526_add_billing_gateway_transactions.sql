-- Provider-neutral checkout lifecycle. These functions do not activate a
-- payment provider; they make the eventual adapter retry-safe, ownership-aware,
-- replay-safe, and atomic with the existing invoice/payment ledger.

alter table public.billing_payment_attempts
  drop constraint if exists billing_payment_attempts_provider_identifiers_valid;
alter table public.billing_payment_attempts
  add constraint billing_payment_attempts_provider_identifiers_valid check (
    (provider_order_id is null or char_length(provider_order_id) <= 200)
    and (provider_payment_id is null or char_length(provider_payment_id) <= 200)
  );

alter table public.billing_payment_attempts
  drop constraint if exists billing_payment_attempts_metadata_size;
alter table public.billing_payment_attempts
  add constraint billing_payment_attempts_metadata_size
    check (octet_length(metadata::text) <= 4096);

create unique index if not exists billing_payment_attempts_one_active_provider
  on public.billing_payment_attempts(invoice_id, provider)
  where status in ('CREATED', 'PENDING', 'AUTHORIZED');

create or replace function public.begin_billing_checkout(
  p_actor_user_id text,
  p_invoice_id uuid,
  p_provider text,
  p_idempotency_key text
)
returns public.billing_payment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.billing_invoices;
  v_attempt public.billing_payment_attempts;
  v_provider text;
  v_idempotency_key text;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  if p_invoice_id is null then
    raise exception 'invoice id is required' using errcode = '22004';
  end if;

  v_provider := pg_catalog.upper(
    nullif(left(pg_catalog.btrim(coalesce(p_provider, '')), 32), '')
  );
  if v_provider is null then
    raise exception 'billing provider is required' using errcode = '22023';
  end if;

  v_idempotency_key := nullif(
    left(pg_catalog.btrim(coalesce(p_idempotency_key, '')), 160),
    ''
  );
  if v_idempotency_key is null then
    raise exception 'checkout idempotency key is required'
      using errcode = '22023';
  end if;

  select invoice.*
  into v_invoice
  from public.billing_invoices as invoice
  join public.client_profiles as client
    on client.id = invoice.client_profile_id
  where invoice.id = p_invoice_id
    and client.user_id = p_actor_user_id
  for update of invoice;

  if not found then
    raise exception 'invoice not found for actor' using errcode = '42501';
  end if;

  if v_invoice.status <> 'ISSUED' then
    raise exception 'only an issued invoice can start checkout'
      using errcode = '55000';
  end if;

  update public.billing_payment_attempts as attempt
  set status = 'CANCELLED',
      updated_at = pg_catalog.now()
  where attempt.invoice_id = p_invoice_id
    and attempt.provider = v_provider
    and attempt.status in ('CREATED', 'PENDING', 'AUTHORIZED')
    and attempt.checkout_expires_at <= pg_catalog.now();

  select attempt.*
  into v_attempt
  from public.billing_payment_attempts as attempt
  where attempt.invoice_id = p_invoice_id
    and attempt.provider = v_provider
    and attempt.status in ('CREATED', 'PENDING', 'AUTHORIZED')
  order by attempt.created_at desc
  limit 1
  for update;

  if found then
    return v_attempt;
  end if;

  select attempt.*
  into v_attempt
  from public.billing_payment_attempts as attempt
  where attempt.provider = v_provider
    and attempt.idempotency_key = v_idempotency_key
  for update;

  if found then
    if v_attempt.invoice_id <> p_invoice_id then
      raise exception 'checkout idempotency key belongs to another invoice'
        using errcode = '23514';
    end if;
    return v_attempt;
  end if;

  insert into public.billing_payment_attempts (
    invoice_id,
    provider,
    idempotency_key,
    status,
    amount_minor,
    currency,
    checkout_expires_at
  ) values (
    p_invoice_id,
    v_provider,
    v_idempotency_key,
    'CREATED',
    v_invoice.amount::bigint * 100,
    v_invoice.currency,
    pg_catalog.now() + interval '10 minutes'
  )
  returning * into v_attempt;

  insert into public.admin_audit_log (
    actor_user_id, action, entity_type, entity_id, summary, meta
  ) values (
    p_actor_user_id,
    'BILLING_CHECKOUT_STARTED',
    'billing_payment_attempt',
    v_attempt.id::text,
    'Checkout started for invoice ' || v_invoice.invoice_number,
    pg_catalog.jsonb_build_object(
      'invoiceId', p_invoice_id,
      'invoiceNumber', v_invoice.invoice_number,
      'provider', v_provider,
      'amountMinor', v_attempt.amount_minor
    )
  );

  return v_attempt;
end;
$$;

create or replace function public.attach_billing_checkout_order(
  p_actor_user_id text,
  p_attempt_id uuid,
  p_provider_order_id text,
  p_checkout_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.billing_payment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.billing_payment_attempts;
  v_provider_order_id text;
  v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_expiry timestamptz;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  v_provider_order_id := nullif(
    left(pg_catalog.btrim(coalesce(p_provider_order_id, '')), 200),
    ''
  );
  if v_provider_order_id is null then
    raise exception 'provider order id is required' using errcode = '22023';
  end if;

  if pg_catalog.jsonb_typeof(v_metadata) <> 'object'
     or pg_catalog.octet_length(v_metadata::text) > 4096 then
    raise exception 'checkout metadata must be a small object'
      using errcode = '22023';
  end if;

  v_expiry := coalesce(p_checkout_expires_at, pg_catalog.now() + interval '20 minutes');
  if v_expiry <= pg_catalog.now()
     or v_expiry > pg_catalog.now() + interval '7 days' then
    raise exception 'checkout expiry is outside the supported range'
      using errcode = '22023';
  end if;

  select attempt.*
  into v_attempt
  from public.billing_payment_attempts as attempt
  join public.billing_invoices as invoice on invoice.id = attempt.invoice_id
  join public.client_profiles as client on client.id = invoice.client_profile_id
  where attempt.id = p_attempt_id
    and client.user_id = p_actor_user_id
  for update of attempt;

  if not found then
    raise exception 'checkout attempt not found for actor' using errcode = '42501';
  end if;

  if v_attempt.status in ('CAPTURED', 'FAILED', 'CANCELLED') then
    if v_attempt.provider_order_id = v_provider_order_id then
      return v_attempt;
    end if;
    raise exception 'a terminal checkout attempt cannot be replaced'
      using errcode = '23514';
  end if;

  if v_attempt.provider_order_id is not null
     and v_attempt.provider_order_id <> v_provider_order_id then
    raise exception 'checkout attempt already has a different provider order'
      using errcode = '23514';
  end if;

  update public.billing_payment_attempts
  set provider_order_id = v_provider_order_id,
      status = 'PENDING',
      checkout_expires_at = v_expiry,
      metadata = v_metadata,
      failure_code = null,
      failure_message = null,
      failed_at = null
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.fail_billing_checkout_attempt(
  p_actor_user_id text,
  p_attempt_id uuid,
  p_failure_code text default null,
  p_failure_message text default null
)
returns public.billing_payment_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.billing_payment_attempts;
begin
  if nullif(pg_catalog.btrim(p_actor_user_id), '') is null then
    raise exception 'actor user id is required' using errcode = '22004';
  end if;

  select attempt.*
  into v_attempt
  from public.billing_payment_attempts as attempt
  join public.billing_invoices as invoice on invoice.id = attempt.invoice_id
  join public.client_profiles as client on client.id = invoice.client_profile_id
  where attempt.id = p_attempt_id
    and client.user_id = p_actor_user_id
  for update of attempt;

  if not found then
    raise exception 'checkout attempt not found for actor' using errcode = '42501';
  end if;

  if v_attempt.status in ('CAPTURED', 'FAILED', 'CANCELLED') then
    return v_attempt;
  end if;

  update public.billing_payment_attempts
  set status = 'FAILED',
      failure_code = nullif(
        left(pg_catalog.btrim(coalesce(p_failure_code, '')), 120),
        ''
      ),
      failure_message = nullif(
        left(pg_catalog.btrim(coalesce(p_failure_message, '')), 500),
        ''
      ),
      failed_at = pg_catalog.now()
  where id = p_attempt_id
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.process_billing_gateway_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_payload_sha256 text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_status text,
  p_occurred_at timestamptz default null,
  p_failure_code text default null,
  p_failure_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider text;
  v_provider_event_id text;
  v_event_type text;
  v_payload_sha256 text;
  v_provider_order_id text;
  v_provider_payment_id text;
  v_status text;
  v_attempt public.billing_payment_attempts;
  v_webhook public.billing_webhook_events;
  v_occurred_at timestamptz;
  v_error text;
begin
  v_provider := pg_catalog.upper(
    nullif(left(pg_catalog.btrim(coalesce(p_provider, '')), 32), '')
  );
  v_provider_event_id := nullif(
    left(pg_catalog.btrim(coalesce(p_provider_event_id, '')), 200),
    ''
  );
  v_event_type := nullif(
    left(pg_catalog.btrim(coalesce(p_event_type, '')), 160),
    ''
  );
  v_payload_sha256 := pg_catalog.lower(
    pg_catalog.btrim(coalesce(p_payload_sha256, ''))
  );
  v_provider_order_id := nullif(
    left(pg_catalog.btrim(coalesce(p_provider_order_id, '')), 200),
    ''
  );
  v_provider_payment_id := nullif(
    left(pg_catalog.btrim(coalesce(p_provider_payment_id, '')), 200),
    ''
  );
  v_status := pg_catalog.upper(pg_catalog.btrim(coalesce(p_status, '')));
  v_occurred_at := least(
    coalesce(p_occurred_at, pg_catalog.now()),
    pg_catalog.now() + interval '5 minutes'
  );

  if v_provider is null
     or v_provider_event_id is null
     or v_event_type is null
     or v_payload_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'gateway event identity is invalid' using errcode = '22023';
  end if;

  if v_status not in ('CAPTURED', 'FAILED', 'IGNORED') then
    raise exception 'gateway event status is invalid' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_provider || ':' || v_provider_event_id, 0)
  );

  select webhook.*
  into v_webhook
  from public.billing_webhook_events as webhook
  where webhook.provider = v_provider
    and webhook.provider_event_id = v_provider_event_id
  for update;

  if found then
    if v_webhook.payload_sha256 <> v_payload_sha256
       or v_webhook.event_type <> v_event_type then
      raise exception 'webhook replay identity has a different payload'
        using errcode = '23514';
    end if;

    update public.billing_webhook_events
    set delivery_count = delivery_count + 1
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', v_webhook.payment_attempt_id
    );
  end if;

  if v_provider_order_id is not null then
    select attempt.*
    into v_attempt
    from public.billing_payment_attempts as attempt
    where attempt.provider = v_provider
      and attempt.provider_order_id = v_provider_order_id
    for update;
  end if;

  insert into public.billing_webhook_events (
    provider,
    provider_event_id,
    event_type,
    payload_sha256,
    payment_attempt_id,
    status
  ) values (
    v_provider,
    v_provider_event_id,
    v_event_type,
    v_payload_sha256,
    v_attempt.id,
    'RECEIVED'
  )
  returning * into v_webhook;

  if v_status = 'IGNORED' then
    update public.billing_webhook_events
    set status = 'IGNORED', processed_at = pg_catalog.now()
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', v_webhook.payment_attempt_id
    );
  end if;

  if v_attempt.id is null then
    update public.billing_webhook_events
    set status = 'FAILED',
        last_error = 'No checkout attempt matches the provider order',
        processed_at = pg_catalog.now()
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'duplicate', false,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', null,
      'reason', 'ATTEMPT_NOT_FOUND'
    );
  end if;

  if v_provider_payment_id is not null
     and v_attempt.provider_payment_id is not null
     and v_attempt.provider_payment_id <> v_provider_payment_id then
    update public.billing_webhook_events
    set status = 'FAILED',
        last_error = 'Provider payment identity conflicts with the checkout attempt',
        processed_at = pg_catalog.now()
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'duplicate', false,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', v_attempt.id,
      'reason', 'PAYMENT_ID_CONFLICT'
    );
  end if;

  if v_status = 'FAILED' then
    if v_attempt.status = 'CAPTURED' then
      update public.billing_webhook_events
      set status = 'IGNORED',
          last_error = 'Late failure ignored after capture',
          processed_at = pg_catalog.now()
      where id = v_webhook.id
      returning * into v_webhook;
    else
      update public.billing_payment_attempts
      set status = 'FAILED',
          provider_payment_id = coalesce(
            v_provider_payment_id,
            provider_payment_id
          ),
          failure_code = nullif(
            left(pg_catalog.btrim(coalesce(p_failure_code, '')), 120),
            ''
          ),
          failure_message = nullif(
            left(pg_catalog.btrim(coalesce(p_failure_message, '')), 500),
            ''
          ),
          failed_at = v_occurred_at
      where id = v_attempt.id;

      update public.billing_webhook_events
      set status = 'PROCESSED', processed_at = pg_catalog.now()
      where id = v_webhook.id
      returning * into v_webhook;
    end if;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', v_attempt.id
    );
  end if;

  begin
    update public.billing_payment_attempts
    set status = 'CAPTURED',
        provider_payment_id = coalesce(
          v_provider_payment_id,
          provider_payment_id
        ),
        captured_at = v_occurred_at,
        failure_code = null,
        failure_message = null,
        failed_at = null
    where id = v_attempt.id;

    perform public.settle_billing_invoice(
      v_attempt.invoice_id,
      'OTHER',
      v_occurred_at,
      coalesce(v_provider_payment_id, v_provider_order_id),
      'billing-webhook:' || v_provider
    );
  exception when others then
    v_error := left(SQLERRM, 1000);
    update public.billing_webhook_events
    set status = 'FAILED',
        last_error = v_error,
        processed_at = pg_catalog.now()
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'duplicate', false,
      'webhookId', v_webhook.id,
      'status', v_webhook.status,
      'attemptId', v_attempt.id,
      'reason', 'SETTLEMENT_FAILED'
    );
  end;

  update public.billing_webhook_events
  set status = 'PROCESSED', processed_at = pg_catalog.now()
  where id = v_webhook.id
  returning * into v_webhook;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'webhookId', v_webhook.id,
    'status', v_webhook.status,
    'attemptId', v_attempt.id
  );
end;
$$;

revoke execute on function public.begin_billing_checkout(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.begin_billing_checkout(text, uuid, text, text)
  to service_role;

revoke execute on function public.attach_billing_checkout_order(
  text, uuid, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.attach_billing_checkout_order(
  text, uuid, text, timestamptz, jsonb
) to service_role;

revoke execute on function public.fail_billing_checkout_attempt(
  text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.fail_billing_checkout_attempt(
  text, uuid, text, text
) to service_role;

revoke execute on function public.process_billing_gateway_event(
  text, text, text, text, text, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.process_billing_gateway_event(
  text, text, text, text, text, text, text, timestamptz, text, text
) to service_role;
