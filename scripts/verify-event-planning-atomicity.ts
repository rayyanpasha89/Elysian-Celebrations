import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260831140500_atomic_event_planning_save.sql";
const FUNCTION_SIGNATURE =
  "public.save_event_planning(text,uuid,jsonb,jsonb,jsonb,jsonb)";

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

function planningPayload(
  suffix: string,
  ids: {
    menuId?: string;
    itemId?: string;
    taskId?: string;
    requirementId?: string;
  } = {}
) {
  return {
    menus: [
      {
        ...(ids.menuId ? { id: ids.menuId } : {}),
        name: `${suffix} menu`,
        meal_period: "DINNER",
        service_style: "PLATED",
        notes: `${suffix} menu notes`,
        items: [
          {
            ...(ids.itemId ? { id: ids.itemId } : {}),
            name: `${suffix} starter`,
            course: "STARTER",
            dietary_tags: ["vegetarian"],
            notes: `${suffix} item notes`,
          },
        ],
      },
    ],
    logistics: {
      guest_arrival_time: suffix === "Initial" ? "18:00" : "18:30",
      vendor_load_in_time: "15:00",
      family_call_time: "17:00",
      transport_notes: `${suffix} transport`,
      rooming_notes: null,
      weather_plan: `${suffix} rain plan`,
      ceremony_notes: null,
    },
    tasks: [
      {
        ...(ids.taskId ? { id: ids.taskId } : {}),
        title: `${suffix} run of show`,
        owner: "Planner",
        status: suffix === "Initial" ? "OPEN" : "IN_PROGRESS",
        due_date: "2026-12-01T09:00:00.000Z",
      },
    ],
    requirements: [
      {
        ...(ids.requirementId ? { id: ids.requirementId } : {}),
        category: "decor",
        title: `${suffix} decor`,
        status: "NEEDS_VENDOR",
        priority: "HIGH",
        vendor_profile_id: null,
        vendor_service_id: null,
        payload: { direction: suffix },
        notes: `${suffix} requirement notes`,
      },
    ],
  };
}

