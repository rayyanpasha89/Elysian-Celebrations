-- Preserve append-only activity during normal operation while permitting the
-- database to cascade it when its parent event graph is intentionally removed.
create or replace function public.prevent_event_partner_travel_activity_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  raise exception 'Partner travel activity is append-only' using errcode = '55000';
end;
$$;

revoke all on function public.prevent_event_partner_travel_activity_mutation()
  from public, anon, authenticated;
