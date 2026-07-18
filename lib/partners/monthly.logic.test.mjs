import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregatePeriodReport,
  berlinLocalToUtc,
  getBerlinMonthBoundsUtc,
  isTimestampInRange,
} from "./monthlyBounds.ts";

test("getBerlinMonthBoundsUtc returns exclusive end after start", () => {
  const ref = new Date("2026-07-15T12:00:00.000Z");
  const b = getBerlinMonthBoundsUtc(ref);
  assert.equal(b.year, 2026);
  assert.equal(b.month, 7);
  assert.ok(b.start.getTime() < b.endExclusive.getTime());
  assert.equal(b.startIso.endsWith("Z"), true);
});

test("berlinLocalToUtc July midnight is CEST (UTC+2)", () => {
  const start = berlinLocalToUtc(2026, 7, 1, 0, 0, 0);
  assert.equal(start.toISOString(), "2026-06-30T22:00:00.000Z");
});

test("isTimestampInRange half-open", () => {
  const b = getBerlinMonthBoundsUtc(new Date("2026-07-10T10:00:00.000Z"));
  assert.equal(isTimestampInRange(b.startIso, b.startIso, b.endExclusiveIso), true);
  assert.equal(isTimestampInRange(b.endExclusiveIso, b.startIso, b.endExclusiveIso), false);
});

test("aggregatePeriodReport cents math", () => {
  const r = aggregatePeriodReport({
    clicks: 3,
    registrations: 2,
    commissions: [
      { amount_cents: 2900, status: "approved" },
      { amount_cents: 2900, status: "paid" },
      { amount_cents: 1000, status: "pending" },
      { amount_cents: 500, status: "reversed" },
    ],
  });
  assert.equal(r.approved_first_payments, 2);
  assert.equal(r.gross_commission_cents, 5800);
  assert.equal(r.paid_cents, 2900);
  assert.equal(r.unpaid_approved_cents, 2900);
  assert.equal(r.reversed_cents, 500);
});
