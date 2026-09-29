import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveClientMaximumCents,
  partitionEconomicEligibility,
  reconciliationFloorCents,
  shouldKeepBudgetDecline,
  specialistEconomicFloorCents,
  type OtherwiseEligibleCandidate,
} from "./budgetGate.ts";

const MIN_70 = [{ minimumOrderCents: 7000, currency: "EUR" }];

function candidate(id: string, minimumOrderCents: number | null, currency: string | null = "EUR"): OtherwiseEligibleCandidate {
  return { id, services: [{ minimumOrderCents, currency }] };
}

function decide(text: string | null, candidates: OtherwiseEligibleCandidate[], acceptedCents: number | null = null) {
  const clientMaxCents = effectiveClientMaximumCents({ clientBudgetText: text, acceptedCents });
  const partition = partitionEconomicEligibility({ clientMaxCents, candidates });
  return {
    clientMaxCents,
    partition,
    floor: reconciliationFloorCents(partition, clientMaxCents),
  };
}

test("exact €50 against a €70 minimum is blocked and the floor is €70", () => {
  const result = decide("50 €", [candidate("s", 7000)]);
  assert.equal(result.clientMaxCents, 5000);
  assert.deepEqual(result.partition.economicallyEligibleIds, []);
  assert.equal(result.partition.budgetBlocked[0]?.floorCents, 7000);
  assert.equal(result.floor, 7000);
});

test("up to €50 against €70 is blocked", () => {
  const result = decide("до 50 €", [candidate("s", 7000)]);
  assert.equal(result.floor, 7000);
});

test("€70 against €70 matches and does not ask for reconciliation", () => {
  const result = decide("70 €", [candidate("s", 7000)]);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
  assert.equal(result.floor, null);
});

test("€100 against €70 matches", () => {
  const result = decide("100 €", [candidate("s", 7000)]);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
  assert.equal(result.floor, null);
});

test("a missing budget does not reject", () => {
  const result = decide(null, [candidate("s", 7000)]);
  assert.equal(result.clientMaxCents, null);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
  assert.equal(result.floor, null);
});

test("from €50 has no maximum and does not reject", () => {
  const result = decide("от 50 €", [candidate("s", 7000)]);
  assert.equal(result.clientMaxCents, null);
  assert.equal(result.floor, null);
});

test("range €50–€80 against €70 matches", () => {
  const result = decide("50-80 €", [candidate("s", 7000)]);
  assert.equal(result.clientMaxCents, 8000);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
});

test("non-EUR and ambiguous text do not reject", () => {
  assert.equal(decide("50 USD", [candidate("s", 7000)]).floor, null);
  assert.equal(decide("about fifty", [candidate("s", 7000)]).floor, null);
  assert.deepEqual(decide("50 USD", [candidate("s", 7000)]).partition.economicallyEligibleIds, ["s"]);
});

test("a null specialist minimum does not reject", () => {
  const result = decide("50 €", [candidate("s", null)]);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
  assert.equal(result.floor, null);
});

test("a service minimum of 0 stays eligible for a non-negative maximum", () => {
  const result = decide("50 €", [candidate("s", 0)]);
  assert.equal(specialistEconomicFloorCents(MIN_70), 7000);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
  assert.equal(result.floor, null);
});

test("blocked supply at €70, €90 and €120 reconciles at €70", () => {
  const result = decide("50 €", [
    candidate("a", 9000),
    candidate("b", 7000),
    candidate("c", 12000),
  ]);
  assert.deepEqual(result.partition.economicallyEligibleIds, []);
  assert.equal(result.floor, 7000);
});

test("one €40 specialist matches a €50 maximum and suppresses reconciliation", () => {
  const result = decide("50 €", [candidate("cheap", 4000), candidate("dear", 7000)]);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["cheap"]);
  assert.deepEqual(result.partition.budgetBlocked.map((row) => row.id), ["dear"]);
  assert.equal(result.floor, null);
});

test("no service row means the minimum is unknown", () => {
  const partition = partitionEconomicEligibility({
    clientMaxCents: 5000,
    candidates: [{ id: "primary-only", services: [] }],
  });
  assert.deepEqual(partition.economicallyEligibleIds, ["primary-only"]);
  assert.equal(reconciliationFloorCents(partition, 5000), null);
});

test("a decline is kept only for the same unresolved floor", () => {
  assert.equal(shouldKeepBudgetDecline({
    existingRequiredCents: 7000,
    existingDeclinedAt: "2026-09-30T00:00:00.000Z",
    nextFloorCents: 7000,
  }), true);
  assert.equal(shouldKeepBudgetDecline({
    existingRequiredCents: 7000,
    existingDeclinedAt: "2026-09-30T00:00:00.000Z",
    nextFloorCents: 9000,
  }), false);
});

test("an accepted ceiling supersedes the original text", () => {
  const result = decide("50 €", [candidate("s", 7000)], 7000);
  assert.equal(result.clientMaxCents, 7000);
  assert.deepEqual(result.partition.economicallyEligibleIds, ["s"]);
});
