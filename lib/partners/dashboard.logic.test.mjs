import { registerPartnerTestHooks } from "./partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import test from "node:test";
import { partnerAccessMode } from "./access.ts";

const { computeDashboardAmounts } = await import("./dashboardAmounts.ts");

test("computeDashboardAmounts splits pending/approved/paid/credited", () => {
  const totals = computeDashboardAmounts([
    { amount_cents: 1000, status: "pending" },
    { amount_cents: 2900, status: "approved", credited_cents: 900, paid_out_cents: 0 },
    { amount_cents: 2900, status: "paid" },
    { amount_cents: 500, status: "reversed" },
  ]);
  assert.equal(totals.pending_cents, 1000);
  assert.equal(totals.approved_unpaid_cents, 2000);
  assert.equal(totals.credited_cents, 900);
  assert.equal(totals.paid_cents, 2900);
  assert.equal(totals.total_earned_cents, 5800);
  assert.equal(totals.available_for_payout_cents, 2000);
});

test("computeDashboardAmounts excludes payout-reserved approved rows", () => {
  const totals = computeDashboardAmounts([
    {
      amount_cents: 1500,
      status: "approved",
      credited_cents: 0,
      paid_out_cents: 0,
      payout_id: "reserved-id",
    },
  ]);
  assert.equal(totals.approved_unpaid_cents, 0);
});

test("partnerAccessMode modes", () => {
  assert.equal(partnerAccessMode("active"), "full");
  assert.equal(partnerAccessMode("paused"), "read_only");
  assert.equal(partnerAccessMode("disabled"), "history_only");
  assert.equal(partnerAccessMode("pending"), "denied");
  assert.equal(partnerAccessMode("rejected"), "denied");
});
