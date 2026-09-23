-- Calculate revenue-operation totals in one database statement so concurrent
-- invoice writes cannot make a multi-page application-side sum inconsistent.
create or replace function public.admin_billing_summary()
returns table (
  scheduled bigint,
  received bigint,
  refunded bigint,
  net_received bigint,
  outstanding bigint,
  overdue bigint,
  issued_count bigint,
  paid_count bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    coalesce(sum(invoice.amount) filter (where invoice.status <> 'VOID'), 0)::bigint,
    coalesce(sum(invoice.amount) filter (
      where invoice.status in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
    ), 0)::bigint,
    coalesce(sum(invoice.refunded_amount) filter (where invoice.status <> 'VOID'), 0)::bigint,
    greatest(
      0,
      coalesce(sum(invoice.amount) filter (
        where invoice.status in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
      ), 0) -
      coalesce(sum(invoice.refunded_amount) filter (where invoice.status <> 'VOID'), 0)
    )::bigint,
    coalesce(sum(invoice.amount) filter (where invoice.status = 'ISSUED'), 0)::bigint,
    coalesce(sum(invoice.amount) filter (
      where invoice.status = 'ISSUED'
        and invoice.due_date < (pg_catalog.now() at time zone 'Asia/Kolkata')::date
    ), 0)::bigint,
    count(*) filter (where invoice.status = 'ISSUED')::bigint,
    count(*) filter (
      where invoice.status in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
    )::bigint
  from public.billing_invoices as invoice;
$$;

revoke all on function public.admin_billing_summary() from public, anon, authenticated;
grant execute on function public.admin_billing_summary() to service_role;
