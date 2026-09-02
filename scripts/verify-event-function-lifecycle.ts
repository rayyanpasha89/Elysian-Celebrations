import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const CREATE_SIGNATURE =
  "public.create_event_function(text,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb)";
const DELETE_SIGNATURE = "public.delete_event_function(text,uuid)";
const MIGRATION_PATH =
  "supabase/migrations/20260901192023_make_event_function_lifecycle_atomic.sql";

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

function eventPayload(name: string) {
  return {
    name,
    event_type: "Conference session",
    time_block: "morning",
    date: "2027-03-12T09:00:00.000Z",
    start_time: "09:00",
    end_time: "12:00",
    venue: "Lifecycle Hall",
    venue_id: null,
    guest_count: 120,
    estimated_budget: 300000,
    food_style: "Plated",
    food_preferences: ["vegetarian"],
    menu_notes: "Lifecycle menu direction",
    decor_style: "Editorial",
    decor_notes: "Lifecycle decor direction",
    attire_notes: "Business formal",
    notes: "Lifecycle verification",
    requirement_payload: { stepNotes: { basics: "Lifecycle" } },
  };
}

function planningPayload(invalidServiceId?: string) {
  return {
    menus: [
      {
        name: "Lifecycle menu",
        meal_period: "BREAKFAST",
        service_style: "PLATED",
        notes: "Lifecycle menu notes",
        items: [
          {
            name: "Seasonal starter",
            course: "STARTER",
            dietary_tags: ["vegetarian"],
            notes: "Lifecycle item",
          },
        ],
      },
    ],
    logistics: {
      guest_arrival_time: "08:30",
      vendor_load_in_time: "07:00",
      family_call_time: null,
      transport_notes: "Lifecycle shuttle",
      rooming_notes: null,
      weather_plan: "Move inside",
      ceremony_notes: null,
    },
    tasks: [
      {
        title: "Confirm lifecycle run of show",
        owner: "Planner",
        status: "OPEN",
        due_date: "2027-03-01T09:00:00.000Z",
      },
    ],
    requirements: [
      {
        category: "food",
        title: "Lifecycle catering",
        status: "NEEDS_VENDOR",
        priority: "HIGH",
        vendor_profile_id: null,
        vendor_service_id: invalidServiceId ?? null,
        payload: { dietaryMode: "mixed" },
        notes: "Confirm final covers",
      },
    ],
  };
}

async function createFunction(
  client: Client,
  actorUserId: string,
  weddingId: string,
  dayId: string,
  name: string,
  invalidServiceId?: string
) {
  const planning = planningPayload(invalidServiceId);
  return client.query(
    `select public.create_event_function(
       $1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb
     ) as event`,
    [
      actorUserId,
      weddingId,
      dayId,
      JSON.stringify(eventPayload(name)),
      JSON.stringify(planning.menus),
      JSON.stringify(planning.logistics),
      JSON.stringify(planning.tasks),
      JSON.stringify(planning.requirements),
    ]
  );
}

