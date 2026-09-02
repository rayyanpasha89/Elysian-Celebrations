import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const DELETE_SIGNATURE = "public.delete_event_plan(text,uuid)";
const MIGRATION_PATH =
  "supabase/migrations/20260901193028_make_event_plan_deletion_atomic.sql";

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

async function deleteEventPlan(
  client: Client,
  actorUserId: string,
  weddingId: string
) {
  return client.query(
    "select public.delete_event_plan($1, $2) as result",
    [actorUserId, weddingId]
  );
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const ownerUserId = `verify_plan_delete_${suffix}`;
  const otherUserId = `verify_plan_delete_other_${suffix}`;
  const vendorUserId = `verify_plan_delete_vendor_${suffix}`;
  const clientProfileId = randomUUID();

  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    if (process.env.ELYSIAN_TEST_APPLY_MIGRATION === "1") {
      await client.query(readFileSync(MIGRATION_PATH, "utf8"));
    }

    const privileges = await client.query(
      `select
         to_regprocedure($1) is not null as function_exists,
         not has_function_privilege('anon', $1, 'execute') as anon_denied,
         not has_function_privilege('authenticated', $1, 'execute') as auth_denied,
         has_function_privilege('service_role', $1, 'execute') as service_allowed`,
      [DELETE_SIGNATURE]
    );
    assert.deepEqual(privileges.rows[0], {
      function_exists: true,
      anon_denied: true,
      auth_denied: true,
      service_allowed: true,
    });

    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Plan Delete Owner', 'CLIENT'),
         ($2, $5, 'Plan Delete Other', 'CLIENT'),
         ($3, $6, 'Plan Delete Vendor', 'VENDOR')`,
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

    const vendorCategoryId = (
      await client.query(
        `insert into public.vendor_categories (name, slug)
         values ($1, $2) returning id`,
        [`Plan Delete Category ${suffix}`, `plan-delete-category-${suffix}`]
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
          `Plan Delete Vendor ${suffix}`,
          `plan-delete-vendor-${suffix}`,
        ]
      )
    ).rows[0].id as string;

    const weddingId = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Atomic plan deletion') returning id`,
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

    const eventRows = await client.query(
      `insert into public.wedding_events (
         wedding_id, wedding_day_id, name, time_block, sort_order
       ) values
         ($1, $2, 'Draft inquiry function', 'morning', 0),
         ($1, $2, 'Quote function', 'afternoon', 1),
         ($1, $2, 'Confirmed function', 'evening', 2),
         ($1, $2, 'Cancelled function', 'evening', 3)
       returning id, sort_order`,
      [weddingId, dayId]
    );
    const eventIds = new Map<number, string>(
      eventRows.rows.map((row) => [row.sort_order as number, row.id as string])
    );

    const bookingRows = await client.query(
      `insert into public.bookings (
         client_profile_id, vendor_profile_id, wedding_event_id, status
       ) values
         ($1, $2, $3, 'INQUIRY'),
         ($1, $2, $4, 'QUOTE_SENT'),
         ($1, $2, $5, 'CONFIRMED'),
         ($1, $2, $6, 'CANCELLED')
       returning id, status`,
      [
        clientProfileId,
        vendorProfileId,
        eventIds.get(0),
        eventIds.get(1),
        eventIds.get(2),
        eventIds.get(3),
      ]
    );
    const bookingIds = new Map<string, string>(
      bookingRows.rows.map((row) => [row.status as string, row.id as string])
    );

    const budgetId = (
      await client.query(
        `insert into public.budgets (client_profile_id, name, total_budget)
         values ($1, 'Plan deletion budget', 1000000) returning id`,
        [clientProfileId]
      )
    ).rows[0].id as string;
    const budgetCategoryId = (
      await client.query(
        `insert into public.budget_categories (budget_id, name, allocated)
         values ($1, 'Venue', 250000) returning id`,
        [budgetId]
      )
    ).rows[0].id as string;
    const budgetItemId = (
      await client.query(
        `insert into public.budget_items (
           budget_category_id, wedding_event_id, name, estimated_cost
         ) values ($1, $2, 'Confirmed function venue', 250000) returning id`,
        [budgetCategoryId, eventIds.get(2)]
      )
    ).rows[0].id as string;
    await client.query(
      `insert into public.timeline_items (wedding_id, title)
       values ($1, 'Plan deletion timeline item')`,
      [weddingId]
    );

    await expectDatabaseError(
      client,
      () => deleteEventPlan(client, otherUserId, weddingId),
      "42501",
      "cross-owner deletion"
    );

    const paymentId = (
      await client.query(
        `insert into public.payments (
           kind, client_profile_id, wedding_id, booking_id, label, amount
         ) values ('CLIENT_IN', $1, $2, $3, 'Deletion blocker', 100)
         returning id`,
        [clientProfileId, weddingId, bookingIds.get("INQUIRY")]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () => deleteEventPlan(client, ownerUserId, weddingId),
      "55000",
      "financial history deletion"
    );
    const preservedAfterConflict = await client.query(
      `select
         (select count(*)::int from public.weddings where id = $1) as plans,
         (select count(*)::int from public.wedding_events where wedding_id = $1) as events,
         (
           select count(*)::int
           from public.bookings as booking
           join public.wedding_events as event
             on event.id = booking.wedding_event_id
           where event.wedding_id = $1
         ) as bookings,
         (select wedding_event_id from public.budget_items where id = $2) as budget_event_id`,
      [weddingId, budgetItemId]
    );
    assert.deepEqual(preservedAfterConflict.rows[0], {
      plans: 1,
      events: 4,
      bookings: 4,
      budget_event_id: eventIds.get(2),
    });

    await client.query("delete from public.payments where id = $1", [paymentId]);
    const deleted = await deleteEventPlan(client, ownerUserId, weddingId);
    assert.deepEqual(deleted.rows[0].result, {
      ok: true,
      deletedPlans: [{ id: weddingId, name: "Atomic plan deletion" }],
      deletedDraftSelections: 2,
      unlinkedBookings: 2,
      unlinkedBudgetItems: 1,
    });

    const deletedState = await client.query(
      `select
         (select count(*)::int from public.weddings where id = $1) as plans,
         (select count(*)::int from public.wedding_days where wedding_id = $1) as days,
         (select count(*)::int from public.wedding_events where wedding_id = $1) as events,
         (select count(*)::int from public.timeline_items where wedding_id = $1) as timeline,
         (select count(*)::int from public.bookings where id = $2) as inquiry,
         (select count(*)::int from public.bookings where id = $3) as quote,
         (select wedding_event_id from public.bookings where id = $4) as confirmed_event_id,
         (select wedding_event_id from public.bookings where id = $5) as cancelled_event_id,
         (select wedding_event_id from public.budget_items where id = $6) as budget_event_id`,
      [
        weddingId,
        bookingIds.get("INQUIRY"),
        bookingIds.get("QUOTE_SENT"),
        bookingIds.get("CONFIRMED"),
        bookingIds.get("CANCELLED"),
        budgetItemId,
      ]
    );
    assert.deepEqual(deletedState.rows[0], {
      plans: 0,
      days: 0,
      events: 0,
      timeline: 0,
      inquiry: 0,
      quote: 0,
      confirmed_event_id: null,
      cancelled_event_id: null,
      budget_event_id: null,
    });

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[ownerUserId, otherUserId, vendorUserId]]
    );
    assert.equal(persisted.rows[0].count, 0);

    console.log(
      "Event plan deletion: 6 focused cases passed with a full rollback."
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
