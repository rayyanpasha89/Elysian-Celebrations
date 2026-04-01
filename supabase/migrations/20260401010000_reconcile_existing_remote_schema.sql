-- Reconcile databases that were initialized from the pre-migration schema.
-- Safe on both fresh databases and partially bootstrapped remote databases.

create table if not exists saved_vendors (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_profile_id, vendor_profile_id)
);

create table if not exists vendor_profile_views (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  viewer_user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);
