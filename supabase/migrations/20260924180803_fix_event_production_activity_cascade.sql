-- Direct history edits remain forbidden, but a parent event/record cascade must
-- be able to remove the history that belongs exclusively to that parent.

create or replace function public.prevent_event_production_activity_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise insufficient_privilege using
    message = 'Event production activity is append-only';
end;
$$;

revoke all on function public.prevent_event_production_activity_mutation()
  from public, anon, authenticated;
