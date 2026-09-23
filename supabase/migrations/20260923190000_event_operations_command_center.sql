-- Elysian employees remain MANAGER users at the portal boundary. These tables
-- add the finer event-scoped authorization and live-delivery state required by
-- the Operations Portal without exposing internal records to browser roles.

create table public.operations_staff_profiles (
  user_id text primary key references public.users(id) on delete cascade,
  role_template text not null,
  job_title text,
  phone text,
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_staff_role_template_valid check (
    role_template in ('OPS_LEAD', 'COORDINATOR', 'COMMUNICATIONS', 'FINANCE', 'VIEWER')
  ),
  constraint operations_staff_job_title_length check (
    job_title is null or char_length(job_title) <= 120
  ),
  constraint operations_staff_phone_length check (
    phone is null or char_length(phone) <= 40
  ),
  constraint operations_staff_permissions_count check (
    cardinality(permissions) <= 20
  )
);

create table public.event_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  staff_user_id text not null references public.operations_staff_profiles(user_id) on delete cascade,
  event_role text,
  permissions text[],
  shift_start timestamptz,
  shift_end timestamptz,
  notes text,
  is_active boolean not null default true,
  assigned_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_staff_assignment_unique unique (wedding_id, staff_user_id),
  constraint event_staff_role_length check (
    event_role is null or char_length(event_role) <= 120
  ),
  constraint event_staff_permissions_count check (
    permissions is null or cardinality(permissions) <= 20
  ),
  constraint event_staff_shift_valid check (
    shift_start is null or shift_end is null or shift_end > shift_start
  ),
  constraint event_staff_notes_length check (
    notes is null or char_length(notes) <= 1000
  )
);

create unique index if not exists wedding_events_id_wedding_unique
  on public.wedding_events(id, wedding_id);

create table public.event_operations_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  wedding_event_id uuid,
  kind text not null default 'UPDATE',
  severity text not null default 'INFO',
  status text not null default 'OPEN',
  title text not null,
  body text,
  assignee_user_id text references public.operations_staff_profiles(user_id) on delete set null,
  reported_by text not null,
  due_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by text,
  resolved_at timestamptz,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_operations_event_fk
    foreign key (wedding_event_id, wedding_id)
    references public.wedding_events(id, wedding_id)
    on delete cascade,
  constraint event_operations_kind_valid check (
    kind in ('UPDATE', 'INCIDENT', 'DECISION', 'ESCALATION')
  ),
  constraint event_operations_severity_valid check (
    severity in ('INFO', 'WATCH', 'URGENT', 'CRITICAL')
  ),
  constraint event_operations_status_valid check (
    status in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')
  ),
  constraint event_operations_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint event_operations_body_length check (
    body is null or char_length(body) <= 4000
  ),
  constraint event_operations_resolution_valid check (
    (
      status = 'RESOLVED'
      and resolved_at is not null
      and resolved_by is not null
    )
    or
    (
      status <> 'RESOLVED'
      and resolved_at is null
      and resolved_by is null
    )
  )
);

create index event_staff_assignments_staff_active_idx
  on public.event_staff_assignments(staff_user_id, is_active, wedding_id);
create index event_staff_assignments_event_active_idx
  on public.event_staff_assignments(wedding_id, is_active, staff_user_id);
create index event_operations_items_event_status_idx
  on public.event_operations_items(wedding_id, status, severity, created_at desc);
create index event_operations_items_function_idx
  on public.event_operations_items(wedding_event_id, created_at desc)
  where wedding_event_id is not null;

create trigger tr_operations_staff_profiles_updated
  before update on public.operations_staff_profiles
  for each row execute function public.update_updated_at();
create trigger tr_event_staff_assignments_updated
  before update on public.event_staff_assignments
  for each row execute function public.update_updated_at();
create trigger tr_event_operations_items_updated
  before update on public.event_operations_items
  for each row execute function public.update_updated_at();

create or replace function public.validate_event_operations_assignee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assignee_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.event_staff_assignments assignment
    join public.operations_staff_profiles profile
      on profile.user_id = assignment.staff_user_id
    where assignment.wedding_id = new.wedding_id
      and assignment.staff_user_id = new.assignee_user_id
      and assignment.is_active
      and profile.is_active
  ) then
    raise exception 'Assignee is not active on this event'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tr_event_operations_assignee
  before insert or update of wedding_id, assignee_user_id
  on public.event_operations_items
  for each row execute function public.validate_event_operations_assignee();

alter table public.operations_staff_profiles enable row level security;
alter table public.event_staff_assignments enable row level security;
alter table public.event_operations_items enable row level security;

revoke all on table public.operations_staff_profiles from public, anon, authenticated;
revoke all on table public.event_staff_assignments from public, anon, authenticated;
revoke all on table public.event_operations_items from public, anon, authenticated;

grant select, insert, update, delete on table public.operations_staff_profiles to service_role;
grant select, insert, update, delete on table public.event_staff_assignments to service_role;
grant select, insert, update, delete on table public.event_operations_items to service_role;

revoke execute on function public.validate_event_operations_assignee()
  from public, anon, authenticated, service_role;
