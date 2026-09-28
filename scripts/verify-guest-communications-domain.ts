import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  canTransitionGuestCampaign,
  parseGuestCampaignDraft,
  renderGuestMessage,
  selectGuestCampaignRecipients,
  type GuestCampaignContact,
  type GuestCampaignDraft,
} from "../src/lib/guest-communications";

const eventId = randomUUID();
const draft: GuestCampaignDraft = {
  campaignId: null,
  version: null,
  campaignType: "FUNCTION_INVITATION",
  title: "Welcome dinner reminder",
  messageBody:
    "Hello {{guest_name}}, {{event_name}} welcomes you to {{function_name}} at {{venue}} on {{date}} at {{time}}.",
  weddingEventId: eventId,
  channel: "WHATSAPP",
  scheduledFor: "2027-02-20T12:30:00.000Z",
  audience: {
    sides: ["BRIDE", "GROOM"],
    rsvpStatuses: ["CONFIRMED"],
    invitationStatuses: ["CONFIRMED"],
    vipLevels: [],
    relationshipGroups: [],
    guestIds: [],
  },
};

const parsed = parseGuestCampaignDraft(draft);
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.value.weddingEventId, eventId);
  assert.deepEqual(parsed.value.audience.sides, ["BRIDE", "GROOM"]);
}

assert.equal(
  parseGuestCampaignDraft({ ...draft, messageBody: "Hello {{unknown_token}}" }).ok,
  false,
  "unknown merge tokens must be rejected before approval",
);
assert.equal(
  parseGuestCampaignDraft({
    ...draft,
    audience: { ...draft.audience, guestIds: [randomUUID(), "another-event"] },
  }).ok,
  false,
  "invalid audience IDs must be rejected",
);

assert.equal(canTransitionGuestCampaign("DRAFT", "APPROVED"), true);
assert.equal(canTransitionGuestCampaign("APPROVED", "EXPORTED"), true);
assert.equal(canTransitionGuestCampaign("EXPORTED", "SENT"), true);
assert.equal(canTransitionGuestCampaign("DRAFT", "EXPORTED"), false);
assert.equal(canTransitionGuestCampaign("APPROVED", "SENT"), false);
assert.equal(canTransitionGuestCampaign("SENT", "DRAFT"), false);

assert.equal(
  renderGuestMessage(draft.messageBody, {
    guestName: "Aarav Shah",
    eventName: "Evara Leadership Summit",
    functionName: "Welcome dinner",
    venue: "Grand Ballroom",
    date: "20 February 2027",
    time: "7:00 pm",
  }),
  "Hello Aarav Shah, Evara Leadership Summit welcomes you to Welcome dinner at Grand Ballroom on 20 February 2027 at 7:00 pm.",
);

const contacts: GuestCampaignContact[] = [
  {
    guestId: randomUUID(),
    name: "Aarav Shah",
    side: "GROOM",
    rsvpStatus: "CONFIRMED",
    invitationStatus: "CONFIRMED",
    vipLevel: "VIP",
    relationshipGroup: "Leadership",
    email: "aarav@example.test",
    phone: "+919876500001",
    consentStatus: "OPTED_IN",
  },
  {
    guestId: randomUUID(),
    name: "Mira Shah",
    side: "BRIDE",
    rsvpStatus: "CONFIRMED",
    invitationStatus: "CONFIRMED",
    vipLevel: "STANDARD",
    relationshipGroup: "Family",
    email: "mira@example.test",
    phone: "+919876500002",
    consentStatus: "OPTED_OUT",
  },
  {
    guestId: randomUUID(),
    name: "No Phone",
    side: "GROOM",
    rsvpStatus: "CONFIRMED",
    invitationStatus: "CONFIRMED",
    vipLevel: "STANDARD",
    relationshipGroup: "Leadership",
    email: "email-only@example.test",
    phone: null,
    consentStatus: "OPTED_IN",
  },
];
const recipients = selectGuestCampaignRecipients(contacts, draft.audience, "WHATSAPP");
assert.equal(recipients.included.length, 1);
assert.equal(recipients.included[0].name, "Aarav Shah");
assert.deepEqual(
  recipients.excluded.map((item) => item.reason).sort(),
  ["MISSING_DESTINATION", "OPTED_OUT"],
);

console.log("Guest communications domain verification passed.");
