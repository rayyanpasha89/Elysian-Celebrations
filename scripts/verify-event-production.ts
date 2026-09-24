import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

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
  const clientUserId = `verify_production_client_${suffix}`;
  const otherClientUserId = `verify_production_other_${suffix}`;
  const staffUserId = `verify_production_staff_${suffix}`;
  const profileId = randomUUID();
  const otherProfileId = randomUUID();

  try {
    const artifacts = await client.query(
      `select
         to_regclass('public.event_production_records') is not null as records_exist,
         to_regclass('public.event_production_attachments') is not null as attachments_exist,
         to_regclass('public.event_production_activity') is not null as activity_exists,
         not has_table_privilege('anon', 'public.event_production_records', 'select') as records_anon_denied,
         not has_table_privilege('authenticated', 'public.event_production_records', 'insert') as records_authenticated_denied,
         has_table_privilege('service_role', 'public.event_production_records', 'select') as records_service_allowed,
         has_table_privilege('service_role', 'public.event_production_attachments', 'insert') as attachments_service_allowed,
         has_table_privilege('service_role', 'public.event_production_activity', 'select') as activity_service_allowed,
         has_function_privilege(
           'service_role',
           'public.create_event_production_record(uuid,uuid,text,text,text,text,text,uuid,uuid,uuid,text,timestamptz,bigint,text,jsonb,text,jsonb)',
           'execute'
         ) as create_rpc_service_allowed`
    );
    assert.deepEqual(artifacts.rows[0], {
      records_exist: true,
      attachments_exist: true,
      activity_exists: true,
      records_anon_denied: true,
      records_authenticated_denied: true,
      records_service_allowed: true,
      attachments_service_allowed: true,
      activity_service_allowed: true,
      create_rpc_service_allowed: true,
    });

    await client.query("begin");
    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Production Client', 'CLIENT'),
         ($2, $5, 'Other Production Client', 'CLIENT'),
         ($3, $6, 'Production Lead', 'MANAGER')`,
      [
        clientUserId,
        otherClientUserId,
        staffUserId,
        `${clientUserId}@example.test`,
        `${otherClientUserId}@example.test`,
        `${staffUserId}@example.test`,
      ]
    );
    await client.query(
      `insert into public.client_profiles (id, user_id)
       values ($1, $2), ($3, $4)`,
      [profileId, clientUserId, otherProfileId, otherClientUserId]
    );

    const eventA = (
      await client.query(
        "insert into public.weddings (client_profile_id, name) values ($1, 'Production A') returning id",
        [profileId]
      )
    ).rows[0].id as string;
    const eventB = (
      await client.query(
        "insert into public.weddings (client_profile_id, name) values ($1, 'Production B') returning id",
        [otherProfileId]
      )
    ).rows[0].id as string;
    const functionB = (
      await client.query(
        "insert into public.wedding_events (wedding_id, name) values ($1, 'Foreign function') returning id",
        [eventB]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.event_production_records (
             wedding_id, wedding_event_id, record_type, title, created_by, updated_by
           ) values ($1, $2, 'LICENSE', 'Cross-event license', $3, $3)`,
          [eventA, functionB, staffUserId]
        ),
      "23503",
      "cross-event production function"
    );

    const rpcRecordId = (
      await client.query(
        `select public.create_event_production_record(
           $1, null, 'RIDER', 'Atomic technical rider', null, 'OPEN',
           'OPERATIONS', null, null, null, 'Production lead', null, null,
           'INR', '{"source":"verification"}'::jsonb, $2,
           '[{"title":"Rider reference","url":"https://example.test/rider","classification":"INTERNAL"}]'::jsonb
         ) as id`,
        [eventA, staffUserId]
      )
    ).rows[0].id as string;
    const atomicRecord = await client.query(
      `select
         (select count(*)::int from public.event_production_attachments where record_id = $1) as attachments,
         (select count(*)::int from public.event_production_activity where record_id = $1) as activity`,
      [rpcRecordId]
    );
    assert.deepEqual(atomicRecord.rows[0], { attachments: 1, activity: 1 });

    const recordsBeforeFailedRpc = Number(
      (await client.query("select count(*) from public.event_production_records where wedding_id = $1", [eventA])).rows[0].count
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.create_event_production_record(
             $1, null, 'DOCUMENT', 'Must roll back', null, 'OPEN',
             'OPERATIONS', null, null, null, null, null, null,
             'INR', '{}'::jsonb, $2,
             '[{"title":"Broken reference","url":"","classification":"INTERNAL"}]'::jsonb
           )`,
          [eventA, staffUserId]
        ),
      "23514",
      "atomic production record rollback"
    );
    const recordsAfterFailedRpc = Number(
      (await client.query("select count(*) from public.event_production_records where wedding_id = $1", [eventA])).rows[0].count
    );
    assert.equal(recordsAfterFailedRpc, recordsBeforeFailedRpc);

    const recordId = (
      await client.query(
        `insert into public.event_production_records (
           wedding_id, record_type, title, status, visibility,
           owner_label, due_at, amount, payload, created_by, updated_by
         ) values (
           $1, 'LICENSE', 'Music permissions', 'OPEN', 'OPERATIONS',
           'Production lead', '2027-02-18T12:00:00Z', 125000,
           '{"authority":"Rights society"}'::jsonb, $2, $2
         ) returning id`,
        [eventA, staffUserId]
      )
    ).rows[0].id as string;

    await client.query(
      `insert into public.event_production_attachments (
         wedding_id, record_id, title, url, classification, created_by
       ) values ($1, $2, 'Application receipt', 'https://example.test/receipt', 'INTERNAL', $3)`,
      [eventA, recordId, staffUserId]
    );
    await client.query(
      `update public.event_production_records
       set status = 'IN_PROGRESS', version = version + 1, updated_by = $2
       where id = $1`,
      [recordId, staffUserId]
    );

    const result = await client.query(
      `select
         record.status,
         record.version,
         count(distinct attachment.id)::int as attachment_count,
         count(distinct activity.id)::int as activity_count
       from public.event_production_records record
       left join public.event_production_attachments attachment on attachment.record_id = record.id
       left join public.event_production_activity activity on activity.record_id = record.id
       where record.id = $1
       group by record.id`,
      [recordId]
    );
    assert.deepEqual(result.rows[0], {
      status: "IN_PROGRESS",
      version: 2,
      attachment_count: 1,
      activity_count: 2,
    });

    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.event_production_activity set action = 'ALTERED' where record_id = $1",
          [recordId]
        ),
      "42501",
      "append-only production activity"
    );

    await client.query("delete from public.weddings where id = $1", [eventA]);
    const cascaded = await client.query(
      `select
         (select count(*)::int from public.event_production_records where wedding_id = $1) as records,
         (select count(*)::int from public.event_production_attachments where wedding_id = $1) as attachments,
         (select count(*)::int from public.event_production_activity where wedding_id = $1) as activity`,
      [eventA]
    );
    assert.deepEqual(cascaded.rows[0], {
      records: 0,
      attachments: 0,
      activity: 0,
    });

    await client.query("rollback");
    console.log("Event production verification passed.");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main();
