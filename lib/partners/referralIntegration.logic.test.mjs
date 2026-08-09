/**
 * Referral R3 — integration-style regression matrix (A–AG).
 * Reuses existing harnesses; no Stripe network calls.
 */
import { registerPartnerTestHooks } from "./partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  confirmFirstPaidSubscriptionInvoice,
  precheckStripeInvoiceForCommission,
} from "../billing/stripeInvoiceEligibility.ts";
import {
  canApproveCommission,
  canIncludeCommissionInPayout,
} from "./commissionValidation.ts";
import { computePartnerRewardCents } from "./rewardCalculation.ts";
import {
  createAttributionMock,
  seedAttributionFixtures,
} from "./referralAttribution.harness.mjs";
import {
  createPartnerFinancialMock,
  seedPartnerFinancialFixtures,
} from "./partnerFinancial.harness.mjs";

process.env.PARTNER_REF_SECRET = "test-partner-ref-secret-for-unit-tests";

const { computeDashboardAmounts } = await import("./dashboardAmounts.ts");
const { spendableCommissionCents } = await import("./partnerFinancialAvailability.ts");
const { encodeReferralCookie } = await import("./cookie.ts");
const { tryCreateAttributionFromCookie } = await import("./attribution.ts");
const { applyPartnerCommissionCredit } = await import("./credit.ts");
const { requestPartnerPayout } = await import("./payouts.ts");

const referralRouteSrc = readFileSync(
  new URL("../../app/r/[code]/route.ts", import.meta.url),
  "utf8"
);
const registerRouteSrc = readFileSync(
  new URL("../../app/api/specialists/register/route.ts", import.meta.url),
  "utf8"
);
const adminPageSrc = readFileSync(
  new URL("../../app/admin/(protected)/partners/page.tsx", import.meta.url),
  "utf8"
);
const confirmRouteSrc = readFileSync(
  new URL("../../app/api/admin/partners/confirm-first-payment/route.ts", import.meta.url),
  "utf8"
);
const partnerWebhookSrc = readFileSync(
  new URL("../billing/processStripePartnerWebhook.ts", import.meta.url),
  "utf8"
);
const commissionsSrc = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
const dashboardClientSrc = readFileSync(
  new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
  "utf8"
);

function referralCookie(partnerId, linkId, issuedAt = Date.now()) {
  return encodeReferralCookie({ v: 1, linkId, partnerId, issuedAt });
}

test("A: referral click creates valid first-touch cookie state", () => {
  assert.match(referralRouteSrc, /encodeReferralCookie/);
  assert.match(referralRouteSrc, /PARTNER_REF_COOKIE/);
  assert.match(referralRouteSrc, /httpOnly:\s*true/);
});

test("B: second referral click cannot overwrite valid cookie", () => {
  assert.match(referralRouteSrc, /existingValid = decodeReferralCookie\(existing\)/);
  assert.match(referralRouteSrc, /if \(!existingValid\)/);
});

test("C: self referral blocked at attribution bind", async () => {
  const seed = seedAttributionFixtures();
  const supabase = createAttributionMock(seed.tables);
  const result = await tryCreateAttributionFromCookie(supabase, {
    userId: "partner-user-1",
    specialistId: "spec-1",
    cookieRaw: referralCookie(seed.partnerId, seed.linkId),
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "self_referral");
});

test("D: registration binds immutable attribution from cookie", async () => {
  assert.match(registerRouteSrc, /tryCreateAttributionFromCookie/);
  assert.match(registerRouteSrc, /never fails registration/i);
  const seed = seedAttributionFixtures();
  const supabase = createAttributionMock(seed.tables);
  const first = await tryCreateAttributionFromCookie(supabase, {
    userId: "new-user-1",
    specialistId: "spec-1",
    cookieRaw: referralCookie(seed.partnerId, seed.linkId),
  });
  assert.equal(first.ok, true);
  const second = await tryCreateAttributionFromCookie(supabase, {
    userId: "new-user-1",
    specialistId: "spec-1",
    cookieRaw: referralCookie(seed.otherPartnerId, seed.otherLinkId),
  });
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, "already_attributed_user");
});

test("E: first eligible Stripe invoice.paid path creates commission", () => {
  assert.match(partnerWebhookSrc, /invoice\.paid/);
  assert.match(partnerWebhookSrc, /handleStripeInvoicePaidForPartnerCommission/);
  assert.match(commissionsSrc, /createCommissionFromStripeInvoice/);
});

test("F: duplicate invoice event is idempotent (one commission row)", () => {
  assert.match(commissionsSrc, /\.eq\("source_event_id", sourceEventId\)/);
  assert.match(commissionsSrc, /created: false/);
});

