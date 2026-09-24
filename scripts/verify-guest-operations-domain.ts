import assert from "node:assert/strict";
import { parseGuestOperationsSnapshot } from "../src/lib/guest-operations";

const baseSnapshot = {
  weddingId: "0b3b7a57-f331-4e38-926b-b9c433f43421",
  profile: {
    householdName: "The host family",
    relationshipGroup: "Immediate family",
    invitationStatus: "CONFIRMED",
    vipLevel: "VIP",
    accessibilityNotes: "Wheelchair-accessible vehicle required",
    ownerLabel: "Hospitality lead",
  },
  travelLegs: [
    {
      mode: "FLIGHT",
      provider: "Example Airways",
      referenceLabel: "Booking confirmed",
      origin: "Mumbai",
      destination: "Mangalore",
      departureAt: "2026-02-20T02:30:00.000Z",
      arrivalAt: "2026-02-20T04:15:00.000Z",
      status: "BOOKED",
      pickupRequired: true,
      notes: "Meet at arrivals",
    },
  ],
  stays: [
    {
      hotelName: "Gateway Bekal",
      roomType: "Deluxe",
      roomNumber: "Assigned at check-in",
      checkInDate: "2026-02-20",
      checkOutDate: "2026-02-23",
      status: "ALLOCATED",
      keyStatus: "PENDING",
      luggageStatus: "EXPECTED",
      notes: "Near lift",
    },
  ],
  transfers: [
    {
      travelLegIndex: 0,
      vehicleLabel: "Coach 01",
      routeLabel: "Airport to hotel",
      pickupAt: "2026-02-20T04:45:00.000Z",
      pickupLocation: "Mangalore airport",
      dropLocation: "Gateway Bekal",
      seatLabel: "A1",
      status: "ASSIGNED",
      notes: "Guest assistance requested",
    },
  ],
  hospitalityItems: [
    {
      type: "WELCOME",
      title: "Welcome hamper in room",
      status: "PLANNED",
      ownerLabel: "Hospitality desk",
      dueAt: "2026-02-20T06:00:00.000Z",
      notes: "Confirm dietary preference",
    },
  ],
};

const parsed = parseGuestOperationsSnapshot(baseSnapshot);
assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.equal(parsed.value.travelLegs.length, 1);
  assert.equal(parsed.value.stays[0].checkInDate, "2026-02-20");
  assert.equal(parsed.value.transfers[0].travelLegIndex, 0);
}

const reversedTravel = parseGuestOperationsSnapshot({
  ...baseSnapshot,
  travelLegs: [
    {
      ...baseSnapshot.travelLegs[0],
      departureAt: "2026-02-20T05:30:00.000Z",
      arrivalAt: "2026-02-20T04:15:00.000Z",
    },
  ],
});
assert.deepEqual(reversedTravel, {
  ok: false,
  error: "Travel arrival must be after departure",
});

const reversedStay = parseGuestOperationsSnapshot({
  ...baseSnapshot,
  stays: [
    {
      ...baseSnapshot.stays[0],
      checkInDate: "2026-02-24",
      checkOutDate: "2026-02-23",
    },
  ],
});
assert.deepEqual(reversedStay, {
  ok: false,
  error: "Hotel checkout must be after check-in",
});

const invalidTransferReference = parseGuestOperationsSnapshot({
  ...baseSnapshot,
  transfers: [{ ...baseSnapshot.transfers[0], travelLegIndex: 4 }],
});
assert.deepEqual(invalidTransferReference, {
  ok: false,
  error: "Transfer travel leg does not exist",
});

const oversizedNotes = parseGuestOperationsSnapshot({
  ...baseSnapshot,
  profile: { ...baseSnapshot.profile, accessibilityNotes: "x".repeat(2001) },
});
assert.deepEqual(oversizedNotes, {
  ok: false,
  error: "Accessibility notes are too long",
});

const tooManyLegs = parseGuestOperationsSnapshot({
  ...baseSnapshot,
  travelLegs: Array.from({ length: 17 }, () => baseSnapshot.travelLegs[0]),
});
assert.deepEqual(tooManyLegs, {
  ok: false,
  error: "A guest can have at most 16 travel legs",
});

console.log("Guest operations domain verification passed.");
