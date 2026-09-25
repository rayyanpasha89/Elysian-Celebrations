import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  parsePartnerTravelDraft,
  partnerTravelNeedsAttention,
  type PartnerTravelDraft,
} from "../src/lib/partner-travel";

const valid: PartnerTravelDraft = {
  partyId: null,
  version: null,
  party: {
    bookingId: randomUUID(),
    vendorProfileId: randomUUID(),
    weddingEventId: randomUUID(),
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
  },
  travelLegs: [{
    id: null,
    mode: "FLIGHT",
    provider: "QA Air",
    referenceLabel: "Eight confirmed seats",
    origin: "Mumbai",
    destination: "Goa",
    departureAt: "2027-02-20T02:30:00.000Z",
    arrivalAt: "2027-02-20T04:00:00.000Z",
    status: "BOOKED",
    pickupRequired: true,
  }],
  stays: [{
    id: null,
    hotelName: "QA Hotel",
    roomType: "Twin",
    roomCount: 4,
    checkInDate: "2027-02-20",
    checkOutDate: "2027-02-22",
    status: "ALLOCATED",
    foodPlan: "Breakfast and dinner",
  }],
  transfers: [{
    id: null,
    travelLegIndex: 0,
    routeLabel: "Airport to hotel",
    pickupAt: "2027-02-20T04:30:00.000Z",
    pickupLocation: "Goa airport",
    dropLocation: "QA Hotel",
    vehicleLabel: "Tempo 01",
    status: "ASSIGNED",
  }],
};

const parsed = parsePartnerTravelDraft(valid);
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.value.party.headCount, 8);
  assert.equal(parsed.value.travelLegs[0].arrivalAt, "2027-02-20T04:00:00.000Z");
  assert.equal(parsed.value.transfers[0].travelLegIndex, 0);
}

const chronology = parsePartnerTravelDraft({
  ...valid,
  travelLegs: [{
    ...valid.travelLegs[0],
    arrivalAt: "2027-02-20T01:30:00.000Z",
  }],
});
assert.equal(chronology.ok, false);

const crossLeg = parsePartnerTravelDraft({
  ...valid,
  transfers: [{ ...valid.transfers[0], travelLegIndex: 4 }],
});
assert.equal(crossLeg.ok, false);

const rawIdentity = parsePartnerTravelDraft({
  ...valid,
  party: { ...valid.party, passportNumber: "DO-NOT-STORE" },
});
assert.equal(rawIdentity.ok, false);
if (!rawIdentity.ok) assert.match(rawIdentity.error, /passport/i);

const rawPnr = parsePartnerTravelDraft({
  ...valid,
  travelLegs: [{ ...valid.travelLegs[0], pnr: "DO-NOT-STORE" }],
});
assert.equal(rawPnr.ok, false);

assert.equal(
  partnerTravelNeedsAttention({
    travelLegs: [
      { ...valid.travelLegs[0], status: "CANCELLED" },
      { ...valid.travelLegs[0], status: "ARRIVED" },
    ],
    stays: [],
    transfers: [{ ...valid.transfers[0], travelLegIndex: 1, status: "ASSIGNED" }],
  }),
  false,
  "cancelled journeys must not reindex active pickup links",
);
assert.equal(
  partnerTravelNeedsAttention({
    travelLegs: [{ ...valid.travelLegs[0], status: "ARRIVED" }],
    stays: [],
    transfers: [{ ...valid.transfers[0], status: "NO_SHOW" }],
  }),
  true,
  "a no-show pickup must keep the party in attention",
);
assert.equal(
  partnerTravelNeedsAttention({
    travelLegs: [{ ...valid.travelLegs[0], status: "ARRIVED" }],
    stays: [],
    transfers: [{ ...valid.transfers[0], status: "CANCELLED" }],
  }),
  true,
  "a cancelled pickup must keep the party in attention",
);

console.log("Partner travel domain verification passed.");