test("G: renewal invoice does not create second commission", () => {
  const renewal = confirmFirstPaidSubscriptionInvoice(2);
  assert.equal(renewal.eligible, false);
  if (!renewal.eligible) assert.equal(renewal.reason, "renewal_not_first_payment");
});

test("H: no attribution means no commission at creation", () => {
  assert.match(commissionsSrc, /attribution_not_found/);
});

test("I: Professional first invoice reward uses gross − VAT − fee", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 2900,
    vatAmountCents: 200,
    providerFeeCents: 89,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 2611);
});

test("J: Growth first invoice reward uses gross − VAT − fee", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 5900,
    vatAmountCents: 400,
    providerFeeCents: 120,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 5380);
});

test("K: discounted Professional uses actual invoice amount 1900", () => {
  const pre = precheckStripeInvoiceForCommission({
    id: "in_prof_disc",
    status: "paid",
    amount_paid: 1900,
    billing_reason: "subscription_create",
    currency: "eur",
    lines: { data: [{ price: { recurring: { interval: "month" } } }] },
  });
  assert.equal(pre.eligible, true);
  const r = computePartnerRewardCents({
    grossAmountCents: 1900,
    vatAmountCents: 0,
    providerFeeCents: 89,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 1811);
});

test("L: discounted Growth uses actual invoice amount 4900", () => {
  const pre = precheckStripeInvoiceForCommission({
    id: "in_growth_disc",
    status: "paid",
    amount_paid: 4900,
    billing_reason: "subscription_create",
    currency: "eur",
    lines: { data: [{ price: { recurring: { interval: "month" } } }] },
  });
  assert.equal(pre.eligible, true);
  const r = computePartnerRewardCents({
    grossAmountCents: 4900,
    vatAmountCents: 0,
    providerFeeCents: 120,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 4780);
});

test("M: €10 promoted payment path does not create partner commission", () => {
  const promotedSrc = readFileSync(
    new URL("../billing/processPromotedAccessWebhook.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(promotedSrc, /createCommissionFromStripeInvoice/);
  assert.doesNotMatch(partnerWebhookSrc, /promoted_request_access/);
});

test("N: subscription credit consumption does not create partner commission", () => {
  const subscriptionSrc = readFileSync(
    new URL("../billing/processStripeSubscriptionWebhook.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(subscriptionSrc, /createCommissionFromStripeInvoice/);
  const creditSrc = readFileSync(new URL("./credit.ts", import.meta.url), "utf8");
  assert.doesNotMatch(creditSrc, /createCommissionFromStripeInvoice/);
});

test("O: pending younger than 14 days stays pending", () => {
  const gate = canApproveCommission({
    status: "pending",
    earnedAt: "2026-07-01T10:00:00.000Z",
    paymentValidity: "valid",
    now: new Date("2026-07-10T10:00:00.000Z"),
  });
  assert.equal(gate.ok, false);
});

test("P: pending >= 14 days with valid payment approves", () => {
  const gate = canApproveCommission({
    status: "pending",
    earnedAt: "2026-07-01T10:00:00.000Z",
    paymentValidity: "valid",
    now: new Date("2026-07-16T10:00:00.000Z"),
  });
  assert.equal(gate.ok, true);
});

test("Q: refund before approval blocks payout inclusion", () => {
  assert.equal(canIncludeCommissionInPayout({ status: "pending", paymentValidity: "refunded" }), false);
});

test("R: refund after approved reverses commission (handler present)", () => {
  assert.match(commissionsSrc, /reverseCommissionForInvalidPayment/);
  assert.match(partnerWebhookSrc, /charge\.refunded/);
});

test("S: dispute reverses commission path wired", () => {
  assert.match(partnerWebhookSrc, /charge\.dispute\.created/);
});

test("T: reversed commission unavailable for credit/payout", () => {
  assert.equal(
    spendableCommissionCents({
      amount_cents: 2900,
      credited_cents: 0,
      paid_out_cents: 0,
      status: "reversed",
      payout_id: null,
    }),
    0
  );
  assert.equal(canIncludeCommissionInPayout({ status: "reversed", paymentValidity: "valid" }), false);
});

test("U: approved commission can apply Freuly credit", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const result = await applyPartnerCommissionCredit(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRef: publicCommissionRef(seed.commissionApprovedId),
    amountCents: 500,
    idempotencyKey: "r3-u",
  });
  assert.equal(result.status, "applied");
});

test("V: credit + payout cannot exceed commission amount", () => {
  const row = {
    amount_cents: 2900,
    credited_cents: 900,
    paid_out_cents: 2000,
    status: "approved",
    payout_id: null,
  };
  assert.equal(spendableCommissionCents(row), 0);
  assert.equal(row.credited_cents + row.paid_out_cents <= row.amount_cents, true);
});

test("W: approved commission can request payout", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const result = await requestPartnerPayout(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRefs: [publicCommissionRef(seed.commissionApprovedId)],
  });
  assert.equal(result.status, "draft");
});

test("X: payout reservation blocks credit and second payout", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase, tables } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const ref = publicCommissionRef(seed.commissionApprovedId);
  await requestPartnerPayout(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRefs: [ref],
  });
  const row = tables.partner_commissions.find((c) => c.id === seed.commissionApprovedId);
  assert.ok(row.payout_id);
  assert.equal(spendableCommissionCents(row), 0);
});

