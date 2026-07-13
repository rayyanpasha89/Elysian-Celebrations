-- Elysian Celebrations — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables.

create extension if not exists pgcrypto;

-- ─── Enums ───────────────────────────────────────────────────

create type user_role as enum ('CLIENT', 'VENDOR', 'ADMIN', 'MANAGER');
create type wedding_status as enum ('PLANNING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type booking_status as enum ('INQUIRY', 'QUOTE_SENT', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED');
create type notification_type as enum ('BOOKING_UPDATE', 'MESSAGE', 'REVIEW', 'PAYMENT', 'SYSTEM');
create type guest_side as enum ('BRIDE', 'GROOM', 'COUPLE', 'MUTUAL');
create type rsvp_status as enum ('PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE');
create type inquiry_status as enum ('NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED', 'CLOSED');

-- ─── Users (synced from Clerk) ───────────────────────────────

create table users (
  id text primary key,  -- Clerk user ID
  email text unique not null,
  name text not null,
  phone text,
  avatar text,
  role user_role not null default 'CLIENT',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Client Profiles ─────────────────────────────────────────

create table client_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null references users(id) on delete cascade,
  partner_name text,
  wedding_date timestamptz,
  estimated_budget integer,
  guest_count integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Vendor Categories ───────────────────────────────────────

create table vendor_categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  sort_order integer not null default 0
);

-- ─── Vendor Profiles ─────────────────────────────────────────

create table vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null references users(id) on delete cascade,
  business_name text not null,
  slug text unique not null,
  category_id uuid not null references vendor_categories(id),
  description text,
  short_bio text,
  cover_image text,
  portfolio text[] default '{}',
  city text,
  state text,
  country text not null default 'India',
  experience integer,
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  rating real not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Vendor Services ─────────────────────────────────────────

create table vendor_services (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  name text not null,
  description text,
  service_scope text,
  base_price integer not null,
  max_price integer,
  unit text,
  event_type_fit text[] not null default '{}',
  inclusions text[] not null default '{}',
  deliverables text[] not null default '{}',
  add_ons text[] not null default '{}',
  is_active boolean not null default true
);

