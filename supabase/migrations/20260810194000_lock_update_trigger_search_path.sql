-- Trigger helpers run with a deterministic namespace even if a caller changes
-- its session search path.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
