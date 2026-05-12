alter table budget_items
  add column if not exists wedding_event_id uuid references wedding_events(id) on delete set null;

create index if not exists idx_budget_items_wedding_event
  on budget_items(wedding_event_id);
