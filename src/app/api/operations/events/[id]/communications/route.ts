import { NextRequest, NextResponse } from "next/server";
import { apiError, apiSuccess, getAuthSession, requireRole } from "@/lib/api-utils";
import {
  GUEST_CAMPAIGN_CHANNELS,
  GUEST_CAMPAIGN_TEMPLATES,
  GUEST_CONSENT_STATUSES,
  parseGuestCampaignDraft,
  renderGuestMessage,
  selectGuestCampaignRecipients,
  type GuestCampaignChannel,
  type GuestCampaignContact,
  type GuestCampaignStatus,
  type GuestConsentStatus,
} from "@/lib/guest-communications";
import { isUuid } from "@/lib/id-utils";
import { resolveOperationsAccess } from "@/lib/operations-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database.types";

type Supabase = ReturnType<typeof createAdminSupabaseClient>;
type CampaignRow = Database["public"]["Tables"]["event_guest_communication_campaigns"]["Row"];
type RecipientRow = Database["public"]["Tables"]["event_guest_communication_recipients"]["Row"];
function maskDestination(value: string | null) {
  if (!value) return null;
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  const compact = value.replace(/\s+/g, "");
  return compact.length <= 4 ? "••••" : `${"•".repeat(Math.min(8, compact.length - 4))}${compact.slice(-4)}`;
}

function csvCell(value: unknown) {
  const string = value == null ? "" : String(value);
  return `"${string.replaceAll('"', '""')}"`;
}

