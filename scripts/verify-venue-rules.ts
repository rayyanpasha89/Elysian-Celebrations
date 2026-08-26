import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const MIGRATION_PATH = "supabase/migrations/20260826040000_normalize_event_venue.sql";

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

const isCheckViolation = (error: { code?: string }) => error.code === "23514";

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().slice(0, 8);
  const userId = `venue_${suffix}`;
  const profileId = randomUUID();
  const weddingId = randomUUID();
  const dayId = randomUUID();
  const createdVenues: string[] = [];

  try {
    const { rowCount } = await client.query(
      "select 1 from pg_trigger where tgname = 'validate_wedding_event_venue'"
    );
    assert.ok(
      rowCount && rowCount > 0,
      `validate_wedding_event_venue is missing. Apply ${MIGRATION_PATH} first.`
    );

    const venue = await client.query(
      `select id, name, capacity, destination_id
         from venues
        where capacity is not null and is_active
        order by capacity desc
        limit 1`
    );
    assert.ok(venue.rowCount, "seed data must provide at least one active venue with a capacity");
    const { id: venueId, capacity, destination_id: destinationId } = venue.rows[0];

    await client.query(
      "insert into users (id, email, name, role) values ($1, $2, 'Venue', 'CLIENT')",
      [userId, `${userId}@example.test`]
    );
    await client.query("insert into client_profiles (id, user_id) values ($1, $2)", [
      profileId,
      userId,
    ]);
    await client.query(
      `insert into weddings (id, client_profile_id, name, event_type, destination_id)
       values ($1, $2, 'Venue rules', 'wedding', $3)`,
      [weddingId, profileId, destinationId]
    );
    await client.query(
      "insert into wedding_days (id, wedding_id, name, sort_order) values ($1, $2, 'Day 1', 0)",
      [dayId, weddingId]
    );

    const insertEvent = (name: string, vId: string | null, guests: number | null, venueText?: string) =>
      client.query(
        `insert into wedding_events (wedding_id, wedding_day_id, name, venue_id, guest_count, venue)
         values ($1, $2, $3, $4, $5, $6) returning venue, venue_id`,
        [weddingId, dayId, name, vId, guests, venueText ?? null]
      );

    // 1 — a venue inside capacity and destination is accepted, and the display
    //     snapshot is filled in from the catalogue when the caller omits it.
    const ok = await insertEvent("At capacity", venueId, capacity);
    assert.equal(ok.rows[0].venue_id, venueId);
    assert.equal(ok.rows[0].venue, venue.rows[0].name, "venue snapshot should be filled from the catalogue");

    // 2 — one guest over capacity is rejected.
    await assert.rejects(
      insertEvent("Over capacity", venueId, capacity + 1),
      isCheckViolation,
      "a function larger than the venue must be rejected"
    );

    // 3 — a venue in another destination is rejected.
    const elsewhere = await client.query(
      "select id from venues where destination_id is distinct from $1 and is_active limit 1",
      [destinationId]
    );
    if (elsewhere.rowCount) {
      await assert.rejects(
        insertEvent("Wrong destination", elsewhere.rows[0].id, 1),
        isCheckViolation,
        "a venue outside the event's destination must be rejected"
      );
    }

    // 4 — a retired venue is rejected.
    const retired = await client.query(
      `insert into venues (destination_id, name, slug, capacity, is_active)
       values ($1, $2, $3, 1000, false) returning id`,
      [destinationId, `Retired ${suffix}`, `retired-${suffix}`]
    );
    createdVenues.push(retired.rows[0].id);
    await assert.rejects(
      insertEvent("Retired venue", retired.rows[0].id, 10),
      isCheckViolation,
      "an inactive venue must be rejected"
    );

    // 5 — a custom area with no catalogue row is still allowed.
    const custom = await insertEvent("Custom area", null, 50, "Poolside Deck");
    assert.equal(custom.rows[0].venue_id, null);
    assert.equal(custom.rows[0].venue, "Poolside Deck");

    // 6 — removing a venue clears the link but keeps the snapshot, so a booked
    //     function still shows the name it was planned under.
    const temp = await client.query(
      `insert into venues (destination_id, name, slug, capacity, is_active)
       values ($1, $2, $3, 500, true) returning id, name`,
      [destinationId, `Temp ${suffix}`, `temp-${suffix}`]
    );
    await insertEvent("Snapshot survives", temp.rows[0].id, 10);
    await client.query("delete from venues where id = $1", [temp.rows[0].id]);
    const after = await client.query(
      "select venue, venue_id from wedding_events where wedding_id = $1 and name = 'Snapshot survives'",
      [weddingId]
    );
    assert.equal(after.rows[0].venue_id, null, "the link should be cleared");
    assert.equal(after.rows[0].venue, temp.rows[0].name, "the snapshot should survive");

    console.log("Event venue rules: 6 focused cases passed.");
  } finally {
    await client.query("delete from weddings where id = $1", [weddingId]);
    await client.query("delete from client_profiles where user_id = $1", [userId]);
    await client.query("delete from users where id = $1", [userId]);
    if (createdVenues.length) {
      await client.query("delete from venues where id = any($1::uuid[])", [createdVenues]);
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
