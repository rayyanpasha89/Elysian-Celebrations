import { isUuid } from "@/lib/id-utils";

export const GUEST_CAMPAIGN_TYPES = [
  "RSVP",
  "ARRIVAL",
  "ROOM_KEYS",
  "FUNCTION_INVITATION",
  "BREAKFAST",
  "DEPARTURE",
  "EMERGENCY",
  "THANK_YOU",
] as const;
export const GUEST_CAMPAIGN_CHANNELS = ["WHATSAPP", "EMAIL"] as const;
export const GUEST_CAMPAIGN_STATUSES = ["DRAFT", "APPROVED", "EXPORTED", "SENT"] as const;
export const GUEST_CONSENT_STATUSES = ["UNKNOWN", "OPTED_IN", "OPTED_OUT"] as const;
export const GUEST_DELIVERY_STATUSES = [
  "READY",
  "EXCLUDED",
  "EXPORTED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "OPTED_OUT",
] as const;

export type GuestCampaignType = (typeof GUEST_CAMPAIGN_TYPES)[number];
export type GuestCampaignChannel = (typeof GUEST_CAMPAIGN_CHANNELS)[number];
export type GuestCampaignStatus = (typeof GUEST_CAMPAIGN_STATUSES)[number];
export type GuestConsentStatus = (typeof GUEST_CONSENT_STATUSES)[number];
export type GuestDeliveryStatus = (typeof GUEST_DELIVERY_STATUSES)[number];

export type GuestCampaignAudience = {
  sides: string[];
  rsvpStatuses: string[];
  invitationStatuses: string[];
  vipLevels: string[];
  relationshipGroups: string[];
  guestIds: string[];
};

export type GuestCampaignDraft = {
  campaignId: string | null;
  version: number | null;
  campaignType: GuestCampaignType;
  title: string;
  messageBody: string;
  weddingEventId: string | null;
  channel: GuestCampaignChannel;
  scheduledFor: string | null;
  audience: GuestCampaignAudience;
};

export type GuestCampaignContact = {
  guestId: string;
  name: string;
  side: string;
  rsvpStatus: string;
  invitationStatus: string;
  vipLevel: string;
  relationshipGroup: string | null;
  email: string | null;
  phone: string | null;
  consentStatus: GuestConsentStatus;
};

export type GuestMessageContext = {
  guestName: string;
  eventName: string;
  functionName: string;
  venue: string;
  date: string;
  time: string;
};

type ParseResult =
  | { ok: true; value: GuestCampaignDraft }
  | { ok: false; error: string };

const SIDES = ["BRIDE", "GROOM", "COUPLE", "MUTUAL"] as const;
const RSVP_STATUSES = ["PENDING", "CONFIRMED", "DECLINED", "MAYBE"] as const;
const INVITATION_STATUSES = ["NOT_INVITED", "INVITED", "CONFIRMED", "DECLINED", "WAITLIST"] as const;
const VIP_LEVELS = ["STANDARD", "VIP", "VVIP"] as const;
const TEMPLATE_TOKENS = [
  "guest_name",
  "event_name",
  "function_name",
  "venue",
  "date",
  "time",
] as const;

export const GUEST_CAMPAIGN_TEMPLATES: Record<
  GuestCampaignType,
  { title: string; message: string; description: string }
> = {
  RSVP: {
    title: "RSVP follow-up",
    description: "Confirm attendance without losing the personal tone.",
    message: "Hello {{guest_name}}, may we confirm your attendance for {{event_name}}? Please reply to the host team with any dietary or accessibility needs.",
  },
  ARRIVAL: {
    title: "Arrival welcome",
    description: "Share the arrival desk and first point of contact.",
    message: "Welcome, {{guest_name}}. The {{event_name}} hospitality team is ready to receive you. Please proceed to the arrival desk for assistance.",
  },
  ROOM_KEYS: {
    title: "Room key update",
    description: "Guide checked-in guests to the key desk.",
    message: "Hello {{guest_name}}, your room-key update for {{event_name}} is ready with the hospitality desk. Please carry a safe personal identification method requested by the hotel.",
  },
  FUNCTION_INVITATION: {
    title: "Function invitation",
    description: "Send one function's time and venue clearly.",
    message: "Hello {{guest_name}}, {{function_name}} begins at {{time}} on {{date}} at {{venue}}. We look forward to welcoming you.",
  },
  BREAKFAST: {
    title: "Breakfast note",
    description: "Share the next morning's breakfast plan.",
    message: "Good morning, {{guest_name}}. Breakfast for {{event_name}} is arranged at {{venue}} from {{time}} on {{date}}.",
  },
  DEPARTURE: {
    title: "Departure coordination",
    description: "Confirm checkout and transfer readiness.",
    message: "Hello {{guest_name}}, the {{event_name}} departure desk is coordinating today's transfers. Please confirm your luggage and pickup details with the hospitality team.",
  },
  EMERGENCY: {
    title: "Urgent guest update",
    description: "Use only for approved time-sensitive operational updates.",
    message: "Important update for {{guest_name}} regarding {{event_name}}: please follow the latest direction from the Elysian hospitality team.",
  },
  THANK_YOU: {
    title: "Thank-you note",
    description: "Close the event with a warm host message.",
    message: "Thank you, {{guest_name}}, for being part of {{event_name}}. Your presence made the celebration meaningful.",
  },
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max: number, required = false) {
  if (value === null || value === undefined) return required ? null : "";
  if (typeof value !== "string") return null;
  const result = value.trim();
  if ((required && !result) || result.length > max) return null;
  return result;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T) {
  return typeof value === "string" && values.includes(value) ? (value as T[number]) : null;
}

