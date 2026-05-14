alter table vendor_services
  add column if not exists service_scope text,
  add column if not exists event_type_fit text[] not null default '{}',
  add column if not exists inclusions text[] not null default '{}',
  add column if not exists deliverables text[] not null default '{}',
  add column if not exists add_ons text[] not null default '{}';

create table if not exists vendor_service_items (
  id uuid primary key default gen_random_uuid(),
  vendor_service_id uuid not null references vendor_services(id) on delete cascade,
  item_type text not null default 'inclusion',
  name text not null,
  description text,
  dietary_tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_vendor_service_items_service
  on vendor_service_items(vendor_service_id, sort_order);

update vendor_services
set
  service_scope = coalesce(
    service_scope,
    case
      when vc.slug = 'catering' then 'Cuisine planning, live counters, dietary handling, service staffing, and final meal execution.'
      when vc.slug = 'decor' then 'Area-wise visual design across stage, mandap, florals, entries, tables, lighting, and setup operations.'
      when vc.slug = 'photography' then 'Event coverage planning, team allocation, edited deliverables, films, reels, and archival handover.'
      when vc.slug = 'entertainment' then 'Artist performance, sound flow, technical rider, show timing, and guest-energy programming.'
      when vc.slug = 'makeup' then 'Look planning, artist allocation, hair/makeup/draping, touch-ups, and getting-ready timing.'
      else 'Full service scope, execution support, and event-specific deliverables.'
    end
  ),
  event_type_fit = case
    when array_length(event_type_fit, 1) is not null then event_type_fit
    when vc.slug = 'catering' then array['Welcome dinner', 'Haldi', 'Sangeet', 'Wedding', 'Reception']
    when vc.slug = 'decor' then array['Mehendi', 'Haldi', 'Sangeet', 'Wedding', 'Reception']
    when vc.slug = 'photography' then array['Pre-wedding', 'Mehendi', 'Sangeet', 'Wedding', 'Reception']
    when vc.slug = 'entertainment' then array['Welcome night', 'Cocktail', 'Sangeet', 'After-party', 'Reception']
    when vc.slug = 'makeup' then array['Mehendi', 'Haldi', 'Wedding', 'Reception', 'After-party']
    else array['Welcome', 'Main event', 'Reception']
  end,
  inclusions = case
    when array_length(inclusions, 1) is not null then inclusions
    when vc.slug = 'catering' then array['Menu planning', 'Service staff', 'Dietary handling', 'Live counter planning']
    when vc.slug = 'decor' then array['Concept direction', 'Area-wise setup', 'Floral styling', 'Setup and strike']
    when vc.slug = 'photography' then array['Lead coverage', 'Edited gallery', 'Timeline coordination', 'Delivery handover']
    when vc.slug = 'entertainment' then array['Performance set', 'Sound coordination', 'Technical rider', 'Soundcheck planning']
    when vc.slug = 'makeup' then array['Look consultation', 'Hair and makeup', 'Draping support', 'Touch-up planning']
    else array['Consultation', 'Execution planning', 'Event support']
  end,
  deliverables = case
    when array_length(deliverables, 1) is not null then deliverables
    when vc.slug = 'catering' then array['Menu proposal', 'Per-person quote', 'Tasting notes', 'Final service sheet']
    when vc.slug = 'decor' then array['Moodboard', 'Scope sheet', 'Setup references', 'Production timeline']
    when vc.slug = 'photography' then array['Edited photos', 'Highlight options', 'Album add-ons', 'Delivery timeline']
    when vc.slug = 'entertainment' then array['Run sheet', 'Playlist direction', 'Technical checklist', 'Stage timing']
    when vc.slug = 'makeup' then array['Look references', 'Artist schedule', 'Product notes', 'Family allocation']
    else array['Proposal', 'Scope breakdown', 'Execution checklist']
  end,
  add_ons = case
    when array_length(add_ons, 1) is not null then add_ons
    when vc.slug = 'catering' then array['Late-night snack counter', 'Mocktail bar', 'Regional dessert station']
    when vc.slug = 'decor' then array['Custom signage', 'Statement installation', 'Candle upgrade']
    when vc.slug = 'photography' then array['Drone', 'Same-day edit', 'Reels package']
    when vc.slug = 'entertainment' then array['Additional artist', 'LED wall', 'After-party extension']
    when vc.slug = 'makeup' then array['Extra family looks', 'Second change', 'Extended touch-up']
    else array['Custom add-on', 'Extended support']
  end
from vendor_profiles vp
join vendor_categories vc on vc.id = vp.category_id
where vendor_services.vendor_profile_id = vp.id;

insert into vendor_service_items (
  vendor_service_id,
  item_type,
  name,
  description,
  dietary_tags,
  sort_order
)
select
  vs.id,
  item.item_type,
  item.name,
  item.description,
  item.dietary_tags,
  item.sort_order
from vendor_services vs
join vendor_profiles vp on vp.id = vs.vendor_profile_id
join vendor_categories vc on vc.id = vp.category_id
cross join lateral (
  select * from (
    values
      ('menu', 'Welcome beverage station', 'Seasonal welcome drinks and infused water service.', array['Vegetarian'], 0),
      ('menu', 'Live chaat or regional counter', 'Interactive counter that can be adapted by event mood.', array['Vegetarian'], 1),
      ('menu', 'Main course spread', 'Core meal spread with regional and global balance.', array['Vegetarian', 'Non-vegetarian'], 2),
      ('menu', 'Dessert and late-night bite', 'Dessert bar or closing snack for longer celebrations.', array['Vegetarian'], 3)
  ) as catering_items(item_type, name, description, dietary_tags, sort_order)
  where vc.slug = 'catering'

  union all

  select * from (
    values
      ('setup', 'Entry moment', 'Guest arrival visual, signage, and first impression styling.', array[]::text[], 0),
      ('setup', 'Stage or mandap focal', 'Primary ceremony or performance visual anchor.', array[]::text[], 1),
      ('setup', 'Guest table styling', 'Centerpieces, candles, table accents, and linen direction.', array[]::text[], 2),
      ('setup', 'Lighting atmosphere', 'Warmth, drama, and photography-friendly ambience.', array[]::text[], 3)
  ) as decor_items(item_type, name, description, dietary_tags, sort_order)
  where vc.slug = 'decor'

  union all

  select * from (
    values
      ('deliverable', 'Candid event coverage', 'Story-led coverage of family, rituals, and guest moments.', array[]::text[], 0),
      ('deliverable', 'Portrait and detail set', 'Couple, family, decor, invitation, and venue details.', array[]::text[], 1),
      ('deliverable', 'Edited gallery', 'Edited image handover with curated final selection.', array[]::text[], 2),
      ('deliverable', 'Film or reels add-on', 'Short-form or cinematic output depending on package.', array[]::text[], 3)
  ) as photo_items(item_type, name, description, dietary_tags, sort_order)
  where vc.slug = 'photography'

  union all

  select * from (
    values
      ('performance', 'Performance set', 'Primary artist, DJ, band, or show format.', array[]::text[], 0),
      ('performance', 'Soundcheck and tech rider', 'Sound, lights, stage, and technical requirements.', array[]::text[], 1),
      ('performance', 'Emcee or cue flow', 'Announcements, transitions, and crowd-energy timing.', array[]::text[], 2),
      ('performance', 'After-party extension', 'Optional extra hours or second set.', array[]::text[], 3)
  ) as entertainment_items(item_type, name, description, dietary_tags, sort_order)
  where vc.slug = 'entertainment'

  union all

  select * from (
    values
      ('look', 'Primary look', 'Main hair, makeup, and styling direction.', array[]::text[], 0),
      ('look', 'Second change', 'Reception, after-party, or ceremony transition look.', array[]::text[], 1),
      ('look', 'Family styling block', 'Optional family makeup and draping allocation.', array[]::text[], 2),
      ('look', 'Touch-up window', 'Timing and support for touch-ups between events.', array[]::text[], 3)
  ) as makeup_items(item_type, name, description, dietary_tags, sort_order)
  where vc.slug = 'makeup'
) as item
where not exists (
  select 1
  from vendor_service_items existing
  where existing.vendor_service_id = vs.id
);
