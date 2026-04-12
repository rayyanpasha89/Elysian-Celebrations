create table if not exists wedding_days (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  name text not null,
  date timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table wedding_events
  add column if not exists wedding_day_id uuid references wedding_days(id) on delete set null,
  add column if not exists event_type text,
  add column if not exists start_time text,
  add column if not exists end_time text,
  add column if not exists guest_count integer,
  add column if not exists estimated_budget integer,
  add column if not exists food_style text,
  add column if not exists food_preferences text[] not null default '{}',
  add column if not exists menu_notes text,
  add column if not exists decor_style text,
  add column if not exists decor_notes text,
  add column if not exists attire_notes text;

create index if not exists idx_wedding_days_wedding on wedding_days(wedding_id);
create index if not exists idx_wedding_events_day on wedding_events(wedding_day_id);

insert into users (id, email, name, role)
select
  'seed-vendor-saffron-kitchens',
  'hello@saffronkitchens.example',
  'Saffron Kitchens',
  'VENDOR'::user_role
where not exists (
  select 1 from users where id = 'seed-vendor-saffron-kitchens'
);

insert into users (id, email, name, role)
select
  'seed-vendor-coastline-catering',
  'hello@coastlinecatering.example',
  'Coastline Catering House',
  'VENDOR'::user_role
where not exists (
  select 1 from users where id = 'seed-vendor-coastline-catering'
);

insert into vendor_profiles (
  user_id,
  business_name,
  slug,
  category_id,
  description,
  short_bio,
  city,
  state,
  country,
  experience,
  is_verified,
  is_featured,
  rating,
  review_count
)
select
  'seed-vendor-saffron-kitchens',
  'Saffron Kitchens',
  'saffron-kitchens',
  (select id from vendor_categories where slug = 'catering'),
  'Large-format wedding catering with vegetarian tasting journeys, live counters, and family-style hospitality.',
  'Celebration menus built around regional warmth, guest flow, and polished service.',
  'Udaipur',
  'Rajasthan',
  'India',
  10,
  true,
  true,
  4.8,
  12
where not exists (
  select 1 from vendor_profiles where slug = 'saffron-kitchens'
);

insert into vendor_profiles (
  user_id,
  business_name,
  slug,
  category_id,
  description,
  short_bio,
  city,
  state,
  country,
  experience,
  is_verified,
  is_featured,
  rating,
  review_count
)
select
  'seed-vendor-coastline-catering',
  'Coastline Catering House',
  'coastline-catering-house',
  (select id from vendor_categories where slug = 'catering'),
  'Goa-forward wedding feasts with seafood stations, vegan counters, and all-day hospitality for destination weekends.',
  'Known for energetic live stations and menu planning that works across multiple functions.',
  'Goa',
  'Goa',
  'India',
  8,
  true,
  false,
  4.7,
  9
where not exists (
  select 1 from vendor_profiles where slug = 'coastline-catering-house'
);

insert into vendor_services (vendor_profile_id, name, description, base_price, max_price, unit)
select
  (select id from vendor_profiles where slug = 'saffron-kitchens'),
  'Vegetarian Celebration Menu',
  'A fully vegetarian wedding menu with welcome drinks, plated mains, and live dessert stations.',
  185000,
  285000,
  'per event'
where not exists (
  select 1
  from vendor_services
  where vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-kitchens')
    and name = 'Vegetarian Celebration Menu'
);

insert into vendor_services (vendor_profile_id, name, description, base_price, max_price, unit)
select
  (select id from vendor_profiles where slug = 'saffron-kitchens'),
  'Jain and Family Lunch Service',
  'Daytime lunch service designed for haldi and mehendi gatherings with Jain-friendly counters.',
  120000,
  180000,
  'per event'
where not exists (
  select 1
  from vendor_services
  where vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-kitchens')
    and name = 'Jain and Family Lunch Service'
);

insert into vendor_services (vendor_profile_id, name, description, base_price, max_price, unit)
select
  (select id from vendor_profiles where slug = 'coastline-catering-house'),
  'Coastal Mixed Wedding Feast',
  'A mixed vegetarian and non-vegetarian menu with seafood grills, regional curries, and live counters.',
  210000,
  320000,
  'per event'
where not exists (
  select 1
  from vendor_services
  where vendor_profile_id = (select id from vendor_profiles where slug = 'coastline-catering-house')
    and name = 'Coastal Mixed Wedding Feast'
);

insert into vendor_services (vendor_profile_id, name, description, base_price, max_price, unit)
select
  (select id from vendor_profiles where slug = 'coastline-catering-house'),
  'Sunset Cocktail Canape Program',
  'Passed canapes, grazing tables, and late-night snacks for cocktail and sangeet events.',
  145000,
  225000,
  'per event'
where not exists (
  select 1
  from vendor_services
  where vendor_profile_id = (select id from vendor_profiles where slug = 'coastline-catering-house')
    and name = 'Sunset Cocktail Canape Program'
);

insert into vendor_destinations (vendor_profile_id, destination_id)
select
  (select id from vendor_profiles where slug = 'saffron-kitchens'),
  destinations.id
from destinations
where destinations.slug in ('udaipur', 'jaipur')
  and not exists (
    select 1
    from vendor_destinations
    where vendor_profile_id = (select id from vendor_profiles where slug = 'saffron-kitchens')
      and destination_id = destinations.id
  );

insert into vendor_destinations (vendor_profile_id, destination_id)
select
  (select id from vendor_profiles where slug = 'coastline-catering-house'),
  destinations.id
from destinations
where destinations.slug in ('goa', 'kerala')
  and not exists (
    select 1
    from vendor_destinations
    where vendor_profile_id = (select id from vendor_profiles where slug = 'coastline-catering-house')
      and destination_id = destinations.id
  );