async function deleteFunction(client: Client, actorUserId: string, eventId: string) {
  return client.query(
    "select public.delete_event_function($1, $2) as result",
    [actorUserId, eventId]
  );
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const ownerUserId = `verify_event_lifecycle_${suffix}`;
  const otherUserId = `verify_event_lifecycle_other_${suffix}`;
  const vendorUserId = `verify_event_lifecycle_vendor_${suffix}`;
  const clientProfileId = randomUUID();

  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    if (process.env.ELYSIAN_TEST_APPLY_MIGRATION === "1") {
      await client.query(readFileSync(MIGRATION_PATH, "utf8"));
    }

    const privileges = await client.query(
      `select
         to_regprocedure($1) is not null as create_exists,
         not has_function_privilege('anon', $1, 'execute') as create_anon_denied,
         not has_function_privilege('authenticated', $1, 'execute') as create_auth_denied,
         has_function_privilege('service_role', $1, 'execute') as create_service_allowed,
         to_regprocedure($2) is not null as delete_exists,
         not has_function_privilege('anon', $2, 'execute') as delete_anon_denied,
         not has_function_privilege('authenticated', $2, 'execute') as delete_auth_denied,
         has_function_privilege('service_role', $2, 'execute') as delete_service_allowed`,
      [CREATE_SIGNATURE, DELETE_SIGNATURE]
    );
    assert.deepEqual(privileges.rows[0], {
      create_exists: true,
      create_anon_denied: true,
      create_auth_denied: true,
      create_service_allowed: true,
      delete_exists: true,
      delete_anon_denied: true,
      delete_auth_denied: true,
      delete_service_allowed: true,
    });

    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Lifecycle Owner', 'CLIENT'),
         ($2, $5, 'Lifecycle Other', 'CLIENT'),
         ($3, $6, 'Lifecycle Vendor', 'VENDOR')`,
      [
        ownerUserId,
        otherUserId,
        vendorUserId,
        `${ownerUserId}@example.test`,
        `${otherUserId}@example.test`,
        `${vendorUserId}@example.test`,
      ]
    );
    await client.query(
      "insert into public.client_profiles (id, user_id) values ($1, $2)",
      [clientProfileId, ownerUserId]
    );
    const weddingId = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Lifecycle verification') returning id`,
        [clientProfileId]
      )
    ).rows[0].id as string;
    const dayId = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name, sort_order)
         values ($1, 'Day 1', 0) returning id`,
        [weddingId]
      )
    ).rows[0].id as string;
    const vendorCategoryId = (
      await client.query(
        `insert into public.vendor_categories (name, slug)
         values ($1, $2) returning id`,
        [`Lifecycle Catering ${suffix}`, `lifecycle-catering-${suffix}`]
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
          `Lifecycle Caterer ${suffix}`,
          `lifecycle-caterer-${suffix}`,
        ]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        createFunction(
          client,
          otherUserId,
          weddingId,
          dayId,
          "Cross-owner create"
        ),
      "42501",
      "cross-owner create"
    );

    await expectDatabaseError(
      client,
      () =>
        createFunction(
          client,
          ownerUserId,
          weddingId,
          dayId,
          "Late failure must roll back",
          randomUUID()
        ),
      "23503",
      "late child validation"
    );
    const rolledBackCreate = await client.query(
      "select count(*)::int as count from public.wedding_events where wedding_id = $1",
      [weddingId]
    );
    assert.equal(rolledBackCreate.rows[0].count, 0);

    const created = await createFunction(
      client,
      ownerUserId,
      weddingId,
      dayId,
      "Atomic lifecycle function"
    );
    const eventId = (created.rows[0].event as { id: string }).id;
    assert.match(eventId, /^[0-9a-f-]{36}$/i);

    const nestedState = await client.query(
      `select
         (select count(*)::int from public.wedding_event_menus where wedding_event_id = $1) as menus,
         (
           select count(*)::int
           from public.wedding_event_menu_items as item
           join public.wedding_event_menus as menu on menu.id = item.menu_id
           where menu.wedding_event_id = $1
         ) as items,
         (select count(*)::int from public.wedding_event_logistics where wedding_event_id = $1) as logistics,
         (select count(*)::int from public.wedding_event_tasks where wedding_event_id = $1) as tasks,
         (select count(*)::int from public.wedding_event_requirements where wedding_event_id = $1) as requirements`,
      [eventId]
    );
    assert.deepEqual(nestedState.rows[0], {
      menus: 1,
      items: 1,
      logistics: 1,
      tasks: 1,
      requirements: 1,
    });

    await expectDatabaseError(
      client,
      () => deleteFunction(client, otherUserId, eventId),
      "42501",
      "cross-owner delete"
    );

    const inquiryBookingId = (
      await client.query(
        `insert into public.bookings (
           client_profile_id, vendor_profile_id, wedding_event_id, status
         ) values ($1, $2, $3, 'INQUIRY') returning id`,
        [clientProfileId, vendorProfileId, eventId]
      )
    ).rows[0].id as string;
    const paymentId = (
      await client.query(
        `insert into public.payments (
           kind, client_profile_id, wedding_id, booking_id, label, amount
         ) values ('CLIENT_IN', $1, $2, $3, 'Lifecycle payment', 100)
         returning id`,
        [clientProfileId, weddingId, inquiryBookingId]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () => deleteFunction(client, ownerUserId, eventId),
      "55000",
      "financial history delete"
    );
    await client.query("delete from public.payments where id = $1", [paymentId]);

    await client.query(
      "update public.bookings set status = 'CONFIRMED' where id = $1",
      [inquiryBookingId]
    );
    await expectDatabaseError(
      client,
      () => deleteFunction(client, ownerUserId, eventId),
      "55000",
      "progressed booking delete"
    );
    await client.query(
      "update public.bookings set status = 'INQUIRY' where id = $1",
      [inquiryBookingId]
    );

    const cancelledBookingId = (
      await client.query(
        `insert into public.bookings (
           client_profile_id, vendor_profile_id, wedding_event_id, status
         ) values ($1, $2, $3, 'CANCELLED') returning id`,
        [clientProfileId, vendorProfileId, eventId]
      )
    ).rows[0].id as string;

    await deleteFunction(client, ownerUserId, eventId);
    const deletedState = await client.query(
      `select
         (select count(*)::int from public.wedding_events where id = $1) as events,
         (select count(*)::int from public.bookings where id = $2) as draft_bookings,
         (select wedding_event_id from public.bookings where id = $3) as cancelled_event_id,
         (select count(*)::int from public.wedding_event_menus where wedding_event_id = $1) as menus`,
      [eventId, inquiryBookingId, cancelledBookingId]
    );
    assert.deepEqual(deletedState.rows[0], {
      events: 0,
      draft_bookings: 0,
      cancelled_event_id: null,
      menus: 0,
    });

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[ownerUserId, otherUserId, vendorUserId]]
    );
    assert.equal(persisted.rows[0].count, 0);

    console.log(
      "Event function lifecycle: 8 focused cases passed with a full rollback."
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
