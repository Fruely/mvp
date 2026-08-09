import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      let abs = path.join(process.cwd(), specifier.slice(2));
      if (!path.extname(abs)) abs = `${abs}.ts`;
      return nextResolve(pathToFileURL(abs).href, context);
    }
    return nextResolve(specifier, context);
  },
});

import assert from "node:assert/strict";
import test from "node:test";
import { computeDashboardAmounts } from "./dashboardAmounts.ts";
import { partnerAccessMode } from "./access.ts";

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
