-- Persist per-user read state for booking message threads.
-- This covers both normal message unread state and fresh inquiry threads before
-- the first message exists.

create table if not exists message_thread_reads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, user_id)
);

create index if not exists idx_message_thread_reads_user on message_thread_reads(user_id);
create index if not exists idx_message_thread_reads_booking on message_thread_reads(booking_id);

drop trigger if exists tr_message_thread_reads_updated on message_thread_reads;
create trigger tr_message_thread_reads_updated
before update on message_thread_reads
for each row execute function update_updated_at();
