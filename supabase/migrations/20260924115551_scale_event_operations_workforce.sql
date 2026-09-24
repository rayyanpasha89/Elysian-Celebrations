-- Keep event access membership separate from event-day scheduling. A person may
-- belong to one event once, then work several non-overlapping shifts across
-- functions, departments, and physical zones.

create extension if not exists btree_gist with schema extensions;

create unique index event_staff_assignments_id_event_unique
  on public.event_staff_assignments(id, wedding_id);

create table public.event_operations_departments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  code text not null,
  color text not null default '#656d4a',
  lead_assignment_id uuid,
  sort_order integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_operations_department_name_valid check (
    btrim(name) <> '' and char_length(name) <= 100
  ),
  constraint event_operations_department_code_valid check (
    code ~ '^[A-Z0-9_-]{2,20}$'
  ),
  constraint event_operations_department_color_valid check (
    color ~ '^#[0-9a-fA-F]{6}$'
  ),
  constraint event_operations_department_unique unique (wedding_id, code),
  constraint event_operations_department_id_event_unique unique (id, wedding_id),
  constraint event_operations_department_lead_fk
    foreign key (lead_assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete set null
);

create table public.event_operations_zones (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  code text not null,
  capacity integer,
  meeting_point text,
  emergency_notes text,
  sort_order integer not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_operations_zone_name_valid check (
    btrim(name) <> '' and char_length(name) <= 120
  ),
  constraint event_operations_zone_code_valid check (
    code ~ '^[A-Z0-9_-]{2,20}$'
  ),
  constraint event_operations_zone_capacity_valid check (
    capacity is null or capacity between 1 and 100000
  ),
  constraint event_operations_zone_meeting_point_length check (
    meeting_point is null or char_length(meeting_point) <= 300
  ),
  constraint event_operations_zone_emergency_notes_length check (
    emergency_notes is null or char_length(emergency_notes) <= 1000
  ),
  constraint event_operations_zone_unique unique (wedding_id, code),
  constraint event_operations_zone_id_event_unique unique (id, wedding_id)
);

create table public.event_crew_shifts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  assignment_id uuid not null,
  wedding_event_id uuid,
  department_id uuid,
  zone_id uuid,
  supervisor_assignment_id uuid,
  role_label text not null,
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  status text not null default 'PLANNED',
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  handoff_notes text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_crew_shift_assignment_fk
    foreign key (assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete cascade,
  constraint event_crew_shift_function_fk
    foreign key (wedding_event_id, wedding_id)
    references public.wedding_events(id, wedding_id)
    on delete cascade,
  constraint event_crew_shift_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null,
  constraint event_crew_shift_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null,
  constraint event_crew_shift_supervisor_fk
    foreign key (supervisor_assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete set null,
  constraint event_crew_shift_role_valid check (
    btrim(role_label) <> '' and char_length(role_label) <= 120
  ),
  constraint event_crew_shift_window_valid check (shift_end > shift_start),
  constraint event_crew_shift_status_valid check (
    status in ('PLANNED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED')
  ),
  constraint event_crew_shift_checkin_valid check (
    (status = 'CHECKED_IN' and checked_in_at is not null and checked_out_at is null)
    or (status = 'CHECKED_OUT' and checked_in_at is not null and checked_out_at is not null)
    or (status in ('PLANNED', 'NO_SHOW', 'CANCELLED') and checked_out_at is null)
  ),
  constraint event_crew_shift_handoff_length check (
    handoff_notes is null or char_length(handoff_notes) <= 2000
  ),
  constraint event_crew_shift_no_overlap exclude using gist (
    assignment_id with =,
    tstzrange(shift_start, shift_end, '[)') with &&
  ) where (status <> 'CANCELLED')
);

create table public.event_operations_briefings (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  wedding_event_id uuid,
  department_id uuid,
  zone_id uuid,
  title text not null,
  body text not null,
  priority text not null default 'NORMAL',
  requires_acknowledgement boolean not null default true,
  published_by text not null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_operations_briefing_id_event_unique unique (id, wedding_id),
  constraint event_operations_briefing_function_fk
    foreign key (wedding_event_id, wedding_id)
    references public.wedding_events(id, wedding_id)
    on delete cascade,
  constraint event_operations_briefing_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null,
  constraint event_operations_briefing_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null,
  constraint event_operations_briefing_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint event_operations_briefing_body_valid check (
    btrim(body) <> '' and char_length(body) <= 8000
  ),
  constraint event_operations_briefing_priority_valid check (
    priority in ('NORMAL', 'HIGH', 'CRITICAL')
  ),
  constraint event_operations_briefing_expiry_valid check (
    expires_at is null or expires_at > published_at
  )
);

create table public.event_operations_briefing_reads (
  wedding_id uuid not null,
  briefing_id uuid not null,
  assignment_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  primary key (briefing_id, assignment_id),
  constraint event_operations_briefing_read_briefing_fk
    foreign key (briefing_id, wedding_id)
    references public.event_operations_briefings(id, wedding_id)
    on delete cascade,
  constraint event_operations_briefing_read_assignment_fk
    foreign key (assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete cascade
);

alter table public.event_operations_items
  add column department_id uuid,
  add column zone_id uuid,
  add constraint event_operations_item_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null,
  add constraint event_operations_item_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null;

create index event_operations_departments_event_idx
  on public.event_operations_departments(wedding_id, sort_order, name);
create index event_operations_zones_event_idx
  on public.event_operations_zones(wedding_id, sort_order, name);
create index event_crew_shifts_event_window_idx
  on public.event_crew_shifts(wedding_id, shift_start, shift_end, status);
create index event_crew_shifts_department_idx
  on public.event_crew_shifts(department_id, status, shift_start)
  where department_id is not null;
create index event_crew_shifts_zone_idx
  on public.event_crew_shifts(zone_id, status, shift_start)
  where zone_id is not null;
create index event_operations_briefings_event_idx
  on public.event_operations_briefings(wedding_id, published_at desc);
create index event_operations_briefing_reads_assignment_idx
  on public.event_operations_briefing_reads(assignment_id, acknowledged_at desc);

create trigger tr_event_operations_departments_updated
  before update on public.event_operations_departments
  for each row execute function public.update_updated_at();
create trigger tr_event_operations_zones_updated
  before update on public.event_operations_zones
  for each row execute function public.update_updated_at();
create trigger tr_event_crew_shifts_updated
  before update on public.event_crew_shifts
  for each row execute function public.update_updated_at();
create trigger tr_event_operations_briefings_updated
  before update on public.event_operations_briefings
  for each row execute function public.update_updated_at();

alter table public.event_operations_departments enable row level security;
alter table public.event_operations_zones enable row level security;
alter table public.event_crew_shifts enable row level security;
alter table public.event_operations_briefings enable row level security;
alter table public.event_operations_briefing_reads enable row level security;

revoke all on table public.event_operations_departments from public, anon, authenticated;
revoke all on table public.event_operations_zones from public, anon, authenticated;
revoke all on table public.event_crew_shifts from public, anon, authenticated;
revoke all on table public.event_operations_briefings from public, anon, authenticated;
revoke all on table public.event_operations_briefing_reads from public, anon, authenticated;

grant select, insert, update, delete on table public.event_operations_departments to service_role;
grant select, insert, update, delete on table public.event_operations_zones to service_role;
grant select, insert, update, delete on table public.event_crew_shifts to service_role;
grant select, insert, update, delete on table public.event_operations_briefings to service_role;
grant select, insert, update, delete on table public.event_operations_briefing_reads to service_role;
