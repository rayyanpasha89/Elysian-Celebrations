alter table public.vendor_profiles
  add column if not exists tax_id text,
  add column if not exists accepting_inquiries boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendor_profiles_tax_id_length_check'
      and conrelid = 'public.vendor_profiles'::regclass
  ) then
    alter table public.vendor_profiles
      add constraint vendor_profiles_tax_id_length_check
      check (tax_id is null or char_length(tax_id) <= 64);
  end if;
end
$$;

comment on column public.vendor_profiles.tax_id is
  'Private business tax or GST identifier. Never expose through public vendor catalogue routes.';

comment on column public.vendor_profiles.accepting_inquiries is
  'Controls whether the vendor appears in discovery and can receive new bookings.';
