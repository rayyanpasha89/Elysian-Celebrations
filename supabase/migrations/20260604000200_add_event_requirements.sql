create table if not exists wedding_event_requirements (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  category text not null,
  title text not null default 'Requirement',
  status text not null default 'DRAFT',
  priority text not null default 'NORMAL',
  vendor_profile_id uuid references vendor_profiles(id) on delete set null,
  vendor_service_id uuid references vendor_services(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wedding_event_requirements_event
  on wedding_event_requirements(wedding_event_id, sort_order);

create index if not exists idx_wedding_event_requirements_category
  on wedding_event_requirements(category);

create index if not exists idx_wedding_event_requirements_vendor
  on wedding_event_requirements(vendor_profile_id);

drop trigger if exists tr_wedding_event_requirements_updated on wedding_event_requirements;
create trigger tr_wedding_event_requirements_updated
  before update on wedding_event_requirements
  for each row execute function update_updated_at();
