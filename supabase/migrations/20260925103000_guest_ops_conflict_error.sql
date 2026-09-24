-- PostgREST can retry SQLSTATE 40001 and surface a timeout instead of the
-- optimistic-concurrency conflict. Preserve the transactional implementation
-- behind an internal function and translate only that conflict to a stable
-- constraint error for the authenticated API.

alter function public.save_guest_operations_snapshot(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) rename to save_guest_operations_snapshot_internal;

create or replace function public.save_guest_operations_snapshot(
  p_wedding_id uuid,
  p_guest_id uuid,
  p_expected_version integer,
  p_profile jsonb,
  p_travel_legs jsonb,
  p_stays jsonb,
  p_transfers jsonb,
  p_hospitality_items jsonb,
  p_actor_user_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  return public.save_guest_operations_snapshot_internal(
    p_wedding_id,
    p_guest_id,
    p_expected_version,
    p_profile,
    p_travel_legs,
    p_stays,
    p_transfers,
    p_hospitality_items,
    p_actor_user_id
  );
exception
  when serialization_failure then
    raise check_violation using
      message = 'Guest operations changed; reload before saving';
end;
$$;

revoke all on function public.save_guest_operations_snapshot_internal(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public, anon, authenticated;
grant execute on function public.save_guest_operations_snapshot_internal(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to service_role;

revoke all on function public.save_guest_operations_snapshot(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) from public, anon, authenticated;
grant execute on function public.save_guest_operations_snapshot(
  uuid, uuid, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to service_role;
