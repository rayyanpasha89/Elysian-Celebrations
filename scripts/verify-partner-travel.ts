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

async function expectPgError(
  client: pg.Client,
  label: string,
  code: string,
  action: () => Promise<unknown>,
) {
  const savepoint = `verify_${label.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
  await client.query(`savepoint ${savepoint}`);
  let caught: unknown;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  await client.query(`rollback to savepoint ${savepoint}`);
  assert.ok(caught, `${label} should be rejected`);
  assert.equal((caught as { code?: string }).code, code, `${label} SQLSTATE`);
}

async function main() {
  const client = new pg.Client({
    connectionString: requiredEnv("SUPABASE_DB_URL", "DIRECT_URL", "DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query("begin");

  const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
  const clientUserA = `verify_partner_travel_client_a_${suffix}`;
  const clientUserB = `verify_partner_travel_client_b_${suffix}`;
  const vendorUserA = `verify_partner_travel_vendor_a_${suffix}`;
  const vendorUserB = `verify_partner_travel_vendor_b_${suffix}`;
  const clientProfileA = randomUUID();
  const clientProfileB = randomUUID();
  const vendorCategory = randomUUID();
  const vendorA = randomUUID();
  const vendorB = randomUUID();
  const weddingA = randomUUID();
  const weddingB = randomUUID();
  const dayA = randomUUID();
  const dayB = randomUUID();
  const eventA = randomUUID();
  const eventB = randomUUID();
  const bookingA = randomUUID();
  const bookingB = randomUUID();

  try {
    const capability = await client.query(`
      select
        to_regclass('public.event_partner_travel_parties') is not null as parties_exist,
        to_regclass('public.event_partner_travel_legs') is not null as legs_exist,
        to_regclass('public.event_partner_stays') is not null as stays_exist,
        to_regclass('public.event_partner_transfers') is not null as transfers_exist,
        to_regclass('public.event_partner_travel_activity') is not null as activity_exists,
        not has_table_privilege('anon', 'public.event_partner_travel_parties', 'select') as anon_denied,
        not has_table_privilege('authenticated', 'public.event_partner_travel_parties', 'insert') as authenticated_denied,
        has_table_privilege('service_role', 'public.event_partner_travel_parties', 'select') as service_allowed,
        to_regprocedure(
          'public.save_event_partner_travel_party(uuid,uuid,integer,jsonb,jsonb,jsonb,jsonb,text)'
        ) is not null as rpc_exists,
        to_regprocedure(
          'public.load_event_partner_travel_snapshot(uuid)'
        ) is not null as snapshot_rpc_exists,
        not exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name like 'event_partner_%'
            and lower(column_name) ~ '(passport|aadhaar|aadhar|pan_number|identity|government_id|pnr)'
        ) as raw_identity_columns_absent
    `);
    assert.deepEqual(capability.rows[0], {
      parties_exist: true,
      legs_exist: true,
      stays_exist: true,
      transfers_exist: true,
      activity_exists: true,
      anon_denied: true,
      authenticated_denied: true,
      service_allowed: true,
      rpc_exists: true,
      snapshot_rpc_exists: true,
      raw_identity_columns_absent: true,
    });

    await client.query(
      `insert into public.users (id, email, name, role) values
       ($1, $2, 'Partner travel client A', 'CLIENT'),
       ($3, $4, 'Partner travel client B', 'CLIENT'),
       ($5, $6, 'Partner travel vendor A', 'VENDOR'),
       ($7, $8, 'Partner travel vendor B', 'VENDOR')`,
      [
        clientUserA,
        `testing+${clientUserA}@elysiancelebrations.app`,
        clientUserB,
        `testing+${clientUserB}@elysiancelebrations.app`,
        vendorUserA,
        `testing+${vendorUserA}@elysiancelebrations.app`,
        vendorUserB,
        `testing+${vendorUserB}@elysiancelebrations.app`,
      ],
    );
    await client.query(
      `insert into public.client_profiles (id, user_id, partner_name) values
       ($1, $2, 'A'), ($3, $4, 'B')`,
      [clientProfileA, clientUserA, clientProfileB, clientUserB],
    );
    await client.query(
      `insert into public.vendor_categories (id, name, slug) values ($1, $2, $3)`,
      [vendorCategory, `Partner travel ${suffix}`, `partner-travel-${suffix}`],
    );
    await client.query(
      `insert into public.vendor_profiles (id, user_id, business_name, slug, category_id) values
       ($1, $2, 'QA Artists', $3, $4),
       ($5, $6, 'QA Production', $7, $4)`,
      [
        vendorA,
        vendorUserA,
        `qa-artists-${suffix}`,
        vendorCategory,
        vendorB,
        vendorUserB,
        `qa-production-${suffix}`,
      ],
    );
    await client.query(
      `insert into public.weddings (id, client_profile_id, name, date) values
       ($1, $2, 'Partner Travel Event A', '2027-02-20'),
       ($3, $4, 'Partner Travel Event B', '2027-03-20')`,
      [weddingA, clientProfileA, weddingB, clientProfileB],
    );
    await client.query(
      `insert into public.wedding_days (id, wedding_id, name, date) values
       ($1, $2, 'Event A day', '2027-02-20'),
       ($3, $4, 'Event B day', '2027-03-20')`,
      [dayA, weddingA, dayB, weddingB],
    );
    await client.query(
      `insert into public.wedding_events (id, wedding_id, wedding_day_id, name, date) values
       ($1, $2, $3, 'Event A function', '2027-02-20'),
       ($4, $5, $6, 'Event B function', '2027-03-20')`,
      [eventA, weddingA, dayA, eventB, weddingB, dayB],
    );
    await client.query(
      `insert into public.bookings (
        id, client_profile_id, vendor_profile_id, wedding_event_id, status
      ) values
       ($1, $2, $3, $4, 'CONFIRMED'),
       ($5, $6, $3, $7, 'CONFIRMED')`,
      [bookingA, clientProfileA, vendorA, eventA, bookingB, clientProfileB, eventB],
    );

    const travelLegId = randomUUID();
    const stayId = randomUUID();
    const transferId = randomUUID();
    const saved = await client.query(
      `select public.save_event_partner_travel_party(
        $1, null, null, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6
      ) as party_id`,
      [
        weddingA,
        JSON.stringify({
          bookingId: bookingA,
          vendorProfileId: vendorA,
          weddingEventId: eventA,
          partyType: "ARTIST",
          name: "QA Ensemble",
          company: "QA Artists",
          departmentLabel: "Entertainment",
          roleLabel: "Headline act",
          headCount: 8,
          contactLabel: "Tour manager",
          foodPlan: "Eight vegetarian crew meals",
          perDiemAmount: 12000,
          ownerLabel: "Artist liaison",
          notes: "Soundcheck before guest arrival",
        }),
        JSON.stringify([
          {
            id: travelLegId,
            mode: "FLIGHT",
            provider: "QA Air",
            referenceLabel: "Eight confirmed seats",
            origin: "Mumbai",
            destination: "Goa",
            departureAt: "2027-02-20T02:30:00.000Z",
            arrivalAt: "2027-02-20T04:00:00.000Z",
            status: "BOOKED",
            pickupRequired: true,
          },
        ]),
        JSON.stringify([
          {
            id: stayId,
            hotelName: "QA Hotel",
            roomType: "Twin",
            roomCount: 4,
            checkInDate: "2027-02-20",
            checkOutDate: "2027-02-22",
            status: "ALLOCATED",
            foodPlan: "Breakfast and dinner",
          },
        ]),
        JSON.stringify([
          {
            id: transferId,
            travelLegId,
            routeLabel: "Airport to hotel",
            pickupAt: "2027-02-20T04:30:00.000Z",
            pickupLocation: "Goa airport",
            dropLocation: "QA Hotel",
            vehicleLabel: "Tempo 01",
            status: "ASSIGNED",
          },
        ]),
        clientUserA,
      ],
    );
    const partyId = saved.rows[0].party_id as string;
    assert.match(partyId, /^[0-9a-f-]{36}$/i);

    const persisted = await client.query(
      `select
        (select count(*)::int from public.event_partner_travel_parties where wedding_id = $1) as parties,
        (select count(*)::int from public.event_partner_travel_legs where wedding_id = $1) as legs,
        (select count(*)::int from public.event_partner_stays where wedding_id = $1) as stays,
        (select count(*)::int from public.event_partner_transfers where wedding_id = $1) as transfers,
        (select count(*)::int from public.event_partner_travel_activity where wedding_id = $1) as activity`,
      [weddingA],
    );
    assert.deepEqual(persisted.rows[0], {
      parties: 1,
      legs: 1,
      stays: 1,
      transfers: 1,
      activity: 1,
    });
    const loadedSnapshot = await client.query(
      `select public.load_event_partner_travel_snapshot($1) as snapshot`,
      [weddingA],
    );
    assert.equal(loadedSnapshot.rows[0].snapshot.parties.length, 1);
    assert.equal(loadedSnapshot.rows[0].snapshot.travelLegs.length, 1);
    assert.equal(loadedSnapshot.rows[0].snapshot.stays.length, 1);
    assert.equal(loadedSnapshot.rows[0].snapshot.transfers.length, 1);

    const baseParty = {
      bookingId: bookingA,
      vendorProfileId: vendorA,
      weddingEventId: eventA,
      partyType: "VENDOR",
      name: "QA scoped party",
      company: "QA Artists",
      departmentLabel: "Production",
      roleLabel: "Crew",
      headCount: 2,
      contactLabel: "Operations lead",
      foodPlan: "",
      perDiemAmount: null,
      ownerLabel: "Travel desk",
      notes: "",
    };
    const emptySnapshots = [JSON.stringify([]), JSON.stringify([]), JSON.stringify([])];

    await expectPgError(client, "cross event function", "23503", () =>
      client.query(
        `select public.save_event_partner_travel_party(
          $1, null, null, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6
        )`,
        [
          weddingA,
          JSON.stringify({ ...baseParty, weddingEventId: eventB, bookingId: null }),
          ...emptySnapshots,
          clientUserA,
        ],
      ),
    );
    await expectPgError(client, "mismatched booking vendor", "23503", () =>
      client.query(
        `select public.save_event_partner_travel_party(
          $1, null, null, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6
        )`,
        [
          weddingA,
          JSON.stringify({ ...baseParty, vendorProfileId: vendorB }),
          ...emptySnapshots,
          clientUserA,
        ],
      ),
    );
    await expectPgError(client, "booking from another event", "23503", () =>
      client.query(
        `select public.save_event_partner_travel_party(
          $1, null, null, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6
        )`,
        [
          weddingA,
          JSON.stringify({ ...baseParty, bookingId: bookingB }),
          ...emptySnapshots,
          clientUserA,
        ],
      ),
    );
    await expectPgError(client, "free floating vendor", "23503", () =>
      client.query(
        `select public.save_event_partner_travel_party(
          $1, null, null, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6
        )`,
        [
          weddingA,
          JSON.stringify({ ...baseParty, bookingId: null }),
          ...emptySnapshots,
          clientUserA,
        ],
      ),
    );
    await expectPgError(client, "travel chronology", "23514", () =>
      client.query(
        `insert into public.event_partner_travel_legs (
          party_id, wedding_id, mode, origin, destination, departure_at, arrival_at
        ) values ($1, $2, 'CAR', 'A', 'B', now(), now() - interval '1 hour')`,
        [partyId, weddingA],
      ),
    );
    await expectPgError(client, "stale partner travel version", "23514", () =>
      client.query(
        `select public.save_event_partner_travel_party(
          $1, $2, 99, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7
        )`,
        [weddingA, partyId, JSON.stringify(baseParty), ...emptySnapshots, clientUserA],
      ),
    );
    await expectPgError(client, "append only activity update", "55000", () =>
      client.query(
        `update public.event_partner_travel_activity set action = 'DELETED' where party_id = $1`,
        [partyId],
      ),
    );
    await expectPgError(client, "append only activity delete", "55000", () =>
      client.query(`delete from public.event_partner_travel_activity where party_id = $1`, [partyId]),
    );

    await client.query(`delete from public.bookings where id = $1`, [bookingA]);
    const detached = await client.query(
      `select booking_id, vendor_profile_id
       from public.event_partner_travel_parties where id = $1`,
      [partyId],
    );
    assert.deepEqual(detached.rows[0], {
      booking_id: null,
      vendor_profile_id: vendorA,
    });
    await client.query(
      `select public.save_event_partner_travel_party(
        $1, $2, 1, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7
      )`,
      [
        weddingA,
        partyId,
        JSON.stringify({ ...baseParty, bookingId: null, ownerLabel: "Detached booking owner" }),
        JSON.stringify([
          {
            id: travelLegId,
            mode: "FLIGHT",
            provider: "QA Air",
            referenceLabel: "Eight confirmed seats",
            origin: "Mumbai",
            destination: "Goa",
            departureAt: "2027-02-20T02:30:00.000Z",
            arrivalAt: "2027-02-20T04:00:00.000Z",
            status: "BOOKED",
            pickupRequired: true,
          },
        ]),
        JSON.stringify([
          {
            id: stayId,
            hotelName: "QA Hotel",
            roomType: "Twin",
            roomCount: 4,
            checkInDate: "2027-02-20",
            checkOutDate: "2027-02-22",
            status: "ALLOCATED",
            foodPlan: "Breakfast and dinner",
          },
        ]),
        JSON.stringify([
          {
            id: transferId,
            travelLegId,
            routeLabel: "Airport to hotel",
            pickupAt: "2027-02-20T04:30:00.000Z",
            pickupLocation: "Goa airport",
            dropLocation: "QA Hotel",
            vehicleLabel: "Tempo 01",
            status: "ASSIGNED",
          },
        ]),
        clientUserA,
      ],
    );
    const detachedSaved = await client.query(
      `select version, owner_label from public.event_partner_travel_parties where id = $1`,
      [partyId],
    );
    assert.deepEqual(detachedSaved.rows[0], {
      version: 2,
      owner_label: "Detached booking owner",
    });

    await client.query("savepoint verify_event_graph_delete");
    await client.query(`delete from public.client_profiles where id = $1`, [clientProfileA]);
    const deletedGraph = await client.query(
      `select
        (select count(*)::int from public.weddings where id = $1) as events,
        (select count(*)::int from public.event_partner_travel_parties where wedding_id = $1) as parties`,
      [weddingA],
    );
    assert.deepEqual(deletedGraph.rows[0], { events: 0, parties: 0 });
    await client.query("rollback to savepoint verify_event_graph_delete");
  } finally {
    await client.query("rollback");
    await client.end();
  }

  console.log("Partner travel database verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
