-- Keep inbox reads bounded even when a booking accumulates years of messages.
-- These helpers are callable only by the server-side service role; the Next.js
-- route remains responsible for Clerk role and booking-ownership checks.

create index if not exists idx_messages_booking_created_id
  on public.messages (booking_id, created_at desc, id desc);

create or replace function public.load_message_inbox_pages(
  p_booking_ids uuid[],
  p_user_id text,
  p_recent_limit integer default 40
)
returns table (
  booking_id uuid,
  message_count bigint,
  unread_count bigint,
  last_read_at timestamptz,
  messages jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with requested as (
    select distinct requested_id as booking_id
    from pg_catalog.unnest(
      coalesce(p_booking_ids, '{}'::uuid[])
    ) as requested_id
  )
  select
    requested.booking_id,
    counts.message_count,
    counts.unread_count,
    thread_read.read_at as last_read_at,
    coalesce(recent.messages, '[]'::jsonb) as messages
  from requested
  left join public.message_thread_reads as thread_read
    on thread_read.booking_id = requested.booking_id
   and thread_read.user_id = p_user_id
  cross join lateral (
    select
      pg_catalog.count(*) as message_count,
      pg_catalog.count(*) filter (
        where message.sender_id <> p_user_id
          and message.created_at > coalesce(
            thread_read.read_at,
            '-infinity'::timestamptz
          )
      ) as unread_count
    from public.messages as message
    where message.booking_id = requested.booking_id
  ) as counts
  cross join lateral (
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', recent_message.id,
        'booking_id', recent_message.booking_id,
        'sender_id', recent_message.sender_id,
        'content', recent_message.content,
        'created_at', recent_message.created_at
      )
      order by recent_message.created_at, recent_message.id
    ) as messages
    from (
      select
        message.id,
        message.booking_id,
        message.sender_id,
        message.content,
        message.created_at
      from public.messages as message
      where message.booking_id = requested.booking_id
      order by message.created_at desc, message.id desc
      limit greatest(
        1,
        least(coalesce(p_recent_limit, 40), 100)
      )
    ) as recent_message
  ) as recent;
$$;

create or replace function public.load_message_page(
  p_booking_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 40
)
returns table (
  id uuid,
  booking_id uuid,
  sender_id text,
  content text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    message.id,
    message.booking_id,
    message.sender_id,
    message.content,
    message.created_at
  from public.messages as message
  where message.booking_id = p_booking_id
    and (
      p_before_created_at is null
      or p_before_id is null
      or (message.created_at, message.id) < (p_before_created_at, p_before_id)
    )
  order by message.created_at desc, message.id desc
  limit greatest(
    1,
    least(coalesce(p_limit, 40), 100)
  );
$$;

revoke all on function public.load_message_inbox_pages(uuid[], text, integer)
  from public, anon, authenticated;
revoke all on function public.load_message_page(uuid, timestamptz, uuid, integer)
  from public, anon, authenticated;

grant execute on function public.load_message_inbox_pages(uuid[], text, integer)
  to service_role;
grant execute on function public.load_message_page(uuid, timestamptz, uuid, integer)
  to service_role;

comment on function public.load_message_inbox_pages(uuid[], text, integer) is
  'Returns bounded recent message pages and exact unread totals for a server-authorized booking set.';
comment on function public.load_message_page(uuid, timestamptz, uuid, integer) is
  'Returns one keyset-paginated booking message page after server-side ownership authorization.';
