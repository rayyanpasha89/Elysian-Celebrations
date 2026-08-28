import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

import {
  legacyUnattributedPaid,
  totalsByBooking,
  totalsFromPayments,
} from "../src/lib/payment-ledger";

const MIGRATION_PATH = "supabase/migrations/20260826050000_activate_payment_ledger.sql";

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

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().slice(0, 8);
  const clientUser = `pay_c_${suffix}`;
  const vendorUser = `pay_v_${suffix}`;
  const profileId = randomUUID();
  const vendorProfileId = randomUUID();
  const bookingId = randomUUID();

  try {
    const constraints = await client.query(
      `select conname from pg_constraint
        where conrelid = 'public.payments'::regclass
          and conname in ('payments_amount_nonnegative','payments_paid_at_matches_is_paid','payments_kind_valid')`
    );
    assert.equal(
      constraints.rowCount,
      3,
      `payments constraints are missing. Apply ${MIGRATION_PATH} first.`
    );

    await client.query(
      "insert into users (id,email,name,role) values ($1,$2,'C','CLIENT'),($3,$4,'V','VENDOR')",
      [clientUser, `${clientUser}@e.test`, vendorUser, `${vendorUser}@e.test`]
    );
    await client.query("insert into client_profiles (id,user_id) values ($1,$2)", [
      profileId,
      clientUser,
    ]);
    const category = await client.query(
      "select id from vendor_categories order by sort_order limit 1"
    );
    await client.query(
      `insert into vendor_profiles (id,user_id,business_name,slug,category_id)
       values ($1,$2,$3,$4,$5)`,
      [vendorProfileId, vendorUser, `Vendor ${suffix}`, `vendor-${suffix}`, category.rows[0].id]
    );
    await client.query(
      `insert into bookings (id, client_profile_id, vendor_profile_id, status, total_amount, vendor_amount, final_price, paid_amount)
       values ($1,$2,$3,'CONFIRMED',100000,100000,120000,60000)`,
      [bookingId, profileId, vendorProfileId]
    );

    // 1 — the two directions are independent: a client payment must not read as
    //     a vendor payout, which is exactly what paid_amount could not express.
    await client.query(
      `insert into payments (kind, amount, booking_id, client_profile_id, is_paid, paid_at)
       values ('CLIENT_IN', 50000, $1, $2, true, now())`,
      [bookingId, profileId]
    );
    let rows = await client.query(
      "select booking_id, kind, amount, is_paid from payments where booking_id = $1",
      [bookingId]
    );
    let totals = totalsFromPayments(rows.rows);
    assert.equal(totals.clientPaid, 50000, "client receipt should be counted");
    assert.equal(totals.vendorPaid, 0, "a client receipt must not count as a payout");

    // 2 — a payout is tracked separately on the same booking.
    await client.query(
      `insert into payments (kind, amount, booking_id, client_profile_id, vendor_profile_id, is_paid, paid_at)
       values ('VENDOR_OUT', 30000, $1, $2, $3, true, now())`,
      [bookingId, profileId, vendorProfileId]
    );
    rows = await client.query(
      "select booking_id, kind, amount, is_paid from payments where booking_id = $1",
      [bookingId]
    );
    totals = totalsFromPayments(rows.rows);
    assert.equal(totals.clientPaid, 50000);
    assert.equal(totals.vendorPaid, 30000);

    // 3 — an unsettled row is scheduled, not paid.
    await client.query(
      `insert into payments (kind, amount, booking_id, client_profile_id, is_paid)
       values ('CLIENT_IN', 70000, $1, $2, false)`,
      [bookingId, profileId]
    );
    rows = await client.query(
      "select booking_id, kind, amount, is_paid from payments where booking_id = $1",
      [bookingId]
    );
    totals = totalsFromPayments(rows.rows);
    assert.equal(totals.clientPaid, 50000, "an unsettled row must not count as paid");
    assert.equal(totals.clientScheduled, 70000);

    // 4 — grouping per booking works for the analytics read path.
    const grouped = totalsByBooking(rows.rows);
    assert.equal(grouped.get(bookingId)?.vendorPaid, 30000);

    // 5 — the legacy balance is reported only while nothing has been attributed.
    assert.equal(
      legacyUnattributedPaid(60000, totals),
      0,
      "legacy balance is superseded once real movements exist"
    );
    assert.equal(
      legacyUnattributedPaid(60000, { clientPaid: 0, vendorPaid: 0, clientScheduled: 0, vendorScheduled: 0 }),
      60000,
      "legacy balance is surfaced while unattributed"
    );

    // 6 — the database refuses contradictory rows.
    await assert.rejects(
      client.query(
        `insert into payments (kind, amount, booking_id, is_paid) values ('CLIENT_IN', -1, $1, false)`,
        [bookingId]
      ),
      (e: { code?: string }) => e.code === "23514",
      "a negative amount must be rejected"
    );
    await assert.rejects(
      client.query(
        `insert into payments (kind, amount, booking_id, is_paid, paid_at) values ('CLIENT_IN', 10, $1, false, now())`,
        [bookingId]
      ),
      (e: { code?: string }) => e.code === "23514",
      "an unsettled row cannot carry a settlement date"
    );
    await assert.rejects(
      client.query(
        `insert into payments (kind, amount, booking_id, is_paid) values ('REFUND', 10, $1, false)`,
        [bookingId]
      ),
      (e: { code?: string }) => e.code === "23514",
      "an undefined direction must be rejected"
    );

    console.log("Payment ledger: 6 focused cases passed.");
  } finally {
    await client.query("delete from payments where booking_id = $1", [bookingId]);
    await client.query("delete from bookings where id = $1", [bookingId]);
    await client.query("delete from vendor_profiles where id = $1", [vendorProfileId]);
    await client.query("delete from client_profiles where id = $1", [profileId]);
    await client.query("delete from users where id in ($1,$2)", [clientUser, vendorUser]);
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
