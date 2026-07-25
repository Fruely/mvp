import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  availableCommissionCents,
  computeAvailableBalance,
  planSubscriptionCreditApplication,
} from "./creditMath.ts";
import { computeDashboardAmounts } from "./dashboardAmounts.ts";

test("credit 25.80 against 29.00 subscription → remaining due 3.20, no cash left", () => {
  const plan = planSubscriptionCreditApplication(2580, 2900);
  assert.equal(plan.creditCents, 2580);
  assert.equal(plan.remainingDueCents, 320);
  assert.equal(plan.remainingAvailableCents, 0);
});

test("credit 60 against 29 subscription → 29 consumed, 31 remains", () => {
  const plan = planSubscriptionCreditApplication(6000, 2900);
  assert.equal(plan.creditCents, 2900);
  assert.equal(plan.remainingDueCents, 0);
  assert.equal(plan.remainingAvailableCents, 3100);
});

test("availableCommissionCents excludes credited and paid_out", () => {
  assert.equal(
    availableCommissionCents({
      amount_cents: 6000,
      credited_cents: 2900,
      paid_out_cents: 0,
      status: "approved",
    }),
    3100
  );
  assert.equal(
    availableCommissionCents({
      amount_cents: 2580,
      credited_cents: 2580,
      paid_out_cents: 0,
      status: "approved",
    }),
    0
  );
});

test("dashboard amounts expose credited and available after partial credit", () => {
  const totals = computeDashboardAmounts([
    {
      amount_cents: 6000,
      status: "approved",
      credited_cents: 2900,
      paid_out_cents: 0,
    },
  ]);
  assert.equal(totals.credited_cents, 2900);
  assert.equal(totals.available_for_payout_cents, 3100);
  assert.equal(totals.approved_unpaid_cents, 3100);
});

test("computeAvailableBalance aggregates FIFO-ready totals", () => {
  const bal = computeAvailableBalance([
    { amount_cents: 2580, status: "approved", credited_cents: 0, paid_out_cents: 0 },
    { amount_cents: 1000, status: "pending", credited_cents: 0, paid_out_cents: 0 },
  ]);
  assert.equal(bal.available_cents, 2580);
});

test("credit apply API is independent of PARTNER_PAYOUTS_ENABLED", () => {
  const src = readFileSync(
    new URL("../../app/api/partner/credits/apply/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /applyPartnerSubscriptionCredit/);
  assert.doesNotMatch(src, /partnerPayoutsEnabled/);
});

test("phase4 migration defines credited/paid_out ledger constraints", () => {
  const sql = readFileSync(
    new URL(
      "../../supabase/manual_migrations/2026-07-25_partner_program_phase4_credit_ledger.sql",
      import.meta.url
    ),
    "utf8"
  );
  assert.match(sql, /credited_cents/);
  assert.match(sql, /paid_out_cents/);
  assert.match(sql, /partner_credit_applications/);
  assert.match(sql, /credited_cents \+ paid_out_cents <= amount_cents/);
});
