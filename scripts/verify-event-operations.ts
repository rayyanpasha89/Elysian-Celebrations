import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260923190000_event_operations_command_center.sql";

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

async function expectDatabaseError(
  client: Client,
  query: () => Promise<unknown>,
  expectedCode: string,
  label: string
) {
  const savepoint = `verify_${randomUUID().replaceAll("-", "")}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    await query();
    assert.fail(`${label}: expected database error ${expectedCode}`);
  } catch (error) {
    assert.equal(
      (error as { code?: string }).code,
      expectedCode,
      `${label}: unexpected database error`
    );
  } finally {
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query(`release savepoint ${savepoint}`);
  }
}

async function main() {
  const client = databaseClient();
  await client.connect();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const clientUserId = `verify_ops_client_${suffix}`;
  const staffA = `verify_ops_staff_a_${suffix}`;
  const staffB = `verify_ops_staff_b_${suffix}`;
  const clientProfileId = randomUUID();

  try {
    const artifacts = await client.query(
      `select
         to_regclass('public.operations_staff_profiles') is not null as profiles_exist,
         to_regclass('public.event_staff_assignments') is not null as assignments_exist,
         to_regclass('public.event_operations_items') is not null as items_exist,
         not has_table_privilege('anon', 'public.operations_staff_profiles', 'select') as profiles_anon_denied,
         not has_table_privilege('authenticated', 'public.event_staff_assignments', 'select') as assignments_authenticated_denied,
         not has_table_privilege('authenticated', 'public.event_operations_items', 'insert') as items_authenticated_denied,
         has_table_privilege('service_role', 'public.operations_staff_profiles', 'select') as profiles_service_allowed,
         has_table_privilege('service_role', 'public.event_staff_assignments', 'insert') as assignments_service_allowed,
         has_table_privilege('service_role', 'public.event_operations_items', 'update') as items_service_allowed,
         not has_function_privilege(
           'authenticated',
           'public.validate_event_operations_assignee()',
           'execute'
         ) as validator_private`
    );
    assert.deepEqual(
      artifacts.rows[0],
      {
        profiles_exist: true,
        assignments_exist: true,
        items_exist: true,
        profiles_anon_denied: true,
        assignments_authenticated_denied: true,
        items_authenticated_denied: true,
        profiles_service_allowed: true,
        assignments_service_allowed: true,
        items_service_allowed: true,
        validator_private: true,
      },
      `Operations security artifacts are missing. Apply ${MIGRATION_PATH} first.`
    );

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Operations Client', 'CLIENT'),
         ($2, $5, 'Operations Lead', 'MANAGER'),
         ($3, $6, 'Operations Observer', 'MANAGER')`,
      [
        clientUserId,
        staffA,
        staffB,
        `${clientUserId}@example.test`,
        `${staffA}@example.test`,
        `${staffB}@example.test`,
      ]
    );
    await client.query(
      "insert into public.client_profiles (id, user_id) values ($1, $2)",
      [clientProfileId, clientUserId]
    );
    const weddingA = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Operations A') returning id`,
        [clientProfileId]
      )
    ).rows[0].id as string;
    const dayA = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name)
         values ($1, 'Day A') returning id`,
        [weddingA]
      )
    ).rows[0].id as string;
    const functionA = (
      await client.query(
        `insert into public.wedding_events (wedding_id, wedding_day_id, name)
         values ($1, $2, 'Opening session') returning id`,
        [weddingA, dayA]
      )
    ).rows[0].id as string;

    const otherClient = `verify_ops_other_${suffix}`;
    const otherProfile = randomUUID();
    await client.query(
      `insert into public.users (id, email, name, role)
       values ($1, $2, 'Other Operations Client', 'CLIENT')`,
      [otherClient, `${otherClient}@example.test`]
    );
    await client.query(
      "insert into public.client_profiles (id, user_id) values ($1, $2)",
      [otherProfile, otherClient]
    );
    const weddingB = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Operations B') returning id`,
        [otherProfile]
      )
    ).rows[0].id as string;
    const dayB = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name)
         values ($1, 'Day B') returning id`,
        [weddingB]
      )
    ).rows[0].id as string;
    const functionB = (
      await client.query(
        `insert into public.wedding_events (wedding_id, wedding_day_id, name)
         values ($1, $2, 'Other session') returning id`,
        [weddingB, dayB]
      )
    ).rows[0].id as string;

    await client.query(
      `insert into public.operations_staff_profiles (
         user_id, role_template, permissions, created_by, updated_by
       ) values
         ($1, 'OPS_LEAD', array['VIEW_EVENT','MANAGE_INCIDENTS'], $1, $1),
         ($2, 'VIEWER', array['VIEW_EVENT'], $1, $1)`,
      [staffA, staffB]
    );
    await client.query(
      `insert into public.event_staff_assignments (
         wedding_id, staff_user_id, event_role, assigned_by
       ) values ($1, $2, 'Floor lead', $2)`,
      [weddingA, staffA]
    );

    const itemId = (
      await client.query(
        `insert into public.event_operations_items (
           wedding_id, wedding_event_id, kind, severity, title,
           assignee_user_id, reported_by
         ) values ($1, $2, 'INCIDENT', 'URGENT', 'Guest transport delayed', $3, $3)
         returning id`,
        [weddingA, functionA, staffA]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.event_operations_items (
             wedding_id, wedding_event_id, title, reported_by
           ) values ($1, $2, 'Cross-event function', $3)`,
          [weddingA, functionB, staffA]
        ),
      "23503",
      "cross-event function"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.event_operations_items (
             wedding_id, title, assignee_user_id, reported_by
           ) values ($1, 'Unassigned owner', $2, $3)`,
          [weddingA, staffB, staffA]
        ),
      "23514",
      "unassigned operations owner"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.event_operations_items set status = 'RESOLVED' where id = $1",
          [itemId]
        ),
      "23514",
      "resolution without audit metadata"
    );

    await client.query(
      `update public.event_operations_items
       set status = 'RESOLVED', resolved_at = now(), resolved_by = $2
       where id = $1`,
      [itemId, staffA]
    );
    const resolved = await client.query(
      `select status, resolved_at is not null as has_resolved_at, resolved_by
       from public.event_operations_items where id = $1`,
      [itemId]
    );
    assert.deepEqual(resolved.rows[0], {
      status: "RESOLVED",
      has_resolved_at: true,
      resolved_by: staffA,
    });

    await client.query("rollback");
    console.log("Event operations verification passed.");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main();
