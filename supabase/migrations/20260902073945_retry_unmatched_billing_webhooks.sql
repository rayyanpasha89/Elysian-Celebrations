-- A capture can arrive before the checkout route finishes attaching the
-- provider order. Allow FAILED/RECEIVED deliveries to be retried with the same
-- verified identity while keeping completed and ignored events idempotent.

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
  v_is_replay boolean := false;
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

    if v_webhook.status in ('PROCESSED', 'IGNORED') then
      return pg_catalog.jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'webhookId', v_webhook.id,
        'status', v_webhook.status,
        'attemptId', v_webhook.payment_attempt_id
      );
    end if;

    v_is_replay := true;
  end if;

  if v_provider_order_id is not null then
    select attempt.*
    into v_attempt
    from public.billing_payment_attempts as attempt
    where attempt.provider = v_provider
      and attempt.provider_order_id = v_provider_order_id
    for update;
  end if;

  if v_is_replay then
    update public.billing_webhook_events
    set payment_attempt_id = v_attempt.id,
        status = 'RECEIVED',
        last_error = null,
        processed_at = null
    where id = v_webhook.id
    returning * into v_webhook;
  else
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
  end if;

  if v_status = 'IGNORED' then
    update public.billing_webhook_events
    set status = 'IGNORED', processed_at = pg_catalog.now()
    where id = v_webhook.id
    returning * into v_webhook;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'duplicate', v_is_replay,
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
      'duplicate', v_is_replay,
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
      'duplicate', v_is_replay,
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
      'duplicate', v_is_replay,
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
      'duplicate', v_is_replay,
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
    'duplicate', v_is_replay,
    'webhookId', v_webhook.id,
    'status', v_webhook.status,
    'attemptId', v_attempt.id
  );
end;
$$;

revoke execute on function public.process_billing_gateway_event(
  text, text, text, text, text, text, text, timestamptz, text, text
) from public, anon, authenticated;
grant execute on function public.process_billing_gateway_event(
  text, text, text, text, text, text, text, timestamptz, text, text
) to service_role;
