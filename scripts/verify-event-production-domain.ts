import assert from "node:assert/strict";

import {
  parseProductionRecordInput,
  productionTypeMeta,
} from "../src/lib/event-production";

const valid = parseProductionRecordInput({
  recordType: "LICENSE",
  title: "  Music permissions  ",
  description: "Rights society permissions",
  status: "OPEN",
  visibility: "OPERATIONS",
  amount: "125000",
  currency: "inr",
  payload: {
    authority: "Rights society",
    checklist: ["Application", "Receipt"],
  },
});

assert.equal(valid.ok, true);
if (valid.ok) {
  assert.equal(valid.value.title, "Music permissions");
  assert.equal(valid.value.amount, 125000);
  assert.equal(valid.value.currency, "INR");
  assert.deepEqual(valid.value.payload, {
    authority: "Rights society",
    checklist: ["Application", "Receipt"],
  });
}

assert.deepEqual(parseProductionRecordInput({ recordType: "INVALID" }), {
  ok: false,
  error: "Choose a valid production record type",
});
assert.deepEqual(
  parseProductionRecordInput({
    recordType: "DOCUMENT",
    title: "Private ID",
    amount: -1,
  }),
  { ok: false, error: "Amount must be a whole non-negative value" }
);
assert.deepEqual(
  parseProductionRecordInput({
    recordType: "DOCUMENT",
    title: "Circular data",
    payload: [],
  }),
  { ok: false, error: "Production details must be an object" }
);
assert.equal(productionTypeMeta("GUEST_COMMUNICATION").group, "communications");
assert.equal(productionTypeMeta("LICENSE").group, "compliance");

console.log("Event production domain verification passed.");
