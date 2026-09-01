import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260831140500_atomic_event_planning_save.sql";
const FUNCTION_SIGNATURE =
  "public.save_event_planning(text,uuid,jsonb,jsonb,jsonb,jsonb)";
const WORKSPACE_MIGRATION_PATH =
  "supabase/migrations/20260901035842_save_event_workspace_atomic.sql";
const WORKSPACE_FUNCTION_SIGNATURE =
  "public.save_event_workspace(text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)";

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

function eventPayload(
  weddingDayId: string,
  name: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    wedding_day_id: weddingDayId,
    name,
    event_type: "Conference session",
    date: "2026-12-20T09:00:00.000Z",
    start_time: "09:00",
    end_time: "12:00",
    venue: "Atomic Hall",
    venue_id: null,
    guest_count: 120,
    estimated_budget: 250000,
    food_style: "Plated",
    food_preferences: ["vegetarian"],
    menu_notes: "Workspace menu notes",
    decor_style: "Editorial",
    decor_notes: "Workspace decor notes",
    attire_notes: "Formal",
    notes: "Workspace notes",
    requirement_payload: { stepNotes: { basics: "Atomic save" } },
    ...overrides,
  };
}

async function saveWorkspace(
  client: Client,
  actorUserId: string,
  eventId: string,
  event: Record<string, unknown>,
  planning: ReturnType<typeof planningPayload>,
  vendorSelections: unknown
) {
  return client.query(
    `select public.save_event_workspace(
       $1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb,
       $8::jsonb
     ) as result`,
    [
      actorUserId,
      eventId,
      JSON.stringify(event),
      JSON.stringify(planning.menus),
      JSON.stringify(planning.logistics),
      JSON.stringify(planning.tasks),
      JSON.stringify(planning.requirements),
      JSON.stringify(vendorSelections),
    ]
  );
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const userId = `verify_atomic_${suffix}`;
  const otherUserId = `verify_atomic_other_${suffix}`;
  const vendorUserId = `verify_atomic_vendor_${suffix}`;
  const profileId = randomUUID();

  try {
    const artifacts = await client.query(
      `select
         to_regprocedure($1) is not null as function_exists,
         not has_function_privilege('anon', $1, 'execute') as anon_denied,
         not has_function_privilege('authenticated', $1, 'execute') as authenticated_denied,
         has_function_privilege('service_role', $1, 'execute') as service_allowed,
         to_regprocedure($2) is not null as workspace_function_exists,
         not has_function_privilege('anon', $2, 'execute') as workspace_anon_denied,
         not has_function_privilege('authenticated', $2, 'execute') as workspace_authenticated_denied,
         has_function_privilege('service_role', $2, 'execute') as workspace_service_allowed`,
      [FUNCTION_SIGNATURE, WORKSPACE_FUNCTION_SIGNATURE]
    );
    assert.deepEqual(
      artifacts.rows[0],
      {
        function_exists: true,
        anon_denied: true,
        authenticated_denied: true,
        service_allowed: true,
        workspace_function_exists: true,
        workspace_anon_denied: true,
        workspace_authenticated_denied: true,
        workspace_service_allowed: true,
      },
      `Atomic RPC is missing or exposed. Apply ${MIGRATION_PATH} and ${WORKSPACE_MIGRATION_PATH} first.`
    );

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $3, 'Atomic Owner', 'CLIENT'),
         ($2, $4, 'Atomic Other', 'CLIENT'),
         ($5, $6, 'Atomic Vendor', 'VENDOR')`,
      [
        userId,
        otherUserId,
        `${userId}@example.test`,
        `${otherUserId}@example.test`,
        vendorUserId,
        `${vendorUserId}@example.test`,
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
    const vendorCategoryId = (
      await client.query(
        `insert into public.vendor_categories (name, slug)
         values ($1, $2) returning id`,
        [`Atomic Catering ${suffix}`, `atomic-catering-${suffix}`]
      )
    ).rows[0].id as string;
    const vendorProfileId = (
      await client.query(
        `insert into public.vendor_profiles (
           user_id, category_id, business_name, slug, is_verified,
           accepting_inquiries
         ) values ($1, $2, $3, $4, true, true) returning id`,
        [
          vendorUserId,
          vendorCategoryId,
          `Atomic Caterer ${suffix}`,
          `atomic-caterer-${suffix}`,
        ]
      )
    ).rows[0].id as string;
    const vendorServiceId = (
      await client.query(
        `insert into public.vendor_services (
           vendor_profile_id, name, base_price, unit, is_active
         ) values ($1, 'Atomic dinner', 1200, 'per guest', true) returning id`,
        [vendorProfileId]
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

    const workspacePlanning = planningPayload("Workspace", {
      menuId: ids.menuId,
      itemId: ids.itemId,
      taskId: ids.taskId,
    });
    const desiredVendorSelections = [
      {
        vendor_profile_id: vendorProfileId,
        vendor_service_id: vendorServiceId,
      },
    ];
    await saveWorkspace(
      client,
      userId,
      eventId,
      eventPayload(dayId, "Workspace function"),
      workspacePlanning,
      desiredVendorSelections
    );

    const workspaceSaved = await client.query(
      `select
         (select name from public.wedding_events where id = $1) as event_name,
         (select venue from public.wedding_events where id = $1) as venue,
         (select name from public.wedding_event_menus where wedding_event_id = $1) as menu_name,
         (select count(*)::int from public.bookings where wedding_event_id = $1 and status <> 'CANCELLED') as booking_count,
         (select event_date from public.bookings where wedding_event_id = $1 and status <> 'CANCELLED') as booking_date`,
      [eventId]
    );
    assert.deepEqual(
      {
        event_name: workspaceSaved.rows[0].event_name,
        venue: workspaceSaved.rows[0].venue,
        menu_name: workspaceSaved.rows[0].menu_name,
        booking_count: workspaceSaved.rows[0].booking_count,
        booking_date: new Date(workspaceSaved.rows[0].booking_date).toISOString(),
      },
      {
        event_name: "Workspace function",
        venue: "Atomic Hall",
        menu_name: "Workspace menu",
        booking_count: 1,
        booking_date: "2026-12-20T09:00:00.000Z",
      }
    );

    const bookingId = (
      await client.query(
        `select id from public.bookings
         where wedding_event_id = $1 and status <> 'CANCELLED'`,
        [eventId]
      )
    ).rows[0].id as string;

    const paymentId = (
      await client.query(
        `insert into public.payments (
           kind, client_profile_id, wedding_id, booking_id, label, amount
         ) values ('CLIENT_IN', $1, $2, $3, 'Legacy inquiry payment', 100)
         returning id`,
        [profileId, weddingId, bookingId]
      )
    ).rows[0].id as string;
    await expectDatabaseError(
      client,
      () =>
        saveWorkspace(
          client,
          userId,
          eventId,
          eventPayload(dayId, "Financial history must roll back"),
          workspacePlanning,
          []
        ),
      "55000",
      "inquiry financial history removal"
    );
    const afterFinancialConflict = await client.query(
      "select name from public.wedding_events where id = $1",
      [eventId]
    );
    assert.equal(afterFinancialConflict.rows[0].name, "Workspace function");
    await client.query("delete from public.payments where id = $1", [paymentId]);
    await client.query(
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [bookingId]
    );

    const rollbackPlanning = planningPayload("Must roll back", {
      menuId: ids.menuId,
      itemId: ids.itemId,
      taskId: ids.taskId,
    });
    await expectDatabaseError(
      client,
      () =>
        saveWorkspace(
          client,
          userId,
          eventId,
          eventPayload(dayId, "Must roll back"),
          rollbackPlanning,
          []
        ),
      "55000",
      "progressed booking removal"
    );

    const workspaceAfterConflict = await client.query(
      `select
         (select name from public.wedding_events where id = $1) as event_name,
         (select name from public.wedding_event_menus where wedding_event_id = $1) as menu_name,
         (select status from public.bookings where id = $2) as booking_status`,
      [eventId, bookingId]
    );
    assert.deepEqual(workspaceAfterConflict.rows[0], {
      event_name: "Workspace function",
      menu_name: "Workspace menu",
      booking_status: "CONFIRMED",
    });

    await expectDatabaseError(
      client,
      () =>
        saveWorkspace(
          client,
          otherUserId,
          eventId,
          eventPayload(dayId, "Cross-owner workspace"),
          workspacePlanning,
          desiredVendorSelections
        ),
      "42501",
      "cross-owner workspace save"
    );

    await client.query(
      "update public.vendor_profiles set accepting_inquiries = false where id = $1",
      [vendorProfileId]
    );
    await saveWorkspace(
      client,
      userId,
      eventId,
      eventPayload(dayId, "Existing vendor preserved"),
      workspacePlanning,
      desiredVendorSelections
    );
    const preservedPausedVendor = await client.query(
      `select name,
        (select count(*)::int from public.bookings where wedding_event_id = $1 and status <> 'CANCELLED') as booking_count
       from public.wedding_events where id = $1`,
      [eventId]
    );
    assert.deepEqual(preservedPausedVendor.rows[0], {
      name: "Existing vendor preserved",
      booking_count: 1,
    });

    const pausedVendorServiceId = (
      await client.query(
        `insert into public.vendor_services (
           vendor_profile_id, name, base_price, unit, is_active
         ) values ($1, 'Paused vendor add-on', 600, 'per guest', true)
         returning id`,
        [vendorProfileId]
      )
    ).rows[0].id as string;
    await expectDatabaseError(
      client,
      () =>
        saveWorkspace(
          client,
          userId,
          eventId,
          eventPayload(dayId, "Paused addition must roll back"),
          workspacePlanning,
          [
            ...desiredVendorSelections,
            {
              vendor_profile_id: vendorProfileId,
              vendor_service_id: pausedVendorServiceId,
            },
          ]
        ),
      "23503",
      "paused vendor new selection"
    );
    const afterPausedAddition = await client.query(
      "select name from public.wedding_events where id = $1",
      [eventId]
    );
    assert.equal(afterPausedAddition.rows[0].name, "Existing vendor preserved");

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[userId, otherUserId, vendorUserId]]
    );
    assert.equal(persisted.rows[0].count, 0, "verification must leave no rows behind");

    console.log(
      "Atomic event workspace: 15 focused cases passed with a full rollback."
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
