-- Create a production record and its external references atomically. The API
-- validates the payload first; database constraints remain the final event-
-- scope and classification boundary.
create or replace function public.create_event_production_record(
  p_wedding_id uuid,
  p_wedding_event_id uuid,
  p_record_type text,
  p_title text,
  p_description text,
  p_status text,
  p_visibility text,
  p_department_id uuid,
  p_zone_id uuid,
  p_owner_assignment_id uuid,
  p_owner_label text,
  p_due_at timestamptz,
  p_amount bigint,
  p_currency text,
  p_payload jsonb,
  p_actor_user_id text,
  p_attachments jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  created_record_id uuid;
begin
  if jsonb_typeof(p_attachments) <> 'array' or jsonb_array_length(p_attachments) > 20 then
    raise check_violation using message = 'Production attachments must be an array of at most 20 items';
  end if;

  insert into public.event_production_records (
    wedding_id,
    wedding_event_id,
    record_type,
    title,
    description,
    status,
    visibility,
    department_id,
    zone_id,
    owner_assignment_id,
    owner_label,
    due_at,
    amount,
    currency,
    payload,
    created_by,
    updated_by
  ) values (
    p_wedding_id,
    p_wedding_event_id,
    p_record_type,
    p_title,
    p_description,
    p_status,
    p_visibility,
    p_department_id,
    p_zone_id,
    p_owner_assignment_id,
    p_owner_label,
    p_due_at,
    p_amount,
    p_currency,
    coalesce(p_payload, '{}'::jsonb),
    p_actor_user_id,
    p_actor_user_id
  ) returning id into created_record_id;

  insert into public.event_production_attachments (
    wedding_id,
    record_id,
    title,
    url,
    classification,
    created_by
  )
  select
    p_wedding_id,
    created_record_id,
    btrim(item ->> 'title'),
    btrim(item ->> 'url'),
    coalesce(nullif(item ->> 'classification', ''), 'INTERNAL'),
    p_actor_user_id
  from jsonb_array_elements(p_attachments) item;

  return created_record_id;
end;
$$;

revoke all on function public.create_event_production_record(
  uuid, uuid, text, text, text, text, text, uuid, uuid, uuid, text,
  timestamptz, bigint, text, jsonb, text, jsonb
) from public, anon, authenticated;
grant execute on function public.create_event_production_record(
  uuid, uuid, text, text, text, text, text, uuid, uuid, uuid, text,
  timestamptz, bigint, text, jsonb, text, jsonb
) to service_role;

-- Existing template-derived accounts should gain the new capability without
-- replacing any intentional custom permission choices.
update public.operations_staff_profiles
set permissions = array_append(permissions, 'MANAGE_PRODUCTION')
where role_template in ('OPS_LEAD', 'COORDINATOR')
  and not ('MANAGE_PRODUCTION' = any(permissions));

update public.event_staff_assignments assignment
set permissions = array_append(assignment.permissions, 'MANAGE_PRODUCTION')
from public.operations_staff_profiles profile
where assignment.staff_user_id = profile.user_id
  and profile.role_template in ('OPS_LEAD', 'COORDINATOR')
  and assignment.permissions is not null
  and not ('MANAGE_PRODUCTION' = any(assignment.permissions));