async function savePlanning(
  client: Client,
  actorUserId: string,
  eventId: string,
  payload: ReturnType<typeof planningPayload>,
  requirements: unknown = payload.requirements
) {
  return client.query(
    `select public.save_event_planning(
       $1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb
     ) as result`,
    [
      actorUserId,
      eventId,
      JSON.stringify(payload.menus),
      JSON.stringify(payload.logistics),
      JSON.stringify(payload.tasks),
      requirements === null ? null : JSON.stringify(requirements),
    ]
  );
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const userId = `verify_atomic_${suffix}`;
  const otherUserId = `verify_atomic_other_${suffix}`;
  const profileId = randomUUID();

  try {
    const artifacts = await client.query(
      `select
         to_regprocedure($1) is not null as function_exists,
         not has_function_privilege('anon', $1, 'execute') as anon_denied,
         not has_function_privilege('authenticated', $1, 'execute') as authenticated_denied,
         has_function_privilege('service_role', $1, 'execute') as service_allowed`,
      [FUNCTION_SIGNATURE]
    );
    assert.deepEqual(
      artifacts.rows[0],
      {
        function_exists: true,
        anon_denied: true,
        authenticated_denied: true,
        service_allowed: true,
      },
      `Atomic planning RPC is missing or exposed. Apply ${MIGRATION_PATH} first.`
    );

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $3, 'Atomic Owner', 'CLIENT'),
         ($2, $4, 'Atomic Other', 'CLIENT')`,
      [
        userId,
        otherUserId,
        `${userId}@example.test`,
        `${otherUserId}@example.test`,
      ]
    );
    await client.query(
      "insert into public.client_profiles (id, user_id) values ($1, $2)",
      [profileId, userId]
    );
    const weddingId = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Atomic verification') returning id`,
        [profileId]
      )
    ).rows[0].id as string;
    const dayId = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name, sort_order)
         values ($1, 'Day 1', 0) returning id`,
        [weddingId]
      )
    ).rows[0].id as string;
    const eventId = (
      await client.query(
        `insert into public.wedding_events (
           wedding_id, wedding_day_id, name, sort_order
         ) values ($1, $2, 'Evening', 0) returning id`,
        [weddingId, dayId]
      )
    ).rows[0].id as string;

    const initial = planningPayload("Initial");
    await savePlanning(client, userId, eventId, initial);

    const inserted = await client.query(
      `select
         (select id from public.wedding_event_menus where wedding_event_id = $1) as menu_id,
         (
           select item.id
           from public.wedding_event_menu_items as item
           join public.wedding_event_menus as menu on menu.id = item.menu_id
           where menu.wedding_event_id = $1
         ) as item_id,
         (select id from public.wedding_event_tasks where wedding_event_id = $1) as task_id,
         (select id from public.wedding_event_requirements where wedding_event_id = $1) as requirement_id`,
      [eventId]
    );
    const ids = {
      menuId: inserted.rows[0].menu_id as string,
      itemId: inserted.rows[0].item_id as string,
      taskId: inserted.rows[0].task_id as string,
      requirementId: inserted.rows[0].requirement_id as string,
    };
    assert.ok(Object.values(ids).every(Boolean), "initial save must create every child");

    const updated = planningPayload("Updated", ids);
    await savePlanning(client, userId, eventId, updated);
    const preserved = await client.query(
      `select
         (select id from public.wedding_event_menus where wedding_event_id = $1) as menu_id,
         (
           select item.id
           from public.wedding_event_menu_items as item
           join public.wedding_event_menus as menu on menu.id = item.menu_id
           where menu.wedding_event_id = $1
         ) as item_id,
         (select id from public.wedding_event_tasks where wedding_event_id = $1) as task_id,
         (select id from public.wedding_event_requirements where wedding_event_id = $1) as requirement_id`,
      [eventId]
    );
    assert.deepEqual(preserved.rows[0], {
      menu_id: ids.menuId,
      item_id: ids.itemId,
      task_id: ids.taskId,
      requirement_id: ids.requirementId,
    });

    const lateFailure = planningPayload("Broken", ids);
    const brokenRequirements = lateFailure.requirements.map((requirement, index) =>
      index === 0
        ? { ...requirement, vendor_service_id: randomUUID() }
        : requirement
    );
    await expectDatabaseError(
      client,
      () => savePlanning(client, userId, eventId, lateFailure, brokenRequirements),
      "23503",
      "late requirement validation"
    );

    const afterFailure = await client.query(
      `select
         (select name from public.wedding_event_menus where wedding_event_id = $1) as menu_name,
         (select guest_arrival_time from public.wedding_event_logistics where wedding_event_id = $1) as arrival,
         (select title from public.wedding_event_tasks where wedding_event_id = $1) as task_title,
         (select title from public.wedding_event_requirements where wedding_event_id = $1) as requirement_title`,
      [eventId]
    );
    assert.deepEqual(afterFailure.rows[0], {
      menu_name: "Updated menu",
      arrival: "18:30",
      task_title: "Updated run of show",
      requirement_title: "Updated decor",
    });

    await expectDatabaseError(
      client,
      () => savePlanning(client, otherUserId, eventId, updated),
      "42501",
      "cross-owner save"
    );

    const preserveRequirements = planningPayload("Preserved", ids);
    await savePlanning(client, userId, eventId, preserveRequirements, null);
    const requirementAfterOmission = await client.query(
      "select title from public.wedding_event_requirements where wedding_event_id = $1",
      [eventId]
    );
    assert.equal(requirementAfterOmission.rows[0].title, "Updated decor");

    await savePlanning(client, userId, eventId, preserveRequirements, []);
    const cleared = await client.query(
      "select count(*)::int as count from public.wedding_event_requirements where wedding_event_id = $1",
      [eventId]
    );
    assert.equal(cleared.rows[0].count, 0, "an explicit empty list must clear requirements");

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[userId, otherUserId]]
    );
    assert.equal(persisted.rows[0].count, 0, "verification must leave no rows behind");

    console.log(
      "Atomic event planning: 7 focused cases passed with a full rollback."
    );
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // The connection may already be outside a transaction.
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
