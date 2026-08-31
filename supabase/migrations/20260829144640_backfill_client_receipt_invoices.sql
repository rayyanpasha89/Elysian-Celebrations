-- Every historical client receipt or schedule now receives an invoice wrapper,
-- so the old ledger cannot remain a parallel, invoice-less billing path.

update public.payments
set due_date = coalesce(paid_at::date, created_at::date, current_date)
where kind = 'CLIENT_IN'
  and booking_id is not null
  and client_profile_id is not null
  and due_date is null;

with existing_max as (
  select booking_id, coalesce(max(installment_number), 0) as max_installment
  from public.billing_invoices
  group by booking_id
), candidates as (
  select
    payment.*,
    row_number() over (
      partition by payment.booking_id
      order by payment.created_at, payment.id
    ) as candidate_number
  from public.payments as payment
  where payment.kind = 'CLIENT_IN'
    and payment.booking_id is not null
    and payment.client_profile_id is not null
    and payment.due_date is not null
    and not exists (
      select 1
      from public.billing_invoices as invoice
      where invoice.payment_id = payment.id
    )
)
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
  issued_at,
  created_by,
  created_at,
  updated_at
)
select
  candidate.booking_id,
  candidate.id,
  'legacy-payment:' || candidate.id::text,
  candidate.client_profile_id,
  candidate.wedding_id,
  coalesce(existing.max_installment, 0) + candidate.candidate_number::integer,
  coalesce(nullif(left(btrim(candidate.label), 160), ''), 'Historical payment'),
  null,
  candidate.amount,
  candidate.due_date,
  candidate.created_at,
  'migration:20260829144640',
  candidate.created_at,
  greatest(candidate.updated_at, candidate.created_at)
from candidates as candidate
left join existing_max as existing on existing.booking_id = candidate.booking_id;

comment on column public.billing_invoices.idempotency_key is
  'Booking-scoped retry key. Historical rows use legacy-payment:<payment UUID>; new issuance uses a caller UUID.';
