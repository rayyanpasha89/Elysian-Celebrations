import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

const MIGRATION_PATH =
  "supabase/migrations/20260902073945_retry_unmatched_billing_webhooks.sql";
const BEGIN_SIGNATURE = "public.begin_billing_checkout(text,uuid,text,text)";
const ATTACH_SIGNATURE =
  "public.attach_billing_checkout_order(text,uuid,text,timestamptz,jsonb)";
const FAIL_SIGNATURE =
  "public.fail_billing_checkout_attempt(text,uuid,text,text)";
const PROCESS_SIGNATURE =
  "public.process_billing_gateway_event(text,text,text,text,text,text,text,timestamptz,text,text)";

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

async function beginCheckout(
  client: Client,
  actor: string,
  invoiceId: string,
  idempotencyKey: string
) {
  return client.query(
    `select (public.begin_billing_checkout($1, $2, 'testpay', $3)).*`,
    [actor, invoiceId, idempotencyKey]
  );
}

async function attachOrder(
  client: Client,
  actor: string,
  attemptId: string,
  orderId: string
) {
  return client.query(
    `select (public.attach_billing_checkout_order(
       $1, $2, $3, now() + interval '20 minutes', $4::jsonb
     )).*`,
    [actor, attemptId, orderId, JSON.stringify({ checkoutMode: "hosted" })]
  );
}

async function processEvent(
  client: Client,
  input: {
    eventId: string;
    eventType: string;
    digest: string;
    orderId: string | null;
    paymentId: string | null;
    status: "CAPTURED" | "FAILED" | "IGNORED";
    failureCode?: string | null;
    failureMessage?: string | null;
  }
) {
  return client.query(
    `select public.process_billing_gateway_event(
       'testpay', $1, $2, $3, $4, $5, $6, now(), $7, $8
     ) as result`,
    [
      input.eventId,
      input.eventType,
      input.digest,
      input.orderId,
      input.paymentId,
      input.status,
      input.failureCode ?? null,
      input.failureMessage ?? null,
    ]
  );
}

