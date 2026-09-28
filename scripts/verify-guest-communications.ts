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
  const clientUserA = `verify_comms_client_a_${suffix}`;
  const clientUserB = `verify_comms_client_b_${suffix}`;
  const clientProfileA = randomUUID();
  const clientProfileB = randomUUID();
  const weddingA = randomUUID();
  const weddingB = randomUUID();
  const guestListA = randomUUID();
  const guestListB = randomUUID();
  const guestA = randomUUID();
  const guestB = randomUUID();
  const campaignId = randomUUID();

  try {
    const capability = await client.query(`
      select
        to_regclass('public.event_guest_communication_campaigns') is not null as campaigns_exist,
        to_regclass('public.event_guest_communication_recipients') is not null as recipients_exist,
        to_regclass('public.event_guest_contact_preferences') is not null as preferences_exist,
        to_regclass('public.event_guest_communication_activity') is not null as activity_exists,
        not has_table_privilege('anon', 'public.event_guest_communication_campaigns', 'select') as anon_denied,
        not has_table_privilege('authenticated', 'public.event_guest_communication_recipients', 'select') as authenticated_denied,
        has_table_privilege('service_role', 'public.event_guest_communication_campaigns', 'select') as service_allowed,
        to_regprocedure('public.transition_guest_communication_campaign(uuid,uuid,integer,text,text,jsonb)') is not null as transition_rpc_exists
    `);
    assert.deepEqual(capability.rows[0], {
      campaigns_exist: true,
      recipients_exist: true,
      preferences_exist: true,
      activity_exists: true,
      anon_denied: true,
      authenticated_denied: true,
      service_allowed: true,
      transition_rpc_exists: true,
    });

    await client.query(
      `insert into public.users (id, email, name, role) values
       ($1, $2, 'Communication client A', 'CLIENT'),
       ($3, $4, 'Communication client B', 'CLIENT')`,
      [
        clientUserA,
        `testing+${clientUserA}@elysiancelebrations.app`,
        clientUserB,
        `testing+${clientUserB}@elysiancelebrations.app`,
      ],
    );
    await client.query(
      `insert into public.client_profiles (id, user_id) values ($1, $2), ($3, $4)`,
      [clientProfileA, clientUserA, clientProfileB, clientUserB],
    );
    await client.query(
      `insert into public.weddings (id, client_profile_id, name) values
       ($1, $2, 'Communication Event A'), ($3, $4, 'Communication Event B')`,
      [weddingA, clientProfileA, weddingB, clientProfileB],
    );
    await client.query(
      `insert into public.guest_lists (id, client_profile_id, name) values
       ($1, $2, 'List A'), ($3, $4, 'List B')`,
      [guestListA, clientProfileA, guestListB, clientProfileB],
    );
    await client.query(
      `insert into public.guests (id, guest_list_id, name, phone, rsvp_status) values
       ($1, $2, 'Included Guest', '+919876500001', 'CONFIRMED'),
       ($3, $4, 'Foreign Guest', '+919876500002', 'CONFIRMED')`,
      [guestA, guestListA, guestB, guestListB],
    );
    await client.query(
      `insert into public.event_guest_contact_preferences (
        wedding_id, guest_id, channel, consent_status, source, updated_by
      ) values ($1, $2, 'WHATSAPP', 'OPTED_OUT', 'Guest request', $3)`,
      [weddingA, guestA, clientUserA],
    );
    await client.query(
      `insert into public.event_guest_communication_campaigns (
        id, wedding_id, campaign_type, title, message_body, channel,
        audience_definition, created_by, updated_by
      ) values ($1, $2, 'RSVP', 'RSVP reminder', 'Hello {{guest_name}}', 'WHATSAPP',
        '{"guestIds":[]}'::jsonb, $3, $3)`,
      [campaignId, weddingA, clientUserA],
    );

    await expectPgError(
      client,
      "draft export",
      "23514",
      () => client.query(
        `select public.transition_guest_communication_campaign(
          $1, $2, 1, 'EXPORTED', $3, '[]'::jsonb
        )`,
        [weddingA, campaignId, clientUserA],
      ),
    );
    await expectPgError(
      client,
      "cross event recipient",
      "23503",
      () => client.query(
        `insert into public.event_guest_communication_recipients (
          campaign_id, wedding_id, guest_id, recipient_name, channel,
          destination, consent_snapshot, rendered_message
        ) values ($1, $2, $3, 'Foreign Guest', 'WHATSAPP', '+919876500002', 'OPTED_IN', 'Hello')`,
        [campaignId, weddingA, guestB],
      ),
    );

    const approved = await client.query(
      `select public.transition_guest_communication_campaign(
        $1, $2, 1, 'APPROVED', $3, $4::jsonb
      ) as campaign`,
      [
        weddingA,
        campaignId,
        clientUserA,
        JSON.stringify([
          {
            guestId: guestA,
            recipientName: "Included Guest",
            channel: "WHATSAPP",
            destination: "+919876500001",
            consentSnapshot: "OPTED_OUT",
            renderedMessage: "Hello Included Guest",
            exclusionReason: "OPTED_OUT",
          },
        ]),
      ],
    );
    assert.equal(approved.rows[0].campaign, campaignId);
    const approvedRow = await client.query(
      `select status, version from public.event_guest_communication_campaigns where id = $1`,
      [campaignId],
    );
    assert.deepEqual(approvedRow.rows[0], { status: "APPROVED", version: 2 });
    const excluded = await client.query(
      `select delivery_status, exclusion_reason from public.event_guest_communication_recipients where campaign_id = $1`,
      [campaignId],
    );
    assert.deepEqual(excluded.rows[0], {
      delivery_status: "EXCLUDED",
      exclusion_reason: "OPTED_OUT",
    });

    await client.query(
      `select public.transition_guest_communication_campaign(
        $1, $2, 2, 'EXPORTED', $3, null
      )`,
      [weddingA, campaignId, clientUserA],
    );
    await expectPgError(
      client,
      "immutable exported message",
      "23514",
      () => client.query(
        `update public.event_guest_communication_recipients
         set rendered_message = 'Changed after export' where campaign_id = $1`,
        [campaignId],
      ),
    );
    await client.query(
      `select public.transition_guest_communication_campaign(
        $1, $2, 3, 'SENT', $3, $4::jsonb
      )`,
      [
        weddingA,
        campaignId,
        clientUserA,
        JSON.stringify([{ guestId: guestA, status: "OPTED_OUT", reference: "manual-result" }]),
      ],
    );
    const sent = await client.query(
      `select status, version from public.event_guest_communication_campaigns where id = $1`,
      [campaignId],
    );
    assert.deepEqual(sent.rows[0], { status: "SENT", version: 4 });
  } finally {
    await client.query("rollback");
    await client.end();
  }

  console.log("Guest communications database verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
