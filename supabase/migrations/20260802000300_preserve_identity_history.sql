-- Clerk deletion is handled as a soft deactivation in the webhook. Restrict
-- direct identity deletion so client/vendor profiles and message history can
-- never disappear through a user-row cascade.

alter table public.client_profiles
  drop constraint if exists client_profiles_user_id_fkey;
alter table public.client_profiles
  add constraint client_profiles_user_id_fkey
  foreign key (user_id) references public.users(id) on delete restrict;

alter table public.vendor_profiles
  drop constraint if exists vendor_profiles_user_id_fkey;
alter table public.vendor_profiles
  add constraint vendor_profiles_user_id_fkey
  foreign key (user_id) references public.users(id) on delete restrict;

alter table public.messages
  drop constraint if exists messages_sender_id_fkey;
alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.users(id) on delete restrict;