create table vendor_service_items (
  id uuid primary key default gen_random_uuid(),
  vendor_service_id uuid not null references vendor_services(id) on delete cascade,
  item_type text not null default 'inclusion',
  name text not null,
  description text,
  dietary_tags text[] not null default '{}',
  image_urls text[] not null default '{}',
  reference_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Destinations ────────────────────────────────────────────

create table destinations (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  country text not null,
  tagline text,
  description text,
  hero_image text,
  gallery text[] default '{}',
  starting_price integer,
  venue_count integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Vendor–Destination Junction ─────────────────────────────

create table vendor_destinations (
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  destination_id uuid not null references destinations(id) on delete cascade,
  primary key (vendor_profile_id, destination_id)
);

-- ─── Venues ──────────────────────────────────────────────────

create table venues (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references destinations(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  address text,
  capacity integer,
  price_range text,
  hero_image text,
  gallery text[] default '{}',
  amenities text[] default '{}',
  is_active boolean not null default true
);

-- ─── Package Tiers ───────────────────────────────────────────

create table package_tiers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  tagline text,
  description text,
  starting_price integer not null,
  inclusions text[] default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

-- ─── Weddings ────────────────────────────────────────────────

create table weddings (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  name text not null,
  date timestamptz,
  event_type text not null default 'wedding',
  custom_event_type text,
  event_platform_version integer not null default 1,
  definition_payload jsonb not null default '{}'::jsonb,
  destination_id uuid references destinations(id),
  package_tier_id uuid references package_tiers(id),
  status wedding_status not null default 'PLANNING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Wedding Events ──────────────────────────────────────────

create table wedding_days (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  date timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table wedding_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  wedding_day_id uuid references wedding_days(id) on delete set null,
  name text not null,
  event_type text,
  time_block text,
  date timestamptz,
  start_time text,
  end_time text,
  venue text,
  guest_count integer,
  estimated_budget integer,
  food_style text,
  food_preferences text[] not null default '{}',
  menu_notes text,
  decor_style text,
  decor_notes text,
  attire_notes text,
  notes text,
  requirement_payload jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table wedding_event_menus (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  name text not null default 'Primary menu',
  meal_period text,
  service_style text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wedding_event_menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references wedding_event_menus(id) on delete cascade,
  name text not null,
  course text,
  dietary_tags text[] not null default '{}',
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table wedding_event_logistics (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null unique references wedding_events(id) on delete cascade,
  guest_arrival_time text,
  vendor_load_in_time text,
  family_call_time text,
  transport_notes text,
  rooming_notes text,
  weather_plan text,
  ceremony_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table wedding_event_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  title text not null,
  owner text,
  status text not null default 'OPEN',
  due_date timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table wedding_event_requirements (
  id uuid primary key default gen_random_uuid(),
  wedding_event_id uuid not null references wedding_events(id) on delete cascade,
  category text not null,
  title text not null default 'Requirement',
  status text not null default 'DRAFT',
  priority text not null default 'NORMAL',
  vendor_profile_id uuid references vendor_profiles(id) on delete set null,
  vendor_service_id uuid references vendor_services(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Budgets ─────────────────────────────────────────────────

create table budgets (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  name text not null default 'My Wedding Budget',
  total_budget integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null,
  allocated integer not null default 0,
  sort_order integer not null default 0
);

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_category_id uuid not null references budget_categories(id) on delete cascade,
  wedding_event_id uuid references wedding_events(id) on delete set null,
  name text not null,
  estimated_cost integer not null default 0,
  actual_cost integer,
  quantity integer not null default 1,
  is_paid boolean not null default false,
  notes text,
  sort_order integer not null default 0
);

-- ─── Bookings ────────────────────────────────────────────────

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  vendor_service_id uuid references vendor_services(id),
  wedding_event_id uuid references wedding_events(id),
  status booking_status not null default 'INQUIRY',
  event_date timestamptz,
  total_amount integer,
  vendor_cost integer,
  vendor_amount integer check (vendor_amount is null or vendor_amount >= 0),
  final_price integer,
  price_published boolean not null default false,
  service_fee integer generated always as (
    case
      when final_price is null or vendor_amount is null then null
      else final_price - vendor_amount
    end
  ) stored,
  paid_amount integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_final_price_valid check (
    final_price is null
    or (vendor_amount is not null and final_price >= vendor_amount)
  ),
  constraint bookings_published_price_complete check (
    price_published = false or final_price is not null
  )
);

-- ─── Saved Vendors ───────────────────────────────────────────

create table saved_vendors (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_profile_id, vendor_profile_id)
);

-- ─── Vendor Profile Views ────────────────────────────────────

create table vendor_profile_views (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  viewer_user_id text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Reviews ─────────────────────────────────────────────────

create table reviews (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  vendor_profile_id uuid not null references vendor_profiles(id) on delete cascade,
  rating integer not null,
  title text,
  content text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (client_profile_id, vendor_profile_id)
);

-- ─── Messages ────────────────────────────────────────────────

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references users(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table message_thread_reads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, user_id)
);

-- ─── Notifications ───────────────────────────────────────────

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Guest Management ────────────────────────────────────────

create table guest_lists (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  name text not null default 'Main Guest List',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  guest_list_id uuid not null references guest_lists(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  side guest_side not null default 'COUPLE',
  rsvp_status rsvp_status not null default 'PENDING',
  meal_pref text,
  plus_one boolean not null default false,
  table_number integer,
  notes text
);

-- ─── Timeline ────────────────────────────────────────────────

create table timeline_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  is_completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Mood Board ──────────────────────────────────────────────

create table mood_boards (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references client_profiles(id) on delete cascade,
  name text not null default 'Inspiration',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mood_board_items (
  id uuid primary key default gen_random_uuid(),
  mood_board_id uuid not null references mood_boards(id) on delete cascade,
  category text not null default 'Decor',
  image_url text not null,
  caption text,
  source_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── Content ─────────────────────────────────────────────────

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text not null,
  cover_image text,
  author text not null,
  tags text[] default '{}',
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table testimonials (
  id uuid primary key default gen_random_uuid(),
  couple_name text not null,
  destination text not null,
  quote text not null,
  image text,
  is_published boolean not null default true,
  sort_order integer not null default 0
);

create table contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid references client_profiles(id),
  name text not null,
  email text not null,
  phone text,
  destination text,
  wedding_date text,
  guest_count text,
  message text not null,
  status inquiry_status not null default 'NEW',
  created_at timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────

create index idx_vendor_profiles_category on vendor_profiles(category_id);
create index idx_vendor_profiles_rating on vendor_profiles(rating desc);
create index idx_vendor_profiles_featured on vendor_profiles(is_featured) where is_featured = true;
create index idx_vendor_service_items_service on vendor_service_items(vendor_service_id, sort_order);
create index idx_bookings_client on bookings(client_profile_id);
create index idx_bookings_vendor on bookings(vendor_profile_id);
create index idx_bookings_status on bookings(status);
create index idx_saved_vendors_client on saved_vendors(client_profile_id);
create index idx_saved_vendors_vendor on saved_vendors(vendor_profile_id);
create index idx_weddings_event_type on weddings(event_type);
create index idx_wedding_days_wedding on wedding_days(wedding_id);
create index idx_wedding_events_day on wedding_events(wedding_day_id);
create index idx_wedding_events_time_block on wedding_events(time_block);
create index idx_wedding_event_menus_event on wedding_event_menus(wedding_event_id, sort_order);
create index idx_wedding_event_menu_items_menu on wedding_event_menu_items(menu_id, sort_order);
create index idx_wedding_event_tasks_event on wedding_event_tasks(wedding_event_id, sort_order);
create index idx_wedding_event_requirements_event on wedding_event_requirements(wedding_event_id, sort_order);
create index idx_wedding_event_requirements_category on wedding_event_requirements(category);
create index idx_wedding_event_requirements_vendor on wedding_event_requirements(vendor_profile_id);
create index idx_budget_items_wedding_event on budget_items(wedding_event_id);
create index idx_vendor_profile_views_vendor on vendor_profile_views(vendor_profile_id);
create index idx_vendor_profile_views_created_at on vendor_profile_views(created_at desc);
create index idx_guests_list on guests(guest_list_id);
create index idx_messages_booking on messages(booking_id);
create index idx_message_thread_reads_user on message_thread_reads(user_id);
create index idx_message_thread_reads_booking on message_thread_reads(booking_id);
create index idx_notifications_user on notifications(user_id);
create index idx_mood_board_items_board on mood_board_items(mood_board_id);
create index idx_blog_posts_slug on blog_posts(slug);
create index idx_destinations_slug on destinations(slug);

-- ─── Updated-at trigger ──────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_users_updated before update on users for each row execute function update_updated_at();
create trigger tr_client_profiles_updated before update on client_profiles for each row execute function update_updated_at();
create trigger tr_vendor_profiles_updated before update on vendor_profiles for each row execute function update_updated_at();
create trigger tr_destinations_updated before update on destinations for each row execute function update_updated_at();
create trigger tr_weddings_updated before update on weddings for each row execute function update_updated_at();
create trigger tr_budgets_updated before update on budgets for each row execute function update_updated_at();
create trigger tr_bookings_updated before update on bookings for each row execute function update_updated_at();
create trigger tr_wedding_event_requirements_updated before update on wedding_event_requirements for each row execute function update_updated_at();
create trigger tr_message_thread_reads_updated before update on message_thread_reads for each row execute function update_updated_at();
create trigger tr_guest_lists_updated before update on guest_lists for each row execute function update_updated_at();
create trigger tr_mood_boards_updated before update on mood_boards for each row execute function update_updated_at();
create trigger tr_blog_posts_updated before update on blog_posts for each row execute function update_updated_at();

create or replace function lock_booking_vendor_amount()
returns trigger as $$
begin
  if old.vendor_amount is not null
     and new.vendor_amount is distinct from old.vendor_amount then
    raise exception 'vendor_amount is immutable once captured';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger bookings_lock_vendor_amount
before update of vendor_amount on bookings
for each row execute function lock_booking_vendor_amount();

-- Clerk owns application authentication. Browser clients never query the
-- public schema directly; role-checked Next.js handlers use service_role.
-- Keep a fresh schema as closed as the production migration baseline.
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

alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
alter default privileges in schema public
  revoke all privileges on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
