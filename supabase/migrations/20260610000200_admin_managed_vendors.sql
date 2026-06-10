-- Allow admin-created "managed" vendors that aren't tied to a self-signup user
-- account or a category yet. Elysian negotiates with these vendors directly.

alter table public.vendor_profiles alter column user_id drop not null;
alter table public.vendor_profiles alter column category_id drop not null;
