import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

function requiredEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
}

async function assertRejects(action: () => Promise<unknown>, label: string) {
  await assert.rejects(action, label);
}

async function main() {
  const client = new pg.Client({
    connectionString: requiredEnv("SUPABASE_DB_URL", "DIRECT_URL", "DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const clientUserA = `verify_guest_ops_client_a_${suffix}`;
  const clientUserB = `verify_guest_ops_client_b_${suffix}`;
  const clientProfileA = randomUUID();
  const clientProfileB = randomUUID();
  const weddingA = randomUUID();
  const guestListA = randomUUID();
  const guestListB = randomUUID();
  const guestA = randomUUID();
  const guestB = randomUUID();

  try {
    const capability = await client.query(`
      select
        to_regclass('public.event_guest_operations') is not null as operations_exist,
        to_regclass('public.guest_travel_legs') is not null as travel_exist,
        to_regclass('public.guest_stays') is not null as stays_exist,
        to_regclass('public.guest_transfers') is not null as transfers_exist,
        to_regclass('public.guest_hospitality_items') is not null as hospitality_exist,
        to_regclass('public.event_guest_operations_activity') is not null as activity_exists,
        not has_table_privilege('anon', 'public.event_guest_operations', 'select') as anon_denied,
        not has_table_privilege('authenticated', 'public.event_guest_operations', 'insert') as authenticated_denied,
        has_table_privilege('service_role', 'public.event_guest_operations', 'select') as service_allowed,
        to_regprocedure(
          'public.save_guest_operations_snapshot(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,jsonb,text)'
        ) is not null as rpc_exists
    `);
    assert.deepEqual(capability.rows[0], {
      operations_exist: true,
      travel_exist: true,
      stays_exist: true,
      transfers_exist: true,
      hospitality_exist: true,
      activity_exists: true,
      anon_denied: true,
      authenticated_denied: true,
      service_allowed: true,
      rpc_exists: true,
    });

    await client.query(
      `insert into public.users (id, email, name, role) values
       ($1, $2, 'Guest operations A', 'CLIENT'),
       ($3, $4, 'Guest operations B', 'CLIENT')`,
      [
        clientUserA,
        `testing+${clientUserA}@elysiancelebrations.app`,
        clientUserB,
        `testing+${clientUserB}@elysiancelebrations.app`,
      ]
    );
    await client.query(
      `insert into public.client_profiles (id, user_id, partner_name) values
       ($1, $2, 'A'), ($3, $4, 'B')`,
      [clientProfileA, clientUserA, clientProfileB, clientUserB]
    );
    await client.query(
      `insert into public.weddings (id, client_profile_id, name, date)
       values ($1, $2, 'Guest Operations Verification', '2026-02-20')`,
      [weddingA, clientProfileA]
    );
    await client.query(
      `insert into public.guest_lists (id, client_profile_id, name) values
       ($1, $2, 'A guests'), ($3, $4, 'B guests')`,
      [guestListA, clientProfileA, guestListB, clientProfileB]
    );
    await client.query(
      `insert into public.guests (id, guest_list_id, name) values
       ($1, $2, 'Guest A'), ($3, $4, 'Guest B')`,
      [guestA, guestListA, guestB, guestListB]
    );

    const travelId = randomUUID();
    const stayId = randomUUID();
    const transferId = randomUUID();
    const hospitalityId = randomUUID();
    const save = await client.query(
      `select public.save_guest_operations_snapshot(
        $1, $2, null, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8
      ) as result`,
      [
        weddingA,
        guestA,
        JSON.stringify({
          householdName: "Host family",
          relationshipGroup: "Immediate family",
          invitationStatus: "CONFIRMED",
          vipLevel: "VIP",
          accessibilityNotes: "Step-free arrival",
          ownerLabel: "Hospitality lead",
        }),
        JSON.stringify([
          {
            id: travelId,
            mode: "FLIGHT",
            provider: "Example Airways",
            referenceLabel: "Confirmed booking",
            origin: "Mumbai",
            destination: "Mangalore",
            departureAt: "2026-02-20T02:30:00.000Z",
            arrivalAt: "2026-02-20T04:15:00.000Z",
            status: "BOOKED",
            pickupRequired: true,
            notes: null,
          },
        ]),
        JSON.stringify([
          {
            id: stayId,
            hotelName: "Gateway Bekal",
            roomType: "Deluxe",
            roomNumber: null,
            checkInDate: "2026-02-20",
            checkOutDate: "2026-02-23",
            status: "ALLOCATED",
            keyStatus: "PENDING",
            luggageStatus: "EXPECTED",
            notes: null,
          },
        ]),
        JSON.stringify([
          {
            id: transferId,
            travelLegId: travelId,
            vehicleLabel: "Coach 01",
            routeLabel: "Airport to hotel",
            pickupAt: "2026-02-20T04:45:00.000Z",
            pickupLocation: "Mangalore airport",
            dropLocation: "Gateway Bekal",
            seatLabel: "A1",
            status: "ASSIGNED",
            notes: null,
          },
        ]),
        JSON.stringify([
          {
            id: hospitalityId,
            type: "WELCOME",
            title: "Place hamper in room",
            status: "PLANNED",
            ownerLabel: "Hospitality desk",
            dueAt: "2026-02-20T06:00:00.000Z",
            notes: null,
          },
        ]),
        clientUserA,
      ]
    );
    const result = save.rows[0].result as { version: number };
    assert.equal(result.version, 1);

    const counts = await client.query(
      `select
        (select count(*)::int from public.event_guest_operations where wedding_id = $1) as profiles,
        (select count(*)::int from public.guest_travel_legs where wedding_id = $1) as travel,
        (select count(*)::int from public.guest_stays where wedding_id = $1) as stays,
        (select count(*)::int from public.guest_transfers where wedding_id = $1) as transfers,
        (select count(*)::int from public.guest_hospitality_items where wedding_id = $1) as hospitality,
        (select count(*)::int from public.event_guest_operations_activity where wedding_id = $1) as activity`,
      [weddingA]
    );
    assert.deepEqual(counts.rows[0], {
      profiles: 1,
      travel: 1,
      stays: 1,
      transfers: 1,
      hospitality: 1,
      activity: 1,
    });

    await assertRejects(
      () =>
        client.query(
          `select public.save_guest_operations_snapshot(
            $1, $2, null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
            '[]'::jsonb, '[]'::jsonb, $3
          )`,
          [weddingA, guestB, clientUserA]
        ),
      "cross-client guest"
    );

    await assertRejects(
      () =>
        client.query(
          `select public.save_guest_operations_snapshot(
            $1, $2, 99, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
            '[]'::jsonb, '[]'::jsonb, $3
          )`,
          [weddingA, guestA, clientUserA]
        ),
      "stale guest operations version"
    );

    await assertRejects(
      () =>
        client.query(
          `insert into public.guest_travel_legs (
            id, event_guest_operation_id, wedding_id, mode, origin, destination,
            departure_at, arrival_at
          ) select $1, id, wedding_id, 'CAR', 'A', 'B', now(), now() - interval '1 hour'
            from public.event_guest_operations where wedding_id = $2`,
          [randomUUID(), weddingA]
        ),
      "travel chronology"
    );

    await assertRejects(
      () =>
        client.query(
          `update public.event_guest_operations_activity set action = 'ALTERED'
           where wedding_id = $1`,
          [weddingA]
        ),
      "append-only guest operations activity"
    );
  } finally {
    await client.query(
      "delete from public.client_profiles where user_id = any($1::text[])",
      [[clientUserA, clientUserB]]
    );
    await client.query("delete from public.users where id = any($1::text[])", [
      [clientUserA, clientUserB],
    ]);
    await client.end();
  }

  console.log("Guest operations database verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