async function main() {
  const client = databaseClient();
  await client.connect();

  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const ownerUserId = `verify_gateway_owner_${suffix}`;
  const otherUserId = `verify_gateway_other_${suffix}`;
  const vendorUserId = `verify_gateway_vendor_${suffix}`;
  const clientProfileId = randomUUID();

  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    if (process.env.ELYSIAN_TEST_APPLY_MIGRATION === "1") {
      await client.query(readFileSync(MIGRATION_PATH, "utf8"));
    }

    const privileges = await client.query(
      `select
         to_regprocedure($1) is not null as begin_exists,
         to_regprocedure($2) is not null as attach_exists,
         to_regprocedure($3) is not null as fail_exists,
         to_regprocedure($4) is not null as process_exists,
         (
           select bool_and(has_function_privilege('service_role', signature, 'execute'))
           from unnest($5::text[]) as rpc(signature)
         ) as service_allowed,
         (
           select bool_or(
             has_function_privilege('anon', signature, 'execute')
             or has_function_privilege('authenticated', signature, 'execute')
           )
           from unnest($5::text[]) as rpc(signature)
         ) as browser_allowed`,
      [
        BEGIN_SIGNATURE,
        ATTACH_SIGNATURE,
        FAIL_SIGNATURE,
        PROCESS_SIGNATURE,
        [BEGIN_SIGNATURE, ATTACH_SIGNATURE, FAIL_SIGNATURE, PROCESS_SIGNATURE],
      ]
    );
    assert.deepEqual(privileges.rows[0], {
      begin_exists: true,
      attach_exists: true,
      fail_exists: true,
      process_exists: true,
      service_allowed: true,
      browser_allowed: false,
    });

    await client.query(
      `insert into public.users (id, email, name, role)
       values
         ($1, $4, 'Gateway Owner', 'CLIENT'),
         ($2, $5, 'Gateway Other', 'CLIENT'),
         ($3, $6, 'Gateway Vendor', 'VENDOR')`,
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
        [`Gateway Category ${suffix}`, `gateway-category-${suffix}`]
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
          `Gateway Vendor ${suffix}`,
          `gateway-vendor-${suffix}`,
        ]
      )
    ).rows[0].id as string;
    const weddingId = (
      await client.query(
        `insert into public.weddings (client_profile_id, name)
         values ($1, 'Gateway verification') returning id`,
        [clientProfileId]
      )
    ).rows[0].id as string;
    const eventId = (
      await client.query(
        `insert into public.wedding_events (wedding_id, name)
         values ($1, 'Gateway function') returning id`,
        [weddingId]
      )
    ).rows[0].id as string;
    const bookingId = (
      await client.query(
        `insert into public.bookings (
           client_profile_id, vendor_profile_id, wedding_event_id, status,
           total_amount, vendor_amount, final_price, price_published
         ) values ($1, $2, $3, 'CONFIRMED', 100000, 100000, 120000, true)
         returning id`,
        [clientProfileId, vendorProfileId, eventId]
      )
    ).rows[0].id as string;

    const firstInvoice = (
      await client.query(
        `select (public.issue_booking_invoice(
           $1, 1000, current_date + 7, $2,
           'Gateway installment one', 'Gateway verification', $3
         )).*`,
        [bookingId, `gateway-invoice-one-${suffix}`, ownerUserId]
      )
    ).rows[0] as { id: string; status: string; payment_id: string };
    const secondInvoice = (
      await client.query(
        `select (public.issue_booking_invoice(
           $1, 1000, current_date + 14, $2,
           'Gateway installment two', 'Gateway verification', $3
         )).*`,
        [bookingId, `gateway-invoice-two-${suffix}`, ownerUserId]
      )
    ).rows[0] as { id: string; status: string };

    await expectDatabaseError(
      client,
      () => beginCheckout(client, otherUserId, firstInvoice.id, `cross-${suffix}`),
      "42501",
      "cross-owner checkout"
    );

    const firstKey = `checkout-first-${suffix}`;
    const firstAttempt = (
      await beginCheckout(client, ownerUserId, firstInvoice.id, firstKey)
    ).rows[0] as {
      id: string;
      provider: string;
      status: string;
      amount_minor: string;
      idempotency_key: string;
    };
    assert.equal(firstAttempt.provider, "TESTPAY");
    assert.equal(firstAttempt.status, "CREATED");
    assert.equal(Number(firstAttempt.amount_minor), 100_000);
    assert.equal(firstAttempt.idempotency_key, firstKey);

    const reused = (
      await beginCheckout(
        client,
        ownerUserId,
        firstInvoice.id,
        `different-key-${suffix}`
      )
    ).rows[0] as { id: string; idempotency_key: string };
    assert.equal(reused.id, firstAttempt.id);
    assert.equal(reused.idempotency_key, firstKey);

    await expectDatabaseError(
      client,
      () => beginCheckout(client, ownerUserId, secondInvoice.id, firstKey),
      "23514",
      "cross-invoice idempotency"
    );

    const attached = (
      await attachOrder(client, ownerUserId, firstAttempt.id, `order-first-${suffix}`)
    ).rows[0] as { id: string; status: string; provider_order_id: string };
    assert.equal(attached.id, firstAttempt.id);
    assert.equal(attached.status, "PENDING");
    assert.equal(attached.provider_order_id, `order-first-${suffix}`);

    const attachedRetry = (
      await attachOrder(client, ownerUserId, firstAttempt.id, `order-first-${suffix}`)
    ).rows[0] as { id: string; provider_order_id: string };
    assert.equal(attachedRetry.id, firstAttempt.id);
    await expectDatabaseError(
      client,
      () => attachOrder(client, ownerUserId, firstAttempt.id, `order-conflict-${suffix}`),
      "23514",
      "provider order replacement"
    );

    const failedAttempt = (
      await client.query(
        `select (public.fail_billing_checkout_attempt(
           $1, $2, 'PROVIDER_UNAVAILABLE', 'Temporary provider failure'
         )).*`,
        [ownerUserId, firstAttempt.id]
      )
    ).rows[0] as { status: string; failure_code: string };
    assert.equal(failedAttempt.status, "FAILED");
    assert.equal(failedAttempt.failure_code, "PROVIDER_UNAVAILABLE");
    assert.equal(
      (
        await client.query(
          "select status from public.billing_invoices where id = $1",
          [firstInvoice.id]
        )
      ).rows[0].status,
      "ISSUED"
    );

    const secondAttempt = (
      await beginCheckout(
        client,
        ownerUserId,
        firstInvoice.id,
        `checkout-second-${suffix}`
      )
    ).rows[0] as { id: string; status: string };
    assert.notEqual(secondAttempt.id, firstAttempt.id);
    await attachOrder(
      client,
      ownerUserId,
      secondAttempt.id,
      `order-second-${suffix}`
    );

    const missingAttempt = await processEvent(client, {
      eventId: `event-missing-${suffix}`,
      eventType: "payment.captured",
      digest: "1".repeat(64),
      orderId: `order-missing-${suffix}`,
      paymentId: `payment-missing-${suffix}`,
      status: "CAPTURED",
    });
    assert.deepEqual(missingAttempt.rows[0].result, {
      ok: false,
      duplicate: false,
      webhookId: missingAttempt.rows[0].result.webhookId,
      status: "FAILED",
      attemptId: null,
      reason: "ATTEMPT_NOT_FOUND",
    });

    const delayedAttempt = (
      await beginCheckout(
        client,
        ownerUserId,
        secondInvoice.id,
        `checkout-delayed-${suffix}`
      )
    ).rows[0] as { id: string };
    await attachOrder(
      client,
      ownerUserId,
      delayedAttempt.id,
      `order-missing-${suffix}`
    );
    const recoveredDelivery = await processEvent(client, {
      eventId: `event-missing-${suffix}`,
      eventType: "payment.captured",
      digest: "1".repeat(64),
      orderId: `order-missing-${suffix}`,
      paymentId: `payment-missing-${suffix}`,
      status: "CAPTURED",
    });
    assert.equal(recoveredDelivery.rows[0].result.ok, true);
    assert.equal(recoveredDelivery.rows[0].result.duplicate, true);
    assert.equal(recoveredDelivery.rows[0].result.status, "PROCESSED");
    assert.equal(
      (
        await client.query(
          "select status from public.billing_invoices where id = $1",
          [secondInvoice.id]
        )
      ).rows[0].status,
      "PAID"
    );

    const captureEventId = `event-capture-${suffix}`;
    const captureDigest = "2".repeat(64);
    const providerPaymentId = `payment-capture-${suffix}`;
    const captured = await processEvent(client, {
      eventId: captureEventId,
      eventType: "payment.captured",
      digest: captureDigest,
      orderId: `order-second-${suffix}`,
      paymentId: providerPaymentId,
      status: "CAPTURED",
    });
    assert.equal(captured.rows[0].result.ok, true);
    assert.equal(captured.rows[0].result.duplicate, false);
    assert.equal(captured.rows[0].result.status, "PROCESSED");

    const settledState = await client.query(
      `select
         (select status from public.billing_invoices where id = $1) as invoice_status,
         (select is_paid from public.payments where id = $2) as payment_paid,
         (
           select status from public.billing_payment_attempts where id = $3
         ) as attempt_status,
         (
           select provider_payment_id
           from public.billing_payment_attempts where id = $3
         ) as provider_payment_id`,
      [firstInvoice.id, firstInvoice.payment_id, secondAttempt.id]
    );
    assert.deepEqual(settledState.rows[0], {
      invoice_status: "PAID",
      payment_paid: true,
      attempt_status: "CAPTURED",
      provider_payment_id: providerPaymentId,
    });

    const replay = await processEvent(client, {
      eventId: captureEventId,
      eventType: "payment.captured",
      digest: captureDigest,
      orderId: `order-second-${suffix}`,
      paymentId: providerPaymentId,
      status: "CAPTURED",
    });
    assert.equal(replay.rows[0].result.duplicate, true);
    const deliveryCount = await client.query(
      `select delivery_count from public.billing_webhook_events
       where provider = 'TESTPAY' and provider_event_id = $1`,
      [captureEventId]
    );
    assert.equal(deliveryCount.rows[0].delivery_count, 2);

    await expectDatabaseError(
      client,
      () =>
        processEvent(client, {
          eventId: captureEventId,
          eventType: "payment.captured",
          digest: "3".repeat(64),
          orderId: `order-second-${suffix}`,
          paymentId: providerPaymentId,
          status: "CAPTURED",
        }),
      "23514",
      "webhook payload tampering"
    );

    const lateFailure = await processEvent(client, {
      eventId: `event-late-failure-${suffix}`,
      eventType: "payment.failed",
      digest: "4".repeat(64),
      orderId: `order-second-${suffix}`,
      paymentId: providerPaymentId,
      status: "FAILED",
      failureCode: "LATE_FAILURE",
      failureMessage: "Arrived after capture",
    });
    assert.equal(lateFailure.rows[0].result.status, "IGNORED");
    assert.equal(
      (
        await client.query(
          "select status from public.billing_invoices where id = $1",
          [firstInvoice.id]
        )
      ).rows[0].status,
      "PAID"
    );

    await client.query("rollback");
    const persisted = await client.query(
      "select count(*)::int as count from public.users where id = any($1::text[])",
      [[ownerUserId, otherUserId, vendorUserId]]
    );
    assert.equal(persisted.rows[0].count, 0);

    console.log(
      "Billing gateway lifecycle: 13 focused cases passed with a full rollback."
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
