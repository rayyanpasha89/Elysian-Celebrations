import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260825120000_transactional_event_plan_creation.sql";

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

function weddingPayload(name: string) {
  return {
    name,
    date: "2026-03-14T00:00:00Z",
    event_type: "wedding",
    custom_event_type: null,
    event_platform_version: 2,
    definition_payload: { version: 2 },
    destination_id: null,
    status: "PLANNING",
  };
}

function daysPayload() {
  return [
    {
      name: "Day 1",
      date: "2026-03-14T00:00:00Z",
      notes: null,
      sort_order: 0,
      events: [
        {
          name: "Haldi",
          event_type: "haldi",
          time_block: "MORNING",
          date: "2026-03-14T00:00:00Z",
          start_time: "10:00",
          end_time: "12:00",
          venue: "Garden Lawn",
          guest_count: 120,
          food_style: "BUFFET",
          decor_style: null,
          notes: null,
          sort_order: 0,
          menu: {
            name: "Haldi Food and beverage plan",
            meal_period: "BRUNCH",
            service_style: "BUFFET",
            notes: "starter",
            sort_order: 0,
          },
          tasks: [
            { title: "Confirm final run of show", owner: "Planner", status: "OPEN", sort_order: 0 },
          ],
          requirements: [
            { category: "food", title: "Food service", status: "DRAFT", priority: "HIGH", payload: {}, notes: null, sort_order: 0 },
            { category: "decor", title: "Decor", status: "DRAFT", priority: "NORMAL", payload: {}, notes: null, sort_order: 1 },
          ],
        },
      ],
    },
  ];
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().slice(0, 8);
  const userId = `verify_${suffix}`;
  const profileId = randomUUID();

  try {
    const { rowCount } = await client.query(
      "select 1 from pg_proc where proname = 'create_event_plan'"
    );
    assert.ok(
      rowCount && rowCount > 0,
      `create_event_plan is missing. Apply ${MIGRATION_PATH} first.`
    );

    await client.query(
      "insert into users (id, email, name, role) values ($1, $2, 'Verify', 'CLIENT')",
      [userId, `${userId}@example.test`]
    );
    await client.query(
      "insert into client_profiles (id, user_id) values ($1, $2)",
      [profileId, userId]
    );

    // 1 — a minimal payload must fall back to column defaults, not write NULLs.
    const minimal = await client.query(
      "select create_event_plan($1, $2::jsonb, $3::jsonb) as id",
      [profileId, JSON.stringify({ name: "Minimal" }), JSON.stringify([])]
    );
    assert.ok(minimal.rows[0].id, "minimal payload should create a plan");
    const defaults = await client.query(
      "select event_type, event_platform_version from weddings where client_profile_id = $1",
      [profileId]
    );
    assert.equal(defaults.rows[0].event_type, "wedding");
    assert.equal(defaults.rows[0].event_platform_version, 1);

    // 2 — a second create for the same profile must be rejected as a conflict.
    await assert.rejects(
      client.query("select create_event_plan($1, $2::jsonb, $3::jsonb)", [
        profileId,
        JSON.stringify({ name: "Duplicate" }),
        JSON.stringify([]),
      ]),
      (error: { code?: string }) => error.code === "23505",
      "a duplicate plan must raise a unique violation"
    );

    // 3 — a failure part-way through must leave nothing behind.
    const rollbackUser = `verify_rb_${suffix}`;
    const rollbackProfile = randomUUID();
    await client.query(
      "insert into users (id, email, name, role) values ($1, $2, 'Rollback', 'CLIENT')",
      [rollbackUser, `${rollbackUser}@example.test`]
    );
    await client.query(
      "insert into client_profiles (id, user_id) values ($1, $2)",
      [rollbackProfile, rollbackUser]
    );

    const broken = daysPayload();
    broken.push({
      name: "Broken day",
      date: "not-a-timestamp",
      notes: null,
      sort_order: 1,
      events: [],
    } as unknown as (typeof broken)[number]);

    await assert.rejects(
      client.query("select create_event_plan($1, $2::jsonb, $3::jsonb)", [
        rollbackProfile,
        JSON.stringify(weddingPayload("Rollback")),
        JSON.stringify(broken),
      ]),
      "a broken day must abort the whole creation"
    );

    for (const [label, sql] of [
      ["weddings", "select count(*)::int as n from weddings where client_profile_id = $1"],
      [
        "days",
        "select count(*)::int as n from wedding_days d join weddings w on w.id = d.wedding_id where w.client_profile_id = $1",
      ],
      [
        "events",
        "select count(*)::int as n from wedding_events e join weddings w on w.id = e.wedding_id where w.client_profile_id = $1",
      ],
    ] as const) {
      const { rows } = await client.query(sql, [rollbackProfile]);
      assert.equal(rows[0].n, 0, `${label} must be empty after a rolled-back create`);
    }

    for (const [label, sql] of [
      ["menus", "select count(*)::int as n from wedding_event_menus m left join wedding_events e on e.id = m.wedding_event_id where e.id is null"],
      ["tasks", "select count(*)::int as n from wedding_event_tasks t left join wedding_events e on e.id = t.wedding_event_id where e.id is null"],
      ["requirements", "select count(*)::int as n from wedding_event_requirements r left join wedding_events e on e.id = r.wedding_event_id where e.id is null"],
    ] as const) {
      const { rows } = await client.query(sql);
      assert.equal(rows[0].n, 0, `no orphaned ${label} may survive a rollback`);
    }

    // 4 — retrying after a rolled-back attempt must succeed, not hit the guard.
    const retry = await client.query(
      "select create_event_plan($1, $2::jsonb, $3::jsonb) as id",
      [
        rollbackProfile,
        JSON.stringify(weddingPayload("Retry")),
        JSON.stringify(daysPayload()),
      ]
    );
    assert.ok(retry.rows[0].id, "a retry after rollback must succeed");

    // 5 — the full structure is written, including the guest list.
    const counts = await client.query(
      `select
         (select count(*)::int from wedding_days d join weddings w on w.id = d.wedding_id where w.client_profile_id = $1) as days,
         (select count(*)::int from wedding_events e join weddings w on w.id = e.wedding_id where w.client_profile_id = $1) as events,
         (select count(*)::int from wedding_event_menus m join wedding_events e on e.id = m.wedding_event_id join weddings w on w.id = e.wedding_id where w.client_profile_id = $1) as menus,
         (select count(*)::int from wedding_event_tasks t join wedding_events e on e.id = t.wedding_event_id join weddings w on w.id = e.wedding_id where w.client_profile_id = $1) as tasks,
         (select count(*)::int from wedding_event_requirements r join wedding_events e on e.id = r.wedding_event_id join weddings w on w.id = e.wedding_id where w.client_profile_id = $1) as requirements,
         (select count(*)::int from guest_lists where client_profile_id = $1) as guest_lists`,
      [rollbackProfile]
    );
    const row = counts.rows[0];
    assert.equal(row.days, 1, "one day expected");
    assert.equal(row.events, 1, "one function expected");
    assert.equal(row.menus, 1, "one menu expected");
    assert.equal(row.tasks, 1, "one task expected");
    assert.equal(row.requirements, 2, "two requirements expected");
    assert.equal(row.guest_lists, 1, "a guest list must be created in the same transaction");

    console.log("Event plan transaction: 5 focused cases passed.");
  } finally {
    // client_profiles.user_id is RESTRICT, not CASCADE, so identity history is
    // preserved. Remove the profiles first; weddings and their children cascade
    // from the profile.
    await client.query(
      "delete from client_profiles where user_id in ($1, $2)",
      [userId, `verify_rb_${suffix}`]
    );
    await client.query("delete from users where id in ($1, $2)", [
      userId,
      `verify_rb_${suffix}`,
    ]);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
