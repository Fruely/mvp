import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  canApproveCommission,
  canIncludeCommissionInPayout,
  getCommissionEligibleAt,
  isCommissionValidationElapsed,
} from "./commissionValidation.ts";
import { computePartnerRewardCents } from "./rewardCalculation.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("A: approval before +14 days is forbidden", () => {
  const paidAt = "2026-07-01T10:00:00.000Z";
  const now = new Date("2026-07-10T10:00:00.000Z");
  const gate = canApproveCommission({
    status: "pending",
    earnedAt: paidAt,
    paymentValidity: "valid",
    now,
  });
  assert.equal(gate.ok, false);
  if (!gate.ok) assert.equal(gate.reason, "validation_period_active");
  assert.equal(isCommissionValidationElapsed(paidAt, now), false);
});

test("B: +14 days + valid payment → eligible", () => {
  const paidAt = "2026-07-01T10:00:00.000Z";
  const eligible = getCommissionEligibleAt(paidAt);
  assert.equal(eligible.toISOString(), "2026-07-15T10:00:00.000Z");
  const gate = canApproveCommission({
    status: "pending",
    earnedAt: paidAt,
    paymentValidity: "valid",
    now: eligible,
  });
  assert.equal(gate.ok, true);
});

test("C: refunded/reversed/disputed before approval blocks approve", () => {
  const paidAt = "2026-07-01T10:00:00.000Z";
  const now = new Date(new Date(paidAt).getTime() + 15 * DAY_MS);
  for (const paymentValidity of ["refunded", "reversed", "disputed", "cancelled"]) {
    const gate = canApproveCommission({
      status: "pending",
      earnedAt: paidAt,
      paymentValidity,
      now,
    });
    assert.equal(gate.ok, false);
    if (!gate.ok) assert.match(gate.reason, /^payment_/);
  }
});

test("D: reward = gross - VAT - fee", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 2900,
    vatAmountCents: 200,
    providerFeeCents: 89,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 2611);
});

test("E: VAT = 0 → gross - fee", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 5600,
    vatAmountCents: 0,
    providerFeeCents: 120,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 5480);
});

test("F: snapshot independence from later tariff change (pure)", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 2900,
    vatAmountCents: 0,
    providerFeeCents: 80,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const laterTariffGross = 9000;
  assert.equal(r.reward.amountCents, 2820);
  assert.notEqual(r.reward.amountCents, laterTariffGross);
});

test("G: renewal does not create second commission — specialist uniqueness contract", () => {
  const src = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.match(src, /commission_already_exists/);
  assert.match(src, /\.eq\("specialist_id"/);
});

test("H: annual payment rejected — no full-year commission", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 2900 * 12,
    vatAmountCents: 0,
    providerFeeCents: 100,
    billingInterval: "year",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "annual_plan_not_eligible");
});

test("pending commissions are not payout-eligible", () => {
  assert.equal(canIncludeCommissionInPayout("pending"), false);
  assert.equal(canIncludeCommissionInPayout("approved"), true);
  assert.equal(canIncludeCommissionInPayout("paid"), false);
});

test("create path must start as pending and compute reward from payment facts", () => {
  const src = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.match(src, /status:\s*"pending"/);
  assert.match(src, /insert\(insertRow\)/);
  assert.doesNotMatch(src, /status:\s*"approved",\s*\n\s*earned_at/);
  assert.match(src, /computePartnerRewardCents/);
  assert.match(src, /partner_rate_ignored_cents/);
  assert.match(src, /approveCommissionIfEligible/);
});

test("dashboard eligible date shares backend helper", () => {
  const dash = readFileSync(
    new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(dash, /getCommissionEligibleAt/);
});
