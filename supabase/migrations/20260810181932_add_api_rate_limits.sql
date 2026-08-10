-- Distributed fixed-window rate limiting for public and high-write API routes.
-- Route handlers call this only through the service-role Supabase client.

create table public.api_rate_limits (
  key_hash text primary key,
  bucket_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create index api_rate_limits_updated_at_idx
  on public.api_rate_limits(updated_at);

-- Tracks only in-flight bytes. Persisted usage remains authoritative in
-- storage.objects; the reservation closes the concurrent-upload race.
create table public.vendor_media_quota_reservations (
  vendor_profile_id uuid primary key
    references public.vendor_profiles(id) on delete cascade,
  reserved_bytes bigint not null default 0 check (reserved_bytes >= 0),
  expires_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendor_media_quota_reservations enable row level security;
revoke all privileges on table public.vendor_media_quota_reservations
  from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_bucket_started_at timestamptz;
  v_request_count integer;
begin
  if p_key_hash is null or length(p_key_hash) < 32 or length(p_key_hash) > 128 then
    raise exception 'Invalid rate-limit key';
  end if;
  if p_limit < 1 or p_limit > 10000 then
    raise exception 'Invalid rate-limit ceiling';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit window';
  end if;

  insert into public.api_rate_limits as limits (
    key_hash,
    bucket_started_at,
    request_count,
    updated_at
  )
  values (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update
  set
    bucket_started_at = case
      when limits.bucket_started_at <=
        v_now - make_interval(secs => p_window_seconds)
        then v_now
      else limits.bucket_started_at
    end,
    request_count = case
      when limits.bucket_started_at <=
        v_now - make_interval(secs => p_window_seconds)
        then 1
      else least(limits.request_count + 1, p_limit + 1)
    end,
    updated_at = v_now
  returning bucket_started_at, request_count
  into v_bucket_started_at, v_request_count;

  allowed := v_request_count <= p_limit;
  remaining := greatest(p_limit - v_request_count, 0);
  reset_at := v_bucket_started_at + make_interval(secs => p_window_seconds);

  -- Bound table growth without requiring a separate scheduler. Cleanup is
  -- intentionally rare and capped so it never dominates request latency.
  if random() < 0.01 then
    delete from public.api_rate_limits
    where key_hash in (
      select stale.key_hash
      from public.api_rate_limits as stale
      where stale.updated_at < v_now - interval '2 days'
      order by stale.updated_at asc
      limit 100
    );
  end if;

  return next;
end;
$$;

revoke execute on function public.consume_api_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer)
  to service_role;

create or replace function public.reserve_vendor_media_bytes(
  p_vendor_profile_id uuid,
  p_bytes bigint,
  p_quota_bytes bigint
)
returns table (
  allowed boolean,
  used_bytes bigint,
  reserved_bytes bigint,
  remaining_bytes bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_used_bytes bigint := 0;
  v_reserved_bytes bigint := 0;
begin
  if p_bytes < 1 or p_bytes > 8388608 then
    raise exception 'Invalid media reservation size';
  end if;
  if p_quota_bytes < p_bytes or p_quota_bytes > 1073741824 then
    raise exception 'Invalid media quota';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_vendor_profile_id::text, 0)
  );

  select coalesce(sum(
    case
      when (objects.metadata ->> 'size') ~ '^[0-9]+$'
        then (objects.metadata ->> 'size')::bigint
      else 0
    end
  ), 0)
  into v_used_bytes
  from storage.objects as objects
  where objects.bucket_id = 'vendor-media'
    and (
      objects.name like 'profiles/' || p_vendor_profile_id::text || '/%'
      or objects.name like 'service-items/' || p_vendor_profile_id::text || '/%'
    );

  insert into public.vendor_media_quota_reservations as reservations (
    vendor_profile_id,
    reserved_bytes,
    expires_at,
    updated_at
  )
  values (p_vendor_profile_id, 0, v_now, v_now)
  on conflict (vendor_profile_id) do update
  set
    reserved_bytes = case
      when reservations.expires_at <= v_now then 0
      else reservations.reserved_bytes
    end,
    updated_at = v_now;

  select reservations.reserved_bytes
  into v_reserved_bytes
  from public.vendor_media_quota_reservations as reservations
  where reservations.vendor_profile_id = p_vendor_profile_id;

  allowed := v_used_bytes + v_reserved_bytes + p_bytes <= p_quota_bytes;
  if allowed then
    v_reserved_bytes := v_reserved_bytes + p_bytes;
    update public.vendor_media_quota_reservations as reservations
    set
      reserved_bytes = v_reserved_bytes,
      expires_at = v_now + interval '15 minutes',
      updated_at = v_now
    where reservations.vendor_profile_id = p_vendor_profile_id;
  end if;

  used_bytes := v_used_bytes;
  reserved_bytes := v_reserved_bytes;
  remaining_bytes := greatest(
    p_quota_bytes - v_used_bytes - v_reserved_bytes,
    0
  );
  return next;
end;
$$;

create or replace function public.release_vendor_media_bytes(
  p_vendor_profile_id uuid,
  p_bytes bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_bytes < 1 or p_bytes > 8388608 then
    raise exception 'Invalid media reservation size';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_vendor_profile_id::text, 0)
  );

  update public.vendor_media_quota_reservations as reservations
  set
    reserved_bytes = greatest(reservations.reserved_bytes - p_bytes, 0),
    expires_at = case
      when greatest(reservations.reserved_bytes - p_bytes, 0) = 0 then now()
      else reservations.expires_at
    end,
    updated_at = now()
  where reservations.vendor_profile_id = p_vendor_profile_id;
end;
$$;

revoke execute on function public.reserve_vendor_media_bytes(uuid, bigint, bigint)
  from public, anon, authenticated;
revoke execute on function public.release_vendor_media_bytes(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.reserve_vendor_media_bytes(uuid, bigint, bigint)
  to service_role;
grant execute on function public.release_vendor_media_bytes(uuid, bigint)
  to service_role;
