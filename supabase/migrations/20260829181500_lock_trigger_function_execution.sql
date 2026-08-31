-- Trigger helpers are internal database machinery, not browser RPCs. They keep
-- working when attached to their triggers after direct EXECUTE is revoked.
revoke execute on function public.guard_invoiced_payment_context()
  from public, anon, authenticated, service_role;
revoke execute on function public.sync_billing_invoice_context()
  from public, anon, authenticated, service_role;
revoke execute on function public.sync_invoice_from_payment()
  from public, anon, authenticated, service_role;
revoke execute on function public.sync_payment_booking_context()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_billing_payment_attempt()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_billing_refund_context()
  from public, anon, authenticated, service_role;
revoke execute on function public.validate_wedding_event_venue()
  from public, anon, authenticated, service_role;
