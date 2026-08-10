import assert from "node:assert/strict";
import {
  evaluateEventReadiness,
  eventReadinessPercent,
  type EventReadinessRow,
} from "../src/lib/event-readiness";

const emptyLogistics = {
  guest_arrival_time: null,
  vendor_load_in_time: null,
  family_call_time: null,
  transport_notes: null,
  rooming_notes: null,
  weather_plan: null,
  ceremony_notes: null,
};

function completeEvent(
  overrides: Partial<EventReadinessRow> = {}
): EventReadinessRow {
  return {
    id: "event-1",
    wedding_day_id: "day-1",
    name: "Evening reception",
    event_type: "Reception",
    date: "2026-12-10",
    start_time: "18:00",
    end_time: "23:00",
    venue: "Grand ballroom",
    guest_count: 240,
    estimated_budget: 2_500_000,
    sort_order: 0,
    requirements: [
      {
        category: "decor",
        vendor_profile_id: "vendor-1",
        vendor_service_id: "service-1",
      },
    ],
    menus: [],
    logistics: null,
    tasks: [{ id: "task-1" }],
    bookings: [],
    ...overrides,
  };
}

function gapKeys(event: EventReadinessRow) {
  return evaluateEventReadiness(event).gaps.map((gap) => gap.key);
}

const noLogisticsRequirement = completeEvent();
assert.equal(eventReadinessPercent(noLogisticsRequirement), 100);
assert.deepEqual(gapKeys(noLogisticsRequirement), []);

const logisticsWithoutRow = completeEvent({
  requirements: [
    {
      category: "logistics",
      vendor_profile_id: "vendor-1",
      vendor_service_id: "service-1",
    },
  ],
  logistics: null,
});
assert.equal(eventReadinessPercent(logisticsWithoutRow), 90);
assert.deepEqual(gapKeys(logisticsWithoutRow), ["logistics"]);

const logisticsWithEmptyRow = completeEvent({
  requirements: logisticsWithoutRow.requirements,
  logistics: emptyLogistics,
});
assert.equal(eventReadinessPercent(logisticsWithEmptyRow), 90);
assert.deepEqual(gapKeys(logisticsWithEmptyRow), ["logistics"]);

const logisticsWithEmptyRelationArray = completeEvent({
  requirements: logisticsWithoutRow.requirements,
  logistics: [emptyLogistics],
});
assert.equal(eventReadinessPercent(logisticsWithEmptyRelationArray), 90);
assert.deepEqual(gapKeys(logisticsWithEmptyRelationArray), ["logistics"]);

const logisticsWithDetail = completeEvent({
  requirements: logisticsWithoutRow.requirements,
  logistics: {
    ...emptyLogistics,
    transport_notes: "Guest coaches leave at 17:15.",
  },
});
assert.equal(eventReadinessPercent(logisticsWithDetail), 100);
assert.deepEqual(gapKeys(logisticsWithDetail), []);

const foodWithoutMenu = completeEvent({
  requirements: [
    {
      category: "food",
      vendor_profile_id: "vendor-1",
      vendor_service_id: "service-1",
    },
  ],
});
assert.equal(eventReadinessPercent(foodWithoutMenu), 90);
assert.deepEqual(gapKeys(foodWithoutMenu), ["food"]);

const foodWithMenu = completeEvent({
  requirements: foodWithoutMenu.requirements,
  menus: [{ id: "menu-1" }],
});
assert.equal(eventReadinessPercent(foodWithMenu), 100);

const cancelledBookingOnly = completeEvent({
  estimated_budget: null,
  requirements: [
    {
      category: "decor",
      vendor_profile_id: null,
      vendor_service_id: null,
    },
  ],
  bookings: [
    {
      status: "CANCELLED",
      total_amount: 500_000,
      service: { base_price: 500_000 },
    },
  ],
});
assert.deepEqual(gapKeys(cancelledBookingOnly), ["vendors", "pricing"]);

console.log("Event readiness contract: 8 focused cases passed.");
