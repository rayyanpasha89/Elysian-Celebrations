import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

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
  expectedCode: string
) {
  const savepoint = `verify_${randomUUID().replaceAll("-", "")}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    await query();
    assert.fail(`Expected database error ${expectedCode}`);
  } catch (error) {
    assert.equal((error as { code?: string }).code, expectedCode);
  } finally {
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query(`release savepoint ${savepoint}`);
  }
}

async function main() {
  const client = databaseClient();
  await client.connect();
  const actor = `verify-payments-${randomUUID()}`;

  try {
    const privileges = await client.query(
      `select
         has_function_privilege('anon', 'public.record_booking_payment(uuid,text,integer,text,date,boolean,timestamptz,text,text,text,text)', 'execute') as anon,
         has_function_privilege('authenticated', 'public.record_booking_payment(uuid,text,integer,text,date,boolean,timestamptz,text,text,text,text)', 'execute') as authenticated,
         has_function_privilege('service_role', 'public.record_booking_payment(uuid,text,integer,text,date,boolean,timestamptz,text,text,text,text)', 'execute') as service_role`
    );
    assert.equal(privileges.rows[0].anon, false);
    assert.equal(privileges.rows[0].authenticated, false);
    assert.equal(privileges.rows[0].service_role, true);

    await client.query("begin");
    const bookingResult = await client.query(
      `select
         booking.id,
         booking.client_profile_id,
         booking.vendor_profile_id,
         booking.final_price,
         booking.vendor_amount,
         coalesce(sum(payment.amount) filter (
           where payment.kind = 'CLIENT_IN' and payment.voided_at is null
         ), 0)::int as client_recorded,
         coalesce(sum(payment.amount) filter (
           where payment.kind = 'VENDOR_OUT' and payment.voided_at is null
         ), 0)::int as vendor_recorded
       from bookings as booking
       left join payments as payment on payment.booking_id = booking.id
       where booking.final_price is not null and booking.vendor_amount is not null
       group by booking.id
       having booking.final_price - coalesce(sum(payment.amount) filter (
         where payment.kind = 'CLIENT_IN' and payment.voided_at is null
       ), 0) >= 10
       and booking.vendor_amount - coalesce(sum(payment.amount) filter (
         where payment.kind = 'VENDOR_OUT' and payment.voided_at is null
       ), 0) >= 10
       limit 1`
    );
    assert.ok(bookingResult.rowCount, "A fixed-price booking is required for ledger verification");
    const booking = bookingResult.rows[0];

    const scheduled = await client.query(
      `select (record_booking_payment(
        $1, 'CLIENT_IN', 5, 'Verification receipt', current_date, false,
        null, null, null, 'Rollback-safe test', $2
      )).id as id`,
      [booking.id, actor]
    );
    const clientPaymentId = scheduled.rows[0].id;
    assert.ok(clientPaymentId);

    const scheduledRow = await client.query(
      "select is_paid, paid_at, client_profile_id, vendor_profile_id from payments where id = $1",
      [clientPaymentId]
    );
    assert.equal(scheduledRow.rows[0].is_paid, false);
    assert.equal(scheduledRow.rows[0].paid_at, null);
    assert.equal(scheduledRow.rows[0].client_profile_id, booking.client_profile_id);
    assert.equal(scheduledRow.rows[0].vendor_profile_id, booking.vendor_profile_id);

    await client.query(
      "select settle_booking_payment($1, $2, 'UPI', now(), 'VERIFY-UTR', $3)",
      [booking.id, clientPaymentId, actor]
    );
    const settledRow = await client.query(
      "select is_paid, paid_at, method, reference from payments where id = $1",
      [clientPaymentId]
    );
    assert.equal(settledRow.rows[0].is_paid, true);
    assert.ok(settledRow.rows[0].paid_at);
    assert.equal(settledRow.rows[0].method, "UPI");
    assert.equal(settledRow.rows[0].reference, "VERIFY-UTR");

    const payout = await client.query(
      `select (record_booking_payment(
        $1, 'VENDOR_OUT', 5, 'Verification payout', null, true,
        now(), 'BANK', 'VERIFY-BANK', null, $2
      )).id as id`,
      [booking.id, actor]
    );
    assert.ok(payout.rows[0].id);

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select record_booking_payment(
            $1, 'VENDOR_OUT', $2, null, null, true, now(), 'BANK', null, null, $3
          )`,
          [booking.id, booking.vendor_amount + 1, actor]
        ),
      "23514"
    );

    const otherClient = await client.query(
      "select id from client_profiles where id <> $1 limit 1",
      [booking.client_profile_id]
    );
    if (otherClient.rowCount) {
      await expectDatabaseError(
        client,
        () =>
          client.query(
            `insert into payments (
              kind, booking_id, client_profile_id, amount, is_paid, paid_at
            ) values ('CLIENT_IN', $1, $2, 1, true, now())`,
            [booking.id, otherClient.rows[0].id]
          ),
        "23514"
      );
    }

    await expectDatabaseError(
      client,
      () =>
        client.query(
          "select void_booking_payment($1, $2, 'Verification correction', $3)",
          [booking.id, clientPaymentId, actor]
        ),
      "23514"
    );

    const replaceableSchedule = await client.query(
      `select (record_booking_payment(
        $1, 'CLIENT_IN', 1, 'Replaceable schedule', current_date, false,
        null, null, null, 'Rollback-safe void test', $2
      )).id as id`,
      [booking.id, actor]
    );
    await client.query(
      "select void_booking_payment($1, $2, 'Verification correction', $3)",
      [booking.id, replaceableSchedule.rows[0].id, actor]
    );
    const voided = await client.query(
      "select voided_at, void_reason from payments where id = $1",
      [replaceableSchedule.rows[0].id]
    );
    assert.ok(voided.rows[0].voided_at);
    assert.equal(voided.rows[0].void_reason, "Verification correction");

    const audit = await client.query(
      "select action from admin_audit_log where actor_user_id = $1 order by created_at",
      [actor]
    );
    assert.deepEqual(
      audit.rows.map((row) => row.action).sort(),
      [
        "PAYMENT_RECORDED",
        "PAYMENT_RECORDED",
        "PAYMENT_RECORDED",
        "PAYMENT_SETTLED",
        "PAYMENT_VOIDED",
      ].sort()
    );

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from admin_audit_log where actor_user_id = $1",
      [actor]
    );
    assert.equal(persisted.rows[0].count, 0, "verification must leave no audit rows");

    console.log("Payment ledger: 8 focused cases passed with a full rollback.");
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
