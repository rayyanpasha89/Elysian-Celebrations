alter table weddings
  add column if not exists event_type text not null default 'wedding',
  add column if not exists custom_event_type text,
  add column if not exists event_platform_version integer not null default 1,
  add column if not exists definition_payload jsonb not null default '{}'::jsonb;

alter table wedding_events
  add column if not exists time_block text,
  add column if not exists requirement_payload jsonb not null default '{}'::jsonb;

create index if not exists idx_weddings_event_type on weddings(event_type);
create index if not exists idx_wedding_events_time_block on wedding_events(time_block);