function enumArray(value: unknown, values: readonly string[], max = 16) {
  if (!Array.isArray(value) || value.length > max) return null;
  const result = [...new Set(value)];
  return result.every((item) => typeof item === "string" && values.includes(item))
    ? (result as string[])
    : null;
}

function stringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const result = [...new Set(value.map((item) => text(item, maxLength, true)))];
  return result.every((item): item is string => item !== null) ? result : null;
}

function optionalUuid(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && isUuid(value) ? value : undefined;
}

function optionalInstant(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function hasOnlySupportedTokens(message: string) {
  const matches = message.matchAll(/{{\s*([a-z_]+)\s*}}/gi);
  return [...matches].every((match) =>
    (TEMPLATE_TOKENS as readonly string[]).includes(match[1].toLowerCase()),
  );
}

export function parseGuestCampaignDraft(value: unknown): ParseResult {
  const root = record(value);
  const audience = record(root?.audience);
  if (!root || !audience) return { ok: false, error: "Add valid campaign details" };

  const campaignId = optionalUuid(root.campaignId);
  const weddingEventId = optionalUuid(root.weddingEventId);
  const version = root.version === null || root.version === undefined
    ? null
    : Number.isInteger(root.version) && Number(root.version) > 0
      ? Number(root.version)
      : undefined;
  const campaignType = enumValue(root.campaignType, GUEST_CAMPAIGN_TYPES);
  const channel = enumValue(root.channel, GUEST_CAMPAIGN_CHANNELS);
  const title = text(root.title, 180, true);
  const messageBody = text(root.messageBody, 2000, true);
  const scheduledFor = optionalInstant(root.scheduledFor);
  const sides = enumArray(audience.sides, SIDES);
  const rsvpStatuses = enumArray(audience.rsvpStatuses, RSVP_STATUSES);
  const invitationStatuses = enumArray(audience.invitationStatuses, INVITATION_STATUSES);
  const vipLevels = enumArray(audience.vipLevels, VIP_LEVELS);
  const relationshipGroups = stringArray(audience.relationshipGroups, 30, 180);
  const guestIds = stringArray(audience.guestIds, 500, 40);

  if (
    campaignId === undefined || weddingEventId === undefined || version === undefined ||
    !campaignType || !channel || !title || !messageBody || scheduledFor === undefined ||
    !sides || !rsvpStatuses || !invitationStatuses || !vipLevels ||
    !relationshipGroups || !guestIds || !guestIds.every(isUuid)
  ) {
    return { ok: false, error: "Campaign fields are invalid or exceed their limits" };
  }
  if (!hasOnlySupportedTokens(messageBody)) {
    return { ok: false, error: "Message contains an unsupported merge token" };
  }
  if (campaignId === null && version !== null) {
    return { ok: false, error: "A new campaign cannot have a saved version" };
  }
  if (campaignId !== null && version === null) {
    return { ok: false, error: "Reload this campaign before saving changes" };
  }

  return {
    ok: true,
    value: {
      campaignId,
      version,
      campaignType,
      title,
      messageBody,
      weddingEventId,
      channel,
      scheduledFor,
      audience: {
        sides,
        rsvpStatuses,
        invitationStatuses,
        vipLevels,
        relationshipGroups,
        guestIds,
      },
    },
  };
}

export function canTransitionGuestCampaign(
  current: GuestCampaignStatus,
  next: GuestCampaignStatus,
) {
  return (
    (current === "DRAFT" && next === "APPROVED") ||
    (current === "APPROVED" && next === "EXPORTED") ||
    (current === "EXPORTED" && next === "SENT")
  );
}

export function renderGuestMessage(template: string, context: GuestMessageContext) {
  const values: Record<(typeof TEMPLATE_TOKENS)[number], string> = {
    guest_name: context.guestName,
    event_name: context.eventName,
    function_name: context.functionName,
    venue: context.venue,
    date: context.date,
    time: context.time,
  };
  return template.replace(/{{\s*([a-z_]+)\s*}}/gi, (token, key: string) => {
    const normalized = key.toLowerCase() as keyof typeof values;
    return values[normalized] ?? token;
  });
}

function matchesAudience(contact: GuestCampaignContact, audience: GuestCampaignAudience) {
  return (
    (!audience.guestIds.length || audience.guestIds.includes(contact.guestId)) &&
    (!audience.sides.length || audience.sides.includes(contact.side)) &&
    (!audience.rsvpStatuses.length || audience.rsvpStatuses.includes(contact.rsvpStatus)) &&
    (!audience.invitationStatuses.length || audience.invitationStatuses.includes(contact.invitationStatus)) &&
    (!audience.vipLevels.length || audience.vipLevels.includes(contact.vipLevel)) &&
    (!audience.relationshipGroups.length ||
      (contact.relationshipGroup !== null && audience.relationshipGroups.includes(contact.relationshipGroup)))
  );
}

export function selectGuestCampaignRecipients(
  contacts: GuestCampaignContact[],
  audience: GuestCampaignAudience,
  channel: GuestCampaignChannel,
) {
  const included: GuestCampaignContact[] = [];
  const excluded: Array<GuestCampaignContact & { reason: "OPTED_OUT" | "MISSING_DESTINATION" }> = [];
  for (const contact of contacts) {
    if (!matchesAudience(contact, audience)) continue;
    if (contact.consentStatus === "OPTED_OUT") {
      excluded.push({ ...contact, reason: "OPTED_OUT" });
      continue;
    }
    const destination = channel === "WHATSAPP" ? contact.phone : contact.email;
    if (!destination?.trim()) {
      excluded.push({ ...contact, reason: "MISSING_DESTINATION" });
      continue;
    }
    included.push(contact);
  }
  return { included, excluded };
}
