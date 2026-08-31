-- Cover the composite function-to-day ownership foreign key so parent updates
-- and deletes do not require a full wedding_events scan.
create index wedding_events_day_ownership_idx
  on public.wedding_events(wedding_day_id, wedding_id);
