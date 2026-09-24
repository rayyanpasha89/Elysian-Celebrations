-- Shared production records replace disconnected event spreadsheets while
-- preserving event scope, sensitive-document boundaries, and immutable change
-- history. Browser roles do not access these tables directly.

create table public.event_production_records (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  wedding_event_id uuid,
  record_type text not null,
  title text not null,
  description text,
  status text not null default 'OPEN',
  visibility text not null default 'OPERATIONS',
  department_id uuid,
  zone_id uuid,
  owner_assignment_id uuid,
  owner_label text,
  due_at timestamptz,
  amount bigint,
  currency text not null default 'INR',
  payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  version integer not null default 1,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_production_record_id_event_unique unique (id, wedding_id),
  constraint event_production_record_function_fk
    foreign key (wedding_event_id, wedding_id)
    references public.wedding_events(id, wedding_id)
    on delete cascade,
  constraint event_production_record_department_fk
    foreign key (department_id, wedding_id)
    references public.event_operations_departments(id, wedding_id)
    on delete set null,
  constraint event_production_record_zone_fk
    foreign key (zone_id, wedding_id)
    references public.event_operations_zones(id, wedding_id)
    on delete set null,
  constraint event_production_record_owner_fk
    foreign key (owner_assignment_id, wedding_id)
    references public.event_staff_assignments(id, wedding_id)
    on delete set null,
  constraint event_production_record_type_valid check (
    record_type in (
      'DOCUMENT',
      'CONTRACT',
      'RIDER',
      'LICENSE',
      'PERMISSION',
      'RECCE',
      'APPROVAL',
      'PROCUREMENT',
      'TRANSPORT',
      'ROOMING',
      'HOSPITALITY',
      'GUEST_COMMUNICATION',
      'INVENTORY',
      'PACKING',
      'STATIONERY',
      'ALCOHOL',
      'EXPENSE',
      'REIMBURSEMENT',
      'FAMILY_BRIEF',
      'OTHER'
    )
  ),
  constraint event_production_record_status_valid check (
    status in ('OPEN', 'IN_PROGRESS', 'WAITING', 'APPROVED', 'DONE', 'CANCELLED')
  ),
  constraint event_production_record_visibility_valid check (
    visibility in ('CLIENT', 'OPERATIONS', 'FINANCE', 'PRIVATE')
  ),
  constraint event_production_record_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint event_production_record_description_valid check (
    description is null or char_length(description) <= 8000
  ),
  constraint event_production_record_owner_label_valid check (
    owner_label is null or char_length(owner_label) <= 160
  ),
  constraint event_production_record_amount_valid check (
    amount is null or amount >= 0
  ),
  constraint event_production_record_currency_valid check (
    currency ~ '^[A-Z]{3}$'
  ),
  constraint event_production_record_payload_valid check (
    jsonb_typeof(payload) = 'object'
  ),
  constraint event_production_record_sort_order_valid check (
    sort_order between 0 and 1000000
  ),
  constraint event_production_record_version_valid check (version >= 1)
);

create table public.event_production_attachments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  record_id uuid not null,
  title text not null,
  url text not null,
  classification text not null default 'INTERNAL',
  mime_type text,
  size_bytes bigint,
  created_by text not null,
  created_at timestamptz not null default now(),
  constraint event_production_attachment_record_fk
    foreign key (record_id, wedding_id)
    references public.event_production_records(id, wedding_id)
    on delete cascade,
  constraint event_production_attachment_title_valid check (
    btrim(title) <> '' and char_length(title) <= 180
  ),
  constraint event_production_attachment_url_valid check (
    btrim(url) <> '' and char_length(url) <= 2048
  ),
  constraint event_production_attachment_classification_valid check (
    classification in ('CLIENT', 'INTERNAL', 'FINANCE', 'PRIVATE_IDENTITY')
  ),
  constraint event_production_attachment_mime_valid check (
    mime_type is null or char_length(mime_type) <= 160
  ),
  constraint event_production_attachment_size_valid check (
    size_bytes is null or size_bytes between 0 and 52428800
  )
);

create table public.event_production_activity (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  record_id uuid not null,
  action text not null,
  actor_user_id text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now(),
  constraint event_production_activity_record_fk
    foreign key (record_id, wedding_id)
    references public.event_production_records(id, wedding_id)
    on delete cascade,
  constraint event_production_activity_action_valid check (
    action in ('CREATED', 'UPDATED', 'STATUS_CHANGED')
  )
);

create index event_production_records_event_idx
  on public.event_production_records(wedding_id, record_type, status, due_at);
create index event_production_records_function_idx
  on public.event_production_records(wedding_event_id, record_type, status)
  where wedding_event_id is not null;
create index event_production_records_owner_idx
  on public.event_production_records(owner_assignment_id, status, due_at)
  where owner_assignment_id is not null;
create index event_production_attachments_record_idx
  on public.event_production_attachments(record_id, created_at);
create index event_production_activity_record_idx
  on public.event_production_activity(record_id, created_at desc);

create trigger tr_event_production_records_updated
  before update on public.event_production_records
  for each row execute function public.update_updated_at();

create or replace function public.audit_event_production_record()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.event_production_activity (
      wedding_id, record_id, action, actor_user_id, new_value
    ) values (
      new.wedding_id, new.id, 'CREATED', new.created_by, to_jsonb(new)
    );
  elsif tg_op = 'UPDATE' then
    insert into public.event_production_activity (
      wedding_id, record_id, action, actor_user_id, old_value, new_value
    ) values (
      new.wedding_id,
      new.id,
      case when new.status is distinct from old.status then 'STATUS_CHANGED' else 'UPDATED' end,
      new.updated_by,
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

create trigger tr_event_production_records_audit
  after insert or update on public.event_production_records
  for each row execute function public.audit_event_production_record();

create or replace function public.prevent_event_production_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise insufficient_privilege using
    message = 'Event production activity is append-only';
end;
$$;

create trigger tr_event_production_activity_append_only
  before update or delete on public.event_production_activity
  for each row execute function public.prevent_event_production_activity_mutation();

alter table public.event_production_records enable row level security;
alter table public.event_production_attachments enable row level security;
alter table public.event_production_activity enable row level security;

revoke all on table public.event_production_records from public, anon, authenticated;
revoke all on table public.event_production_attachments from public, anon, authenticated;
revoke all on table public.event_production_activity from public, anon, authenticated;

grant select, insert, update, delete on table public.event_production_records to service_role;
grant select, insert, update, delete on table public.event_production_attachments to service_role;
grant select, insert on table public.event_production_activity to service_role;

revoke all on function public.audit_event_production_record() from public, anon, authenticated;
revoke all on function public.prevent_event_production_activity_mutation() from public, anon, authenticated;
