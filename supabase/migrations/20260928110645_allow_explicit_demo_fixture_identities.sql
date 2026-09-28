alter table public.users
  add column if not exists is_test_fixture boolean not null default false;

comment on column public.users.is_test_fixture is
  'Server-managed marker for deterministic QA/demo identities. Never client writable.';

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
    and (
      lower(app_user.email) like 'testing+%@elysiancelebrations.app'
      or app_user.is_test_fixture
    );

  if v_allowed <> v_requested then
    raise exception 'Financial fixture purge rejected: every booking must belong to an approved test identity'
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
    'Approved test-only financial fixtures purged before deterministic bootstrap',
    pg_catalog.jsonb_build_object(
      'bookingCount', v_requested,
      'paymentCount', v_deleted
    )
  );

  return v_deleted;
end;
$$;

revoke execute on function public.purge_test_booking_financials(uuid[], text)
  from public, anon, authenticated;
grant execute on function public.purge_test_booking_financials(uuid[], text)
  to service_role;
