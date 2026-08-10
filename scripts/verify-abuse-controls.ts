import "dotenv/config";

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const BASE_MIGRATION_PATH =
  "supabase/migrations/20260810181932_add_api_rate_limits.sql";
const TOKEN_MIGRATION_PATH =
  "supabase/migrations/20260810201500_tokenize_vendor_media_reservations.sql";

function databaseClient() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");

  const url = new URL(connectionString);
  return new Client({
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
    ssl:
      url.searchParams.get("sslmode") === "disable"
        ? undefined
        : { rejectUnauthorized: false },
  });
}

async function main() {
  const client = databaseClient();
  await client.connect();

  try {
    await client.query("begin");

    const existing = await client.query<{ table_name: string | null }>(
      "select to_regclass('public.api_rate_limits')::text as table_name"
    );
    if (!existing.rows[0]?.table_name) {
      await client.query(await readFile(BASE_MIGRATION_PATH, "utf8"));
    }

    const tokenizedReservations = await client.query<{ exists: boolean }>(`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'vendor_media_quota_reservations'
          and column_name = 'reservation_id'
      )
    `);
    if (!tokenizedReservations.rows[0]?.exists) {
      await client.query(await readFile(TOKEN_MIGRATION_PATH, "utf8"));
    }

    const key = createHash("sha256").update(randomUUID()).digest("hex");
    const first = await client.query<{ allowed: boolean }>(
      "select * from public.consume_api_rate_limit($1, 2, 60)",
      [key]
    );
    const second = await client.query<{ allowed: boolean }>(
      "select * from public.consume_api_rate_limit($1, 2, 60)",
      [key]
    );
    const third = await client.query<{ allowed: boolean }>(
      "select * from public.consume_api_rate_limit($1, 2, 60)",
      [key]
    );
    assert.equal(first.rows[0]?.allowed, true);
    assert.equal(second.rows[0]?.allowed, true);
    assert.equal(third.rows[0]?.allowed, false);

    const permissions = await client.query<{
      anon_can_execute: boolean;
      service_can_execute: boolean;
      rls_enabled: boolean;
      anon_can_reserve: boolean;
      service_can_reserve: boolean;
      reservation_rls_enabled: boolean;
    }>(`
      select
        has_function_privilege(
          'anon',
          'public.consume_api_rate_limit(text,integer,integer)',
          'EXECUTE'
        ) as anon_can_execute,
        has_function_privilege(
          'service_role',
          'public.consume_api_rate_limit(text,integer,integer)',
          'EXECUTE'
        ) as service_can_execute,
        (
          select relrowsecurity
          from pg_catalog.pg_class
          where oid = 'public.api_rate_limits'::regclass
        ) as rls_enabled,
        has_function_privilege(
          'anon',
          'public.reserve_vendor_media_bytes(uuid,uuid,bigint,bigint)',
          'EXECUTE'
        ) as anon_can_reserve,
        has_function_privilege(
          'service_role',
          'public.reserve_vendor_media_bytes(uuid,uuid,bigint,bigint)',
          'EXECUTE'
        ) as service_can_reserve,
        (
          select relrowsecurity
          from pg_catalog.pg_class
          where oid = 'public.vendor_media_quota_reservations'::regclass
        ) as reservation_rls_enabled
    `);
    assert.equal(permissions.rows[0]?.anon_can_execute, false);
    assert.equal(permissions.rows[0]?.service_can_execute, true);
    assert.equal(permissions.rows[0]?.rls_enabled, true);
    assert.equal(permissions.rows[0]?.anon_can_reserve, false);
    assert.equal(permissions.rows[0]?.service_can_reserve, true);
    assert.equal(permissions.rows[0]?.reservation_rls_enabled, true);

    const vendor = await client.query<{ id: string }>(
      "select id from public.vendor_profiles order by created_at asc limit 1"
    );
    if (vendor.rows[0]?.id) {
      const vendorId = vendor.rows[0].id;
      const expiredReservationId = randomUUID();
      const activeReservationId = randomUUID();
      const laterReservationId = randomUUID();
      const firstReservation = await client.query<{
        allowed: boolean;
        reserved_bytes: string;
      }>(
        "select * from public.reserve_vendor_media_bytes($1, $2, 1024, 1073741824)",
        [vendorId, expiredReservationId]
      );
      assert.equal(firstReservation.rows[0]?.allowed, true);
      await client.query(
        `update public.vendor_media_quota_reservations
         set expires_at = clock_timestamp() - interval '1 second'
         where reservation_id = $1`,
        [expiredReservationId]
      );

      const secondReservation = await client.query<{
        allowed: boolean;
        reserved_bytes: string;
      }>(
        "select * from public.reserve_vendor_media_bytes($1, $2, 2048, 1073741824)",
        [vendorId, activeReservationId]
      );
      assert.equal(secondReservation.rows[0]?.allowed, true);
      assert.equal(Number(secondReservation.rows[0]?.reserved_bytes), 2048);

      const laterReservation = await client.query<{
        allowed: boolean;
        reserved_bytes: string;
      }>(
        "select * from public.reserve_vendor_media_bytes($1, $2, 4096, 1073741824)",
        [vendorId, laterReservationId]
      );
      assert.equal(laterReservation.rows[0]?.allowed, true);
      assert.equal(Number(laterReservation.rows[0]?.reserved_bytes), 6144);

      // A stale completion must not release bytes owned by newer uploads.
      await client.query(
        "select public.release_vendor_media_bytes($1, $2)",
        [vendorId, expiredReservationId]
      );
      const stillReserved = await client.query<{ reserved_bytes: string }>(
        `select coalesce(sum(reserved_bytes), 0) as reserved_bytes
         from public.vendor_media_quota_reservations
         where vendor_profile_id = $1 and expires_at > clock_timestamp()`,
        [vendorId]
      );
      assert.equal(Number(stillReserved.rows[0]?.reserved_bytes), 6144);

      await client.query(
        "select public.release_vendor_media_bytes($1, $2)",
        [vendorId, activeReservationId]
      );
      await client.query(
        "select public.release_vendor_media_bytes($1, $2)",
        [vendorId, laterReservationId]
      );
    }

    console.log(
      "Abuse controls: rate boundary, grants, RLS, and media reservation passed."
    );
  } finally {
    await client.query("rollback").catch(() => undefined);
    await client.end();
  }
}

void main();
