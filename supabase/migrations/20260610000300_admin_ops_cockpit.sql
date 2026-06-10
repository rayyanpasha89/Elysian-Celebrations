-- Admin ops cockpit foundation: staged negotiation log, a payments ledger
-- (client collections IN + vendor payouts OUT), and an audit trail.

-- Staged negotiation per vendor pick (Quoted -> Countered -> Agreed).
create table if not exists public.negotiation_entries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stage text not null default 'QUOTED',
  amount integer,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists negotiation_entries_booking_idx
  on public.negotiation_entries(booking_id, created_at);

-- Money flow: CLIENT_IN milestones (custom per client) + VENDOR_OUT payouts.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null, -- 'CLIENT_IN' | 'VENDOR_OUT'
  client_profile_id uuid references public.client_profiles(id) on delete cascade,
  vendor_profile_id uuid references public.vendor_profiles(id) on delete set null,
  wedding_id uuid references public.weddings(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  label text,
  amount integer not null default 0,
  due_date date,
  is_paid boolean not null default false,
  paid_at timestamptz,
  method text, -- 'UPI' | 'BANK' | 'CASH' | 'CARD'
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists payments_client_idx on public.payments(client_profile_id);
create index if not exists payments_vendor_idx on public.payments(vendor_profile_id);

-- Who changed what & when (prices, negotiation, payments).
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text,
  action text not null,
  entity_type text,
  entity_id text,
  summary text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log(created_at desc);
