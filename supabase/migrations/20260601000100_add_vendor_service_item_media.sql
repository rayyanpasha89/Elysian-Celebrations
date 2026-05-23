-- Vendor service items can now carry reference imagery so the public catalogue
-- can render real visuals next to each menu, setup, look, or coverage row.
-- Keeps the text-URL pattern already used by vendor_profiles.portfolio so
-- existing Supabase Storage adoption can later populate this column without
-- a schema rename.

alter table vendor_service_items
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists reference_url text;

comment on column vendor_service_items.image_urls is
  'Public URLs (Supabase Storage public bucket or external CDN) for catalogue thumbnails. Cap of 6 enforced in app code.';
comment on column vendor_service_items.reference_url is
  'Optional vendor-supplied moodboard, Pinterest, or portfolio link for this catalogue row.';
