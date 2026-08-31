import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260831135409_harden_client_ownership_integrity.sql";

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
  const userA = `verify_owner_a_${suffix}`;
  const userB = `verify_owner_b_${suffix}`;
  const userC = `verify_owner_c_${suffix}`;
  const profileA = randomUUID();
  const profileB = randomUUID();
  const profileC = randomUUID();

  try {
    const artifacts = await client.query(
      `select
         exists (
           select 1 from pg_constraint
           where conrelid = 'public.weddings'::regclass
             and conname = 'weddings_client_profile_singleton'
             and contype = 'u'
             and convalidated
         ) as wedding_singleton,
         exists (
           select 1 from pg_constraint
           where conrelid = 'public.budgets'::regclass
             and conname = 'budgets_client_profile_singleton'
             and contype = 'u'
             and convalidated
         ) as budget_singleton,
         exists (
           select 1 from pg_constraint
           where conrelid = 'public.guest_lists'::regclass
             and conname = 'guest_lists_client_profile_singleton'
             and contype = 'u'
             and convalidated
         ) as guest_list_singleton,
         exists (
           select 1 from pg_constraint
           where conrelid = 'public.wedding_events'::regclass
             and conname = 'wedding_events_day_ownership_fkey'
             and contype = 'f'
             and convalidated
         ) as day_ownership,
         (
           select bool_and(
             not has_function_privilege('anon', helper, 'execute')
             and not has_function_privilege('authenticated', helper, 'execute')
             and not has_function_privilege('service_role', helper, 'execute')
           )
           from (values
             ('public.guard_client_profile_identity()'),
             ('public.guard_client_owned_parent()'),
             ('public.validate_budget_item_event_owner()'),
             ('public.validate_booking_event_owner()')
           ) as helpers(helper)
         ) as helpers_private`
    );
    assert.deepEqual(
      artifacts.rows[0],
      {
        wedding_singleton: true,
        budget_singleton: true,
        guest_list_singleton: true,
        day_ownership: true,
        helpers_private: true,
      },
      `Ownership artifacts are missing. Apply ${MIGRATION_PATH} first.`
    );

    const existingMismatches = await client.query(
      `select
         (
           select count(*)::int
           from (
             select client_profile_id
             from public.budgets
             group by client_profile_id
             having count(*) > 1
           ) as duplicate_budgets
         ) as duplicate_budget_owners,
         (
           select count(*)::int
           from (
             select client_profile_id
             from public.guest_lists
             group by client_profile_id
             having count(*) > 1
           ) as duplicate_guest_lists
         ) as duplicate_guest_list_owners,
         (
           select count(*)::int
           from public.wedding_events as event
           join public.wedding_days as day on day.id = event.wedding_day_id
           where event.wedding_id is distinct from day.wedding_id
         ) as day_mismatches,
         (
           select count(*)::int
           from public.budget_items as item
           join public.budget_categories as category
             on category.id = item.budget_category_id
           join public.budgets as budget on budget.id = category.budget_id
           join public.wedding_events as event on event.id = item.wedding_event_id
           join public.weddings as wedding on wedding.id = event.wedding_id
           where budget.client_profile_id is distinct from wedding.client_profile_id
         ) as budget_mismatches,
         (
           select count(*)::int
           from public.bookings as booking
           join public.wedding_events as event on event.id = booking.wedding_event_id
           join public.weddings as wedding on wedding.id = event.wedding_id
           where booking.client_profile_id is distinct from wedding.client_profile_id
         ) as booking_mismatches`
    );
    assert.deepEqual(existingMismatches.rows[0], {
      duplicate_budget_owners: 0,
      duplicate_guest_list_owners: 0,
      day_mismatches: 0,
      budget_mismatches: 0,
      booking_mismatches: 0,
    });

    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");

    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Owner A', 'CLIENT'),
         ($2, $5, 'Owner B', 'CLIENT'),
         ($3, $6, 'Owner C', 'CLIENT')`,
      [
        userA,
        userB,
        userC,
        `${userA}@example.test`,
        `${userB}@example.test`,
        `${userC}@example.test`,
      ]
    );
    await client.query(
      `insert into public.client_profiles (id, user_id)
       values ($1, $4), ($2, $5), ($3, $6)`,
      [profileA, profileB, profileC, userA, userB, userC]
    );

    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.client_profiles set user_id = $1 where id = $2",
          [userC, profileA]
        ),
      "23514",
      "client profile identity reassignment"
    );

    const weddingA = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Ownership A') returning id`,
        [profileA]
      )
    ).rows[0].id as string;
    const weddingB = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Ownership B') returning id`,
        [profileB]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.weddings (client_profile_id, name)
           values ($1, 'Duplicate ownership plan')`,
          [profileA]
        ),
      "23505",
      "duplicate event plan"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.weddings set client_profile_id = $1 where id = $2",
          [profileC, weddingA]
        ),
      "23514",
      "event plan owner reassignment"
    );

    const dayA = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name)
         values ($1, 'Day A') returning id`,
        [weddingA]
      )
    ).rows[0].id as string;
    const dayB = (
      await client.query(
        `insert into public.wedding_days (wedding_id, name)
         values ($1, 'Day B') returning id`,
        [weddingB]
      )
    ).rows[0].id as string;
    const eventA = (
      await client.query(
        `insert into public.wedding_events (wedding_id, wedding_day_id, name)
         values ($1, $2, 'Function A') returning id`,
        [weddingA, dayA]
      )
    ).rows[0].id as string;
    const eventB = (
      await client.query(
        `insert into public.wedding_events (wedding_id, wedding_day_id, name)
         values ($1, $2, 'Function B') returning id`,
        [weddingB, dayB]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.wedding_events (wedding_id, wedding_day_id, name)
           values ($1, $2, 'Cross-owner function')`,
          [weddingA, dayB]
        ),
      "23503",
      "cross-owner day insert"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.wedding_events set wedding_day_id = $1 where id = $2",
          [dayB, eventA]
        ),
      "23503",
      "cross-owner day update"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.wedding_days set wedding_id = $1 where id = $2",
          [weddingB, dayA]
        ),
      "23503",
      "day owner reassignment with linked function"
    );

    const budgetA = (
      await client.query(
        `insert into public.budgets (client_profile_id, name, total_budget)
         values ($1, 'Budget A', 1000) returning id`,
        [profileA]
      )
    ).rows[0].id as string;
    const budgetB = (
      await client.query(
        `insert into public.budgets (client_profile_id, name, total_budget)
         values ($1, 'Budget B', 1000) returning id`,
        [profileB]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.budgets (client_profile_id, name, total_budget)
           values ($1, 'Duplicate Budget A', 1000)`,
          [profileA]
        ),
      "23505",
      "duplicate budget"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.budgets set client_profile_id = $1 where id = $2",
          [profileC, budgetA]
        ),
      "23514",
      "budget owner reassignment"
    );

    const categoryA = (
      await client.query(
        `insert into public.budget_categories (budget_id, name)
         values ($1, 'Category A') returning id`,
        [budgetA]
      )
    ).rows[0].id as string;
    const categoryB = (
      await client.query(
        `insert into public.budget_categories (budget_id, name)
         values ($1, 'Category B') returning id`,
        [budgetB]
      )
    ).rows[0].id as string;
    const budgetItemA = (
      await client.query(
        `insert into public.budget_items (
           budget_category_id, name, wedding_event_id
         ) values ($1, 'Owned line', $2) returning id`,
        [categoryA, eventA]
      )
    ).rows[0].id as string;

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.budget_items (
             budget_category_id, name, wedding_event_id
           ) values ($1, 'Cross-owner line', $2)`,
          [categoryA, eventB]
        ),
      "23514",
      "cross-owner budget item insert"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.budget_items set budget_category_id = $1 where id = $2",
          [categoryB, budgetItemA]
        ),
      "23514",
      "cross-owner budget item update"
    );

    const guestListA = (
      await client.query(
        `insert into public.guest_lists (client_profile_id, name)
         values ($1, 'Guest List A') returning id`,
        [profileA]
      )
    ).rows[0].id as string;
    await client.query(
      `insert into public.guest_lists (client_profile_id, name)
       values ($1, 'Guest List B')`,
      [profileB]
    );
    await client.query(
      `insert into public.guests (guest_list_id, name)
       values ($1, 'Owned Guest')`,
      [guestListA]
    );

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.guest_lists (client_profile_id, name)
           values ($1, 'Duplicate Guest List A')`,
          [profileA]
        ),
      "23505",
      "duplicate guest list"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "update public.guest_lists set client_profile_id = $1 where id = $2",
          [profileC, guestListA]
        ),
      "23514",
      "guest-list owner reassignment"
    );

    const vendor = await client.query(
      "select id from public.vendor_profiles order by created_at limit 1"
    );
    assert.ok(vendor.rowCount, "A vendor profile is required for booking ownership verification");
    await client.query(
      `insert into public.bookings (
         client_profile_id, vendor_profile_id, wedding_event_id
       ) values ($1, $2, $3)`,
      [profileA, vendor.rows[0].id, eventA]
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.bookings (
             client_profile_id, vendor_profile_id, wedding_event_id
           ) values ($1, $2, $3)`,
          [profileA, vendor.rows[0].id, eventB]
        ),
      "23514",
      "cross-owner booking"
    );

    await client.query("delete from public.wedding_days where id = $1", [dayA]);
    const detachedEvent = await client.query(
      "select wedding_id, wedding_day_id from public.wedding_events where id = $1",
      [eventA]
    );
    assert.deepEqual(detachedEvent.rows[0], {
      wedding_id: weddingA,
      wedding_day_id: null,
    });

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[userA, userB, userC]]
    );
    assert.equal(persisted.rows[0].count, 0, "verification must leave no rows behind");

    console.log(
      "Ownership integrity: 14 focused cases passed with a full rollback."
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