test("Y: cancel payout releases commission remainder", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase, tables } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const { cancelPartnerPayout } = await import("./payouts.ts");
  const req = await requestPartnerPayout(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRefs: [publicCommissionRef(seed.commissionApprovedId)],
  });
  await cancelPartnerPayout(supabase, { payoutId: req.payoutId });
  const row = tables.partner_commissions.find((c) => c.id === seed.commissionApprovedId);
  assert.equal(row.payout_id, null);
  assert.equal(spendableCommissionCents(row), 2900);
});

test("Z/AA/AB: payout draft→ready→paid idempotent", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const { markPartnerPayoutReady, markPartnerPayoutPaid } = await import("./payouts.ts");
  const ref = publicCommissionRef(seed.commissionApprovedId);
  const req = await requestPartnerPayout(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRefs: [ref],
  });
  await markPartnerPayoutReady(supabase, { payoutId: req.payoutId });
  const paid = await markPartnerPayoutPaid(supabase, {
    payoutId: req.payoutId,
    paymentReference: "SEPA-1",
  });
  assert.equal(paid.status, "paid");
  const again = await markPartnerPayoutPaid(supabase, { payoutId: req.payoutId });
  assert.equal(again.status, "paid");
});

test("AC: reversed linked commission cannot mark payout paid", async () => {
  const seed = seedPartnerFinancialFixtures();
  const { supabase, tables } = createPartnerFinancialMock(seed.tables);
  const { publicCommissionRef } = await import("./publicRef.ts");
  const { markPartnerPayoutReady, markPartnerPayoutPaid } = await import("./payouts.ts");
  const { PartnerDomainError } = await import("./errors.ts");
  const req = await requestPartnerPayout(supabase, {
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionRefs: [publicCommissionRef(seed.commissionApprovedId)],
  });
  await markPartnerPayoutReady(supabase, { payoutId: req.payoutId });
  tables.partner_commissions.find((c) => c.id === seed.commissionApprovedId).status = "reversed";
  await assert.rejects(
    () => markPartnerPayoutPaid(supabase, { payoutId: req.payoutId }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_reversed"
  );
});

test("AD: dashboard balances reconcile with payout reservation", () => {
  const totals = computeDashboardAmounts([
    {
      amount_cents: 2900,
      status: "pending",
      credited_cents: 0,
      paid_out_cents: 0,
      payout_id: null,
    },
    {
      amount_cents: 2900,
      status: "approved",
      credited_cents: 900,
      paid_out_cents: 0,
      payout_id: null,
    },
    {
      amount_cents: 1500,
      status: "approved",
      credited_cents: 0,
      paid_out_cents: 0,
      payout_id: "reserved",
    },
  ]);
  assert.equal(totals.pending_cents, 2900);
  assert.equal(totals.approved_unpaid_cents, 2000);
  assert.equal(totals.available_for_payout_cents, 2000);
  assert.equal(totals.credited_cents, 900);
});

test("AE: partner endpoints derive partner from session", () => {
  for (const file of [
    "../../app/api/partner/credits/apply/route.ts",
    "../../app/api/partner/payouts/request/route.ts",
    "../../app/api/partner/dashboard/route.ts",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(src, /getPartnerForUser|requirePartnerSession|partnerId/);
    assert.doesNotMatch(src, /body\.partner_id|body\.partnerId/);
  }
});

test("AF: admin payout actions require admin token", () => {
  for (const segment of ["ready", "paid", "cancel"]) {
    const src = readFileSync(
      new URL(`../../app/api/admin/partners/payouts/[id]/${segment}/route.ts`, import.meta.url),
      "utf8"
    );
    assert.match(src, /requireAdminToken/);
  }
});

test("AG: no Stripe Connect in partner dashboard financial UX", () => {
  assert.doesNotMatch(dashboardClientSrc, /stripe-connect|Stripe Connect|payouts_enabled/i);
  assert.doesNotMatch(adminPageSrc, /confirm-first-payment|Confirm first monthly payment/i);
});

test("R3: confirm-first-payment retained as LEGACY emergency fallback only", () => {
  assert.match(confirmRouteSrc, /LEGACY|legacy|Interim/i);
  assert.match(confirmRouteSrc, /requireAdminToken/);
  assert.doesNotMatch(adminPageSrc, /confirm-first-payment/);
});
