-- Keep retry-safe settlement while rejecting impossible post-refund state changes.
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

  if v_invoice.status in ('PARTIALLY_REFUNDED', 'REFUNDED') then
    raise exception 'A refunded invoice cannot be settled again'
      using errcode = '23514';
  end if;

  -- A retry after a successful manual settlement returns the canonical row.
  if v_invoice.status = 'PAID' then
    return v_invoice;
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

  if v_invoice.status in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED') then
    raise exception 'A settled invoice must be refunded, not voided'
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
