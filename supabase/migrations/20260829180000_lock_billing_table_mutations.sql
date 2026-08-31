-- The application service role may read billing records, but every financial
-- mutation must cross an audited security-definer RPC. Supabase's default
-- table grants include service_role, so revoke them explicitly.
revoke all privileges on sequence public.billing_invoice_number_seq
  from service_role;

revoke all privileges on table public.billing_invoices
  from service_role;
revoke all privileges on table public.billing_payment_attempts
  from service_role;
revoke all privileges on table public.billing_refunds
  from service_role;
revoke all privileges on table public.billing_webhook_events
  from service_role;

grant select on table public.billing_invoices to service_role;
grant select on table public.billing_payment_attempts to service_role;
grant select on table public.billing_refunds to service_role;
grant select on table public.billing_webhook_events to service_role;
