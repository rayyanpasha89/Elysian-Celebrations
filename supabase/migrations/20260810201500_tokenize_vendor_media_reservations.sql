-- Give every in-flight upload its own reservation identity. Aggregate counters
-- cannot safely distinguish an expired upload from a newer one when releases
-- arrive out of order.
drop function if exists public.reserve_vendor_media_bytes(uuid, bigint, bigint);
drop function if exists public.release_vendor_media_bytes(uuid, bigint);

drop table public.vendor_media_quota_reservations;

create table public.vendor_media_quota_reservations (
  reservation_id uuid primary key,
  vendor_profile_id uuid not null
    references public.vendor_profiles(id) on delete cascade,
  reserved_bytes bigint not null check (reserved_bytes > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index vendor_media_quota_reservations_vendor_idx
  on public.vendor_media_quota_reservations(vendor_profile_id, expires_at);

alter table public.vendor_media_quota_reservations enable row level security;
revoke all privileges on table public.vendor_media_quota_reservations
  from anon, authenticated;

create or replace function public.reserve_vendor_media_bytes(
  p_vendor_profile_id uuid,
  p_reservation_id uuid,
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
  if p_reservation_id is null then
    raise exception 'Invalid media reservation id';
  end if;
  if p_bytes < 1 or p_bytes > 4194304 then
    raise exception 'Invalid media reservation size';
  end if;
  if p_quota_bytes < p_bytes or p_quota_bytes > 1073741824 then
    raise exception 'Invalid media quota';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_vendor_profile_id::text, 0)
  );

  delete from public.vendor_media_quota_reservations as reservations
  where reservations.vendor_profile_id = p_vendor_profile_id
    and reservations.expires_at <= v_now;

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

  select coalesce(sum(reservations.reserved_bytes), 0)
  into v_reserved_bytes
  from public.vendor_media_quota_reservations as reservations
  where reservations.vendor_profile_id = p_vendor_profile_id
    and reservations.expires_at > v_now;

  allowed := v_used_bytes + v_reserved_bytes + p_bytes <= p_quota_bytes;
  if allowed then
    insert into public.vendor_media_quota_reservations (
      reservation_id,
      vendor_profile_id,
      reserved_bytes,
      expires_at
    ) values (
      p_reservation_id,
      p_vendor_profile_id,
      p_bytes,
      v_now + interval '15 minutes'
    );
    v_reserved_bytes := v_reserved_bytes + p_bytes;
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
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reservation_id is null then
    raise exception 'Invalid media reservation id';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_vendor_profile_id::text, 0)
  );

  delete from public.vendor_media_quota_reservations as reservations
  where reservations.reservation_id = p_reservation_id
    and reservations.vendor_profile_id = p_vendor_profile_id;
end;
$$;

revoke execute on function public.reserve_vendor_media_bytes(uuid, uuid, bigint, bigint)
  from public, anon, authenticated;
revoke execute on function public.release_vendor_media_bytes(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_vendor_media_bytes(uuid, uuid, bigint, bigint)
  to service_role;
grant execute on function public.release_vendor_media_bytes(uuid, uuid)
  to service_role;