function buildCsv(campaign: CampaignRow, recipients: RecipientRow[]) {
  const rows = [
    ["campaign", "guest_id", "recipient_name", "channel", "destination", "message", "scheduled_for", "status", "reference"],
    ...recipients
      .filter((recipient) => recipient.delivery_status !== "EXCLUDED")
      .map((recipient) => [
        campaign.title,
        recipient.guest_id ?? "",
        recipient.recipient_name,
        recipient.channel,
        recipient.destination ?? "",
        recipient.rendered_message,
        campaign.scheduled_for ?? "",
        "",
        "",
      ]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function recipientJson(recipient: RecipientRow) {
  return {
    id: recipient.id,
    guestId: recipient.guest_id,
    recipientName: recipient.recipient_name,
    channel: recipient.channel,
    destinationMasked: maskDestination(recipient.destination),
    consentSnapshot: recipient.consent_snapshot,
    renderedMessage: recipient.rendered_message,
    deliveryStatus: recipient.delivery_status,
    exclusionReason: recipient.exclusion_reason,
    resultReference: recipient.result_reference,
    deliveredAt: recipient.delivered_at,
  };
}

function campaignJson(campaign: CampaignRow, recipients: RecipientRow[]) {
  return {
    id: campaign.id,
    weddingEventId: campaign.wedding_event_id,
    campaignType: campaign.campaign_type,
    title: campaign.title,
    messageBody: campaign.message_body,
    channel: campaign.channel,
    audience: campaign.audience_definition,
    scheduledFor: campaign.scheduled_for,
    status: campaign.status,
    version: campaign.version,
    approvedAt: campaign.approved_at,
    exportedAt: campaign.exported_at,
    sentAt: campaign.sent_at,
    updatedAt: campaign.updated_at,
    recipients: recipients
      .filter((recipient) => recipient.campaign_id === campaign.id)
      .map(recipientJson),
  };
}

async function loadEventContext(supabase: Supabase, weddingId: string) {
  const { data, error } = await supabase
    .from("weddings")
    .select("id, name, date, client_profile_id")
    .eq("id", weddingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadFunctions(supabase: Supabase, weddingId: string) {
  const { data, error } = await supabase
    .from("wedding_events")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function loadContacts(
  supabase: Supabase,
  weddingId: string,
  clientProfileId: string,
  channel: GuestCampaignChannel,
) {
  const { data: lists, error: listError } = await supabase
    .from("guest_lists")
    .select("id")
    .eq("client_profile_id", clientProfileId);
  if (listError) throw listError;
  const listIds = (lists ?? []).map((list) => list.id);
  if (!listIds.length) return [];

  const { data: guests, error: guestError } = await supabase
    .from("guests")
    .select("id, name, email, phone, side, rsvp_status")
    .in("guest_list_id", listIds)
    .order("name", { ascending: true });
  if (guestError) throw guestError;
  const guestIds = (guests ?? []).map((guest) => guest.id);
  if (!guestIds.length) return [];

  const [operationsResult, preferenceResult] = await Promise.all([
    supabase
      .from("event_guest_operations")
      .select("guest_id, invitation_status, vip_level, relationship_group")
      .eq("wedding_id", weddingId)
      .in("guest_id", guestIds),
    supabase
      .from("event_guest_contact_preferences")
      .select("guest_id, consent_status")
      .eq("wedding_id", weddingId)
      .eq("channel", channel)
      .in("guest_id", guestIds),
  ]);
  if (operationsResult.error) throw operationsResult.error;
  if (preferenceResult.error) throw preferenceResult.error;
  const operations = new Map((operationsResult.data ?? []).map((item) => [item.guest_id, item]));
  const preferences = new Map((preferenceResult.data ?? []).map((item) => [item.guest_id, item]));

  return (guests ?? []).map((guest): GuestCampaignContact => {
    const profile = operations.get(guest.id);
    const preference = preferences.get(guest.id);
    return {
      guestId: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      side: guest.side,
      rsvpStatus: guest.rsvp_status,
      invitationStatus: profile?.invitation_status ?? "NOT_INVITED",
      vipLevel: profile?.vip_level ?? "STANDARD",
      relationshipGroup: profile?.relationship_group ?? null,
      consentStatus: (preference?.consent_status ?? "UNKNOWN") as GuestConsentStatus,
    };
  });
}

async function loadWorkspace(supabase: Supabase, weddingId: string, canManage: boolean) {
  const event = await loadEventContext(supabase, weddingId);
  if (!event) return null;
  const [functions, campaignResult, recipientResult] = await Promise.all([
    loadFunctions(supabase, weddingId),
    supabase
      .from("event_guest_communication_campaigns")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("event_guest_communication_recipients")
      .select("*")
      .eq("wedding_id", weddingId)
      .order("recipient_name", { ascending: true }),
  ]);
  if (campaignResult.error) throw campaignResult.error;
  if (recipientResult.error) throw recipientResult.error;
  const [whatsappContacts, emailContacts] = await Promise.all([
    loadContacts(supabase, weddingId, event.client_profile_id, "WHATSAPP"),
    loadContacts(supabase, weddingId, event.client_profile_id, "EMAIL"),
  ]);
  const emailConsent = new Map(
    emailContacts.map((contact) => [contact.guestId, contact.consentStatus]),
  );
  return {
    campaigns: (campaignResult.data ?? []).map((campaign) =>
      campaignJson(campaign, recipientResult.data ?? []),
    ),
    templates: Object.entries(GUEST_CAMPAIGN_TEMPLATES).map(([type, template]) => ({
      type,
      ...template,
    })),
    references: {
      event: { id: event.id, name: event.name, date: event.date },
      functions: functions.map((item) => ({
        id: item.id,
        label: item.name,
        date: item.date,
        startTime: item.start_time,
        venue: item.venue,
      })),
      guests: whatsappContacts.map((contact) => ({
        id: contact.guestId,
        name: contact.name,
        side: contact.side,
        rsvpStatus: contact.rsvpStatus,
        invitationStatus: contact.invitationStatus,
        vipLevel: contact.vipLevel,
        relationshipGroup: contact.relationshipGroup,
        hasPhone: Boolean(contact.phone),
        hasEmail: Boolean(contact.email),
        whatsappConsent: contact.consentStatus,
        emailConsent: emailConsent.get(contact.guestId) ?? "UNKNOWN",
      })),
    },
    permissions: { canManage, automaticDelivery: false },
  };
}

function conflict(error: { code?: string; message?: string }) {
  if (error.code === "23514") return apiError(error.message ?? "Campaign changed", 409);
  if (["23503", "23505"].includes(error.code ?? "")) {
    return apiError(error.message ?? "Campaign references another event", 409);
  }
  return null;
}

async function authorize(id: string, permission: "VIEW_EVENT" | "MESSAGE_CLIENT") {
  const session = await getAuthSession();
  if (session instanceof NextResponse) return session;
  const roleCheck = requireRole(session, "manager", "admin");
  if (roleCheck) return roleCheck;
  const access = await resolveOperationsAccess(session, id, permission);
  if (!access) return apiError("Event not found", 404);
  return { session, access };
}

async function writeLimit(request: NextRequest, userId: string) {
  return enforceRateLimit(request, {
    scope: "guest-communications-write",
    limit: 40,
    windowSeconds: 60,
    identity: userId,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);
  const auth = await authorize(id, "VIEW_EVENT");
  if (auth instanceof NextResponse) return auth;
  try {
    const workspace = await loadWorkspace(
      createAdminSupabaseClient(),
      id,
      auth.access.permissions.includes("MESSAGE_CLIENT"),
    );
    return workspace ? apiSuccess(workspace) : apiError("Event not found", 404);
  } catch (error) {
    console.error("GET /api/operations/events/[id]/communications:", error);
    return apiError("Guest communications could not be loaded", 500);
  }
}

async function saveCampaign(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  expectedCreate: boolean,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid event", 400);
  const auth = await authorize(id, "MESSAGE_CLIENT");
  if (auth instanceof NextResponse) return auth;
  const limited = await writeLimit(request, auth.session.userId);
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }
  const parsed = parseGuestCampaignDraft(raw);
  if (!parsed.ok) return apiError(parsed.error, 400);
  if (expectedCreate !== (parsed.value.campaignId === null)) {
    return apiError(expectedCreate ? "Create a new campaign" : "Choose a campaign to update", 400);
  }

  try {
    const supabase = createAdminSupabaseClient();
    const { data: campaignId, error } = await supabase.rpc("save_guest_communication_campaign", {
      p_wedding_id: id,
      p_campaign_id: parsed.value.campaignId,
      p_expected_version: parsed.value.version,
      p_campaign: {
        campaignType: parsed.value.campaignType,
        title: parsed.value.title,
        messageBody: parsed.value.messageBody,
        weddingEventId: parsed.value.weddingEventId,
        channel: parsed.value.channel,
        scheduledFor: parsed.value.scheduledFor,
        audience: parsed.value.audience,
      } as Json,
      p_actor_user_id: auth.session.userId,
    });
    if (error) return conflict(error) ?? (() => { throw error; })();
    const { data: campaign, error: loadError } = await supabase
      .from("event_guest_communication_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("wedding_id", id)
      .single();
    if (loadError) throw loadError;
    return apiSuccess({ campaign: campaignJson(campaign, []) }, expectedCreate ? 201 : 200);
  } catch (error) {
    console.error("SAVE /api/operations/events/[id]/communications:", error);
    return apiError("Campaign could not be saved", 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return saveCampaign(request, context, true);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return saveCampaign(request, context, false);
}

function actionBody(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function dateText(value: string | null) {
  if (!value) return "date to be confirmed";
  const date = new Date(`${value.slice(0, 10)}T00:00:00+05:30`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(date);
}

function timeText(value: string | null) {
  if (!value) return "time to be confirmed";
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = match[2];
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "pm" : "am"}`;
}

async function approvePayload(
  supabase: Supabase,
  weddingId: string,
  campaign: CampaignRow,
) {
  const event = await loadEventContext(supabase, weddingId);
  if (!event) throw new Error("Event not found");
  const functions = await loadFunctions(supabase, weddingId);
  const eventFunction = campaign.wedding_event_id
    ? functions.find((item) => item.id === campaign.wedding_event_id) ?? null
    : null;
  const parsed = parseGuestCampaignDraft({
    campaignId: campaign.id,
    version: campaign.version,
    campaignType: campaign.campaign_type,
    title: campaign.title,
    messageBody: campaign.message_body,
    weddingEventId: campaign.wedding_event_id,
    channel: campaign.channel,
    scheduledFor: campaign.scheduled_for,
    audience: campaign.audience_definition,
  });
  if (!parsed.ok) throw new Error(parsed.error);
  const contacts = await loadContacts(
    supabase,
    weddingId,
    event.client_profile_id,
    parsed.value.channel,
  );
  const selected = selectGuestCampaignRecipients(
    contacts,
    parsed.value.audience,
    parsed.value.channel,
  );
  if (!selected.included.length && !selected.excluded.length) {
    throw new Error("No guests match this campaign audience");
  }
  const contextFor = (contact: GuestCampaignContact) => ({
    guestName: contact.name,
    eventName: event.name,
    functionName: eventFunction?.name ?? "the next event function",
    venue: eventFunction?.venue ?? "the venue shared by the host team",
    date: dateText(eventFunction?.date ?? event.date),
    time: timeText(eventFunction?.start_time ?? null),
  });
  return [
    ...selected.included.map((contact) => ({
      guestId: contact.guestId,
      recipientName: contact.name,
      channel: parsed.value.channel,
      destination: parsed.value.channel === "WHATSAPP" ? contact.phone : contact.email,
      consentSnapshot: contact.consentStatus,
      renderedMessage: renderGuestMessage(parsed.value.messageBody, contextFor(contact)),
      exclusionReason: null,
    })),
    ...selected.excluded.map((contact) => ({
      guestId: contact.guestId,
      recipientName: contact.name,
      channel: parsed.value.channel,
      destination: null,
      consentSnapshot: contact.consentStatus,
      renderedMessage: renderGuestMessage(parsed.value.messageBody, contextFor(contact)),
      exclusionReason: contact.reason,
    })),
  ];
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) return apiError("Invalid event", 400);
  const auth = await authorize(id, "MESSAGE_CLIENT");
  if (auth instanceof NextResponse) return auth;
  const limited = await writeLimit(request, auth.session.userId);
  if (limited) return limited;

  let body: Record<string, unknown> | null;
  try {
    body = actionBody(await request.json());
  } catch {
    body = null;
  }
  if (!body || typeof body.action !== "string") return apiError("Choose a valid campaign action", 400);
  const supabase = createAdminSupabaseClient();

  try {
    if (body.action === "UPDATE_CONSENT") {
      if (
        typeof body.guestId !== "string" || !isUuid(body.guestId) ||
        typeof body.channel !== "string" || !(GUEST_CAMPAIGN_CHANNELS as readonly string[]).includes(body.channel) ||
        typeof body.consentStatus !== "string" || !(GUEST_CONSENT_STATUSES as readonly string[]).includes(body.consentStatus) ||
        (body.source !== undefined && body.source !== null && (typeof body.source !== "string" || body.source.trim().length > 240))
      ) {
        return apiError("Add a valid guest consent update", 400);
      }
      const { error } = await supabase.from("event_guest_contact_preferences").upsert({
        wedding_id: id,
        guest_id: body.guestId,
        channel: body.channel,
        consent_status: body.consentStatus,
        source: typeof body.source === "string" ? body.source.trim() || null : null,
        updated_by: auth.session.userId,
      }, { onConflict: "wedding_id,guest_id,channel" });
      if (error) return conflict(error) ?? (() => { throw error; })();
      return apiSuccess({ updated: true });
    }

    if (
      !["APPROVE", "EXPORT", "MARK_SENT"].includes(body.action) ||
      typeof body.campaignId !== "string" || !isUuid(body.campaignId) ||
      !Number.isInteger(body.version) || Number(body.version) < 1
    ) {
      return apiError("Add a valid campaign transition", 400);
    }
    const { data: campaign, error: campaignError } = await supabase
      .from("event_guest_communication_campaigns")
      .select("*")
      .eq("id", body.campaignId)
      .eq("wedding_id", id)
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) return apiError("Campaign not found", 404);

    const nextStatus: GuestCampaignStatus = body.action === "APPROVE"
      ? "APPROVED"
      : body.action === "EXPORT"
        ? "EXPORTED"
        : "SENT";
    const payload = body.action === "APPROVE"
      ? await approvePayload(supabase, id, campaign)
      : body.action === "MARK_SENT"
        ? body.results
        : null;
    if (body.action === "MARK_SENT") {
      if (!Array.isArray(payload) || payload.length > 2000 || payload.some((item) => {
        const result = actionBody(item);
        return !result || typeof result.guestId !== "string" || !isUuid(result.guestId) ||
          typeof result.status !== "string" || !["SENT", "DELIVERED", "FAILED", "OPTED_OUT"].includes(result.status) ||
          (result.reference !== undefined && result.reference !== null && (typeof result.reference !== "string" || result.reference.length > 240));
      })) {
        return apiError("Add valid delivery results", 400);
      }
    }

    const { error } = await supabase.rpc("transition_guest_communication_campaign", {
      p_wedding_id: id,
      p_campaign_id: body.campaignId,
      p_expected_version: Number(body.version),
      p_next_status: nextStatus,
      p_actor_user_id: auth.session.userId,
      p_payload: payload as Json,
    });
    if (error) return conflict(error) ?? (() => { throw error; })();

    const [updatedResult, recipientsResult] = await Promise.all([
      supabase
        .from("event_guest_communication_campaigns")
        .select("*")
        .eq("id", body.campaignId)
        .eq("wedding_id", id)
        .single(),
      supabase
        .from("event_guest_communication_recipients")
        .select("*")
        .eq("campaign_id", body.campaignId)
        .eq("wedding_id", id)
        .order("recipient_name", { ascending: true }),
    ]);
    if (updatedResult.error) throw updatedResult.error;
    if (recipientsResult.error) throw recipientsResult.error;
    const response: Record<string, unknown> = {
      campaign: campaignJson(updatedResult.data, recipientsResult.data ?? []),
    };
    if (body.action === "EXPORT") {
      response.export = {
        filename: `${updatedResult.data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest-campaign"}.csv`,
        csv: buildCsv(updatedResult.data, recipientsResult.data ?? []),
        delivery: "Human-approved export only; Elysian did not send these messages automatically.",
      };
    }
    await supabase.from("admin_audit_log").insert({
      actor_user_id: auth.session.userId,
      action: `GUEST_CAMPAIGN_${nextStatus}`,
      entity_type: "event_guest_communication_campaign",
      entity_id: body.campaignId,
      summary: updatedResult.data.title,
      meta: { weddingId: id, version: updatedResult.data.version },
    });
    return apiSuccess(response);
  } catch (error) {
    if (error instanceof Error && error.message === "No guests match this campaign audience") {
      return apiError(error.message, 409);
    }
    console.error("PATCH /api/operations/events/[id]/communications:", error);
    return apiError("Campaign action could not be completed", 500);
  }
}
