-- Elysian authenticates with Clerk and performs all database reads/writes
-- through role-checked Next.js route handlers using the Supabase service role.
-- The browser publishable key must therefore have no direct table access.

do $$
declare
  table_record record;
begin
  for table_record in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security',
      table_record.tablename
    );
    execute format(
      'revoke all privileges on table public.%I from anon, authenticated',
      table_record.tablename
    );
  end loop;
end
$$;

revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Keep future migrations closed by default. A future direct-browser feature
-- must opt in with a narrowly scoped policy instead of inheriting open grants.
alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
