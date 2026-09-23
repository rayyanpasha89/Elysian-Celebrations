import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { billingDisplayStatus } from "@/lib/billing";

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
  assert.equal(
    billingDisplayStatus(
      "ISSUED",
      "2026-08-29",
      new Date("2026-08-29T19:00:00.000Z")
    ),
    "OVERDUE"
  );
  assert.equal(
    billingDisplayStatus(
      "ISSUED",
      "2026-08-30",
      new Date("2026-08-29T19:00:00.000Z")
    ),
    "ISSUED"
  );

  const client = databaseClient();
  await client.connect();
  const actor = `verify-billing-${randomUUID()}`;

  try {
    const privileges = await client.query(
      `select
         has_table_privilege('service_role', 'public.payments', 'select') as payment_select,
         has_table_privilege('service_role', 'public.payments', 'insert') as payment_insert,
         has_table_privilege('service_role', 'public.payments', 'update') as payment_update,
         has_table_privilege('service_role', 'public.payments', 'delete') as payment_delete,
         (
           select bool_and(has_table_privilege('service_role', table_name, 'select'))
           from (values
             ('public.billing_invoices'),
             ('public.billing_payment_attempts'),
             ('public.billing_refunds'),
             ('public.billing_webhook_events')
           ) as billing_table(table_name)
         ) as billing_tables_select,
         (
           select bool_or(
             has_table_privilege('service_role', table_name, 'insert')
             or has_table_privilege('service_role', table_name, 'update')
             or has_table_privilege('service_role', table_name, 'delete')
             or has_table_privilege('service_role', table_name, 'truncate')
           )
           from (values
             ('public.billing_invoices'),
             ('public.billing_payment_attempts'),
             ('public.billing_refunds'),
             ('public.billing_webhook_events')
           ) as billing_table(table_name)
         ) as billing_tables_mutate,
         has_sequence_privilege('service_role', 'public.billing_invoice_number_seq', 'usage') as sequence_usage,
         has_table_privilege('authenticated', 'public.billing_invoices', 'select') as client_invoice_select,
         (
           select bool_and(has_function_privilege('service_role', signature, 'execute'))
           from (values
             ('public.issue_booking_invoice(uuid,integer,date,text,text,text,text)'),
             ('public.settle_billing_invoice(uuid,text,timestamptz,text,text)'),
             ('public.void_billing_invoice(uuid,text,text)'),
             ('public.record_billing_refund(uuid,integer,text,text,text,text,text)'),
             ('public.set_booking_pricing(uuid,integer,integer,boolean,timestamptz,text)'),
             ('public.purge_test_booking_financials(uuid[],text)'),
             ('public.admin_billing_summary()')
           ) as billing_function(signature)
         ) as service_billing_execute,
         (
           select bool_or(
             has_function_privilege('anon', signature, 'execute')
             or has_function_privilege('authenticated', signature, 'execute')
           )
           from (values
             ('public.issue_booking_invoice(uuid,integer,date,text,text,text,text)'),
             ('public.settle_billing_invoice(uuid,text,timestamptz,text,text)'),
             ('public.void_billing_invoice(uuid,text,text)'),
             ('public.record_billing_refund(uuid,integer,text,text,text,text,text)'),
             ('public.set_booking_pricing(uuid,integer,integer,boolean,timestamptz,text)'),
             ('public.purge_test_booking_financials(uuid[],text)'),
             ('public.admin_billing_summary()')
           ) as billing_function(signature)
         ) as browser_billing_execute,
         has_function_privilege(
           'anon',
           'public.issue_booking_invoice(uuid,integer,date,text,text,text,text)',
           'execute'
         ) as anon_issue,
         has_function_privilege(
           'service_role',
           'public.issue_booking_invoice(uuid,integer,date,text,text,text,text)',
           'execute'
         ) as service_issue`
    );
    assert.deepEqual(privileges.rows[0], {
      payment_select: true,
      payment_insert: false,
      payment_update: false,
      payment_delete: false,
      billing_tables_select: true,
      billing_tables_mutate: false,
      sequence_usage: false,
      client_invoice_select: false,
      service_billing_execute: true,
      browser_billing_execute: false,
      anon_issue: false,
      service_issue: true,
    });

    await client.query("begin");
    const summaryBefore = await client.query(
      "select * from public.admin_billing_summary()"
    );
    const bookingResult = await client.query(
      `select
         booking.id,
         booking.vendor_amount,
         booking.final_price,
         coalesce(sum(payment.amount) filter (
           where payment.kind = 'CLIENT_IN' and payment.voided_at is null
         ), 0)::int as client_recorded
       from public.bookings as booking
       left join public.payments as payment on payment.booking_id = booking.id
       where booking.price_published
         and booking.final_price is not null
         and booking.status <> 'CANCELLED'
       group by booking.id
       having booking.final_price - coalesce(sum(payment.amount) filter (
         where payment.kind = 'CLIENT_IN' and payment.voided_at is null
       ), 0) >= 50
       order by booking.updated_at desc
       limit 1`
    );
    assert.ok(
      bookingResult.rowCount,
      "A published booking with at least INR 50 unallocated is required"
    );
    const booking = bookingResult.rows[0] as {
      id: string;
      vendor_amount: number;
      final_price: number;
      client_recorded: number;
    };

    const issueKey = randomUUID();
    const issued = await client.query(
      `select (public.issue_booking_invoice(
         $1, 10, current_date + 7, $2,
         'Planning installment', 'Rollback-safe invoice', $3
       )).*`,
      [booking.id, issueKey, actor]
    );
    const invoice = issued.rows[0] as {
      id: string;
      invoice_number: string;
      payment_id: string;
      status: string;
      amount: number;
    };
    assert.match(invoice.invoice_number, /^ELYS-[0-9]{4}-[0-9]{6}$/);
    assert.equal(invoice.status, "ISSUED");
    assert.equal(invoice.amount, 10);

    const summaryAfterIssue = await client.query(
      "select * from public.admin_billing_summary()"
    );
    assert.equal(
      Number(summaryAfterIssue.rows[0].scheduled),
      Number(summaryBefore.rows[0].scheduled) + 10
    );
    assert.equal(
      Number(summaryAfterIssue.rows[0].outstanding),
      Number(summaryBefore.rows[0].outstanding) + 10
    );
    assert.equal(
      Number(summaryAfterIssue.rows[0].issued_count),
      Number(summaryBefore.rows[0].issued_count) + 1
    );

    const payment = await client.query(
      `select kind, amount, is_paid, paid_at
       from public.payments where id = $1`,
      [invoice.payment_id]
    );
    assert.deepEqual(payment.rows[0], {
      kind: "CLIENT_IN",
      amount: 10,
      is_paid: false,
      paid_at: null,
    });

    const retried = await client.query(
      `select (public.issue_booking_invoice(
         $1, 10, current_date + 7, $2,
         'Planning installment', 'Rollback-safe invoice', $3
       )).id as id`,
      [booking.id, issueKey, actor]
    );
    assert.equal(retried.rows[0].id, invoice.id);

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.issue_booking_invoice(
             $1, 11, current_date + 7, $2,
             'Planning installment', 'Rollback-safe invoice', $3
           )`,
          [booking.id, issueKey, actor]
        ),
      "23514"
    );

    await expectDatabaseError(
      client,
      () =>
        client.query("update public.payments set amount = 12 where id = $1", [
          invoice.payment_id,
        ]),
      "23514"
    );

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `insert into public.billing_payment_attempts (
             invoice_id, provider, idempotency_key, amount_minor
           ) values ($1, 'razorpay', $2, 999)`,
          [invoice.id, randomUUID()]
        ),
      "23514"
    );

    const attempt = await client.query(
      `insert into public.billing_payment_attempts (
         invoice_id, provider, idempotency_key, amount_minor
       ) values ($1, 'razorpay', $2, 1000)
       returning provider`,
      [invoice.id, randomUUID()]
    );
    assert.equal(attempt.rows[0].provider, "RAZORPAY");

    await client.query(
      `select public.settle_billing_invoice(
         $1, 'UPI', now(), 'VERIFY-RECEIPT', $2
       )`,
      [invoice.id, actor]
    );
    let refreshed = await client.query(
      `select status, paid_at, refunded_amount
       from public.billing_invoices where id = $1`,
      [invoice.id]
    );
    assert.equal(refreshed.rows[0].status, "PAID");
    assert.ok(refreshed.rows[0].paid_at);
    assert.equal(refreshed.rows[0].refunded_amount, 0);

    const settlementRetry = await client.query(
      `select (public.settle_billing_invoice(
         $1, 'UPI', now(), 'VERIFY-RECEIPT', $2
       )).status as status`,
      [invoice.id, actor]
    );
    assert.equal(settlementRetry.rows[0].status, "PAID");

    await expectDatabaseError(
      client,
      () =>
        client.query(
          "select public.void_billing_invoice($1, 'Erase receipt', $2)",
          [invoice.id, actor]
        ),
      "23514"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          "select public.void_booking_payment($1, $2, 'Erase receipt', $3)",
          [booking.id, invoice.payment_id, actor]
        ),
      "23514"
    );

    const refundKey = randomUUID();
    const partialRefund = await client.query(
      `select (public.record_billing_refund(
         $1, 4, $2, 'UPI', 'VERIFY-REFUND', 'Client correction', $3
       )).id as id`,
      [invoice.id, refundKey, actor]
    );
    refreshed = await client.query(
      `select status, refunded_amount
       from public.billing_invoices where id = $1`,
      [invoice.id]
    );
    assert.equal(refreshed.rows[0].status, "PARTIALLY_REFUNDED");
    assert.equal(refreshed.rows[0].refunded_amount, 4);

    await expectDatabaseError(
      client,
      () =>
        client.query(
          "select public.void_billing_invoice($1, 'Erase refund history', $2)",
          [invoice.id, actor]
        ),
      "23514"
    );
    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.settle_billing_invoice(
             $1, 'UPI', now(), 'VERIFY-RECEIPT', $2
           )`,
          [invoice.id, actor]
        ),
      "23514"
    );

    const refundRetry = await client.query(
      `select (public.record_billing_refund(
         $1, 4, $2, 'UPI', 'VERIFY-REFUND', 'Client correction', $3
       )).id as id`,
      [invoice.id, refundKey, actor]
    );
    assert.equal(refundRetry.rows[0].id, partialRefund.rows[0].id);

    await client.query(
      `select public.record_billing_refund(
         $1, 6, $2, 'BANK', 'VERIFY-REFUND-2', 'Complete refund', $3
       )`,
      [invoice.id, randomUUID(), actor]
    );
    refreshed = await client.query(
      `select status, refunded_amount
       from public.billing_invoices where id = $1`,
      [invoice.id]
    );
    assert.equal(refreshed.rows[0].status, "REFUNDED");
    assert.equal(refreshed.rows[0].refunded_amount, 10);

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.settle_billing_invoice(
             $1, 'BANK', now(), 'VERIFY-RECEIPT', $2
           )`,
          [invoice.id, actor]
        ),
      "23514"
    );

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.record_billing_refund(
             $1, 1, $2, 'BANK', null, 'Over refund', $3
           )`,
          [invoice.id, randomUUID(), actor]
        ),
      "23514"
    );

    const openInvoice = await client.query(
      `select (public.issue_booking_invoice(
         $1, 5, current_date + 14, $2, null, null, $3
       )).*`,
      [booking.id, randomUUID(), actor]
    );
    await client.query(
      "select public.void_billing_invoice($1, 'Schedule replaced', $2)",
      [openInvoice.rows[0].id, actor]
    );
    const voided = await client.query(
      `select invoice.status, payment.voided_at
       from public.billing_invoices as invoice
       join public.payments as payment on payment.id = invoice.payment_id
       where invoice.id = $1`,
      [openInvoice.rows[0].id]
    );
    assert.equal(voided.rows[0].status, "VOID");
    assert.ok(voided.rows[0].voided_at);

    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.set_booking_pricing(
             $1, $2, 0, true,
             (select updated_at from public.bookings where id = $1),
             $3
           )`,
          [booking.id, booking.vendor_amount + 1, actor]
        ),
      "23514"
    );

    const overAmount = booking.final_price - booking.client_recorded + 1;
    await expectDatabaseError(
      client,
      () =>
        client.query(
          `select public.issue_booking_invoice(
             $1, $2, current_date + 21, $3, null, null, $4
           )`,
          [booking.id, overAmount, randomUUID(), actor]
        ),
      "23514"
    );

    const audit = await client.query(
      `select action from public.admin_audit_log
       where actor_user_id = $1`,
      [actor]
    );
    assert.ok(audit.rows.some((row) => row.action === "BILLING_INVOICE_ISSUED"));
    assert.ok(audit.rows.some((row) => row.action === "BILLING_REFUND_RECORDED"));

    await client.query("rollback");
    const persisted = await client.query(
      `select count(*)::int as count from public.admin_audit_log
       where actor_user_id = $1`,
      [actor]
    );
    assert.equal(persisted.rows[0].count, 0);

    console.log("Billing invoice state and security checks passed with a full rollback.");
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
