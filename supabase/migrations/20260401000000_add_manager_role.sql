-- Add MANAGER to the user_role enum
-- This is safe to run on an existing database — it only adds the value if missing.

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'MANAGER'
      and enumtypid = (select oid from pg_type where typname = 'user_role')
  ) then
    alter type user_role add value 'MANAGER';
  end if;
end
$$;
