-- Index the foreign-key paths used repeatedly by planner, budget, booking,
-- venue, timeline, and vendor catalogue queries. PostgreSQL does not create
-- indexes automatically on the referencing side of a foreign key.

create index if not exists weddings_client_profile_idx
  on public.weddings(client_profile_id);
create index if not exists wedding_events_wedding_idx
  on public.wedding_events(wedding_id);
create index if not exists bookings_wedding_event_idx
  on public.bookings(wedding_event_id);
create index if not exists bookings_vendor_service_idx
  on public.bookings(vendor_service_id);
create index if not exists budget_categories_budget_idx
  on public.budget_categories(budget_id);
create index if not exists budget_items_category_idx
  on public.budget_items(budget_category_id);
create index if not exists timeline_items_wedding_idx
  on public.timeline_items(wedding_id);
create index if not exists venues_destination_idx
  on public.venues(destination_id);
create index if not exists vendor_services_vendor_profile_idx
  on public.vendor_services(vendor_profile_id);
create index if not exists wedding_event_requirements_vendor_service_idx
  on public.wedding_event_requirements(vendor_service_id);

