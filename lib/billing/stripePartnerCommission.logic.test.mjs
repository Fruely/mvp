import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  confirmFirstPaidSubscriptionInvoice,
  precheckStripeInvoiceForCommission,
  sumInvoiceTaxCents,
} from "./stripeInvoiceEligibility.ts";

const baseInvoice = {
  id: "in_test_1",
  status: "paid",
  amount_paid: 2900,
  billing_reason: "subscription_create",
  currency: "eur",
  lines: { data: [{ price: { recurring: { interval: "month" } } }] },
  total_tax_amounts: [{ amount: 200 }],
};

test("A: first subscription_create monthly invoice is eligible", () => {
  const r = precheckStripeInvoiceForCommission(baseInvoice);
  assert.deepEqual(r, { eligible: true, billingInterval: "month" });
});

test("B: subscription_cycle requires first-paid async check", () => {
  const r = precheckStripeInvoiceForCommission({
    ...baseInvoice,
    billing_reason: "subscription_cycle",
  });
  assert.equal("needsFirstPaidCheck" in r && r.needsFirstPaidCheck, true);
});

test("C: annual interval rejected", () => {
  const r = precheckStripeInvoiceForCommission({
    ...baseInvoice,
    lines: { data: [{ price: { recurring: { interval: "year" } } }] },
  });
  assert.equal(r.eligible, false);
  if (!r.eligible) assert.equal(r.reason, "annual_interval");
});

test("D: zero amount / trial without payment rejected", () => {
  const r = precheckStripeInvoiceForCommission({ ...baseInvoice, amount_paid: 0 });
  assert.equal(r.eligible, false);
  if (!r.eligible) assert.equal(r.reason, "zero_amount_paid");
});

test("E: subscription_update rejected", () => {
  const r = precheckStripeInvoiceForCommission({
    ...baseInvoice,
    billing_reason: "subscription_update",
  });
  assert.equal(r.eligible, false);
});

test("F: first paid subscription count gate blocks renewals", () => {
  assert.deepEqual(confirmFirstPaidSubscriptionInvoice(1), {
    eligible: true,
    billingInterval: "month",
  });
  const renewal = confirmFirstPaidSubscriptionInvoice(2);
  assert.equal(renewal.eligible, false);
  if (!renewal.eligible) assert.equal(renewal.reason, "renewal_not_first_payment");
});

test("G: VAT sum from invoice tax amounts", () => {
  assert.equal(sumInvoiceTaxCents(baseInvoice), 200);
  assert.equal(sumInvoiceTaxCents({ ...baseInvoice, total_tax_amounts: [] }), 0);
});

test("H: webhook route uses raw body and signature verification", () => {
  const route = readFileSync(
    new URL("../../app/api/billing/webhook/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(route, /request\.text\(\)/);
  assert.match(route, /stripe-signature/i);
  assert.match(route, /constructEvent/);
  assert.match(route, /getStripeWebhookSecret/);
  assert.doesNotMatch(route, /request\.json\(\)/);
});

test("I: canonical event is invoice.paid; payment_succeeded reconciles only", () => {
  const proc = readFileSync(
    new URL("./processStripePartnerWebhook.ts", import.meta.url),
    "utf8"
  );
  assert.match(proc, /invoice\.paid/);
  assert.match(proc, /invoice\.payment_succeeded/);
  assert.match(proc, /handleStripeInvoicePaymentSucceededReconcile/);
});

test("J: billing_events idempotency claim before processing", () => {
  const events = readFileSync(new URL("./billingEvents.ts", import.meta.url), "utf8");
  assert.match(events, /provider_event_id/);
  assert.match(events, /claimBillingEvent/);
  assert.match(events, /23505/);
});

test("K: commission wired to createCommissionFromStripeInvoice and reversals", () => {
  const src = readFileSync(new URL("./stripePartnerCommission.ts", import.meta.url), "utf8");
  assert.match(src, /createCommissionFromStripeInvoice/);
  assert.match(src, /reverseCommissionForInvalidPayment/);
  const proc = readFileSync(new URL("./processStripePartnerWebhook.ts", import.meta.url), "utf8");
  assert.match(proc, /charge\.refunded/);
  assert.match(proc, /charge\.dispute\.created/);
});

test("L: commissions.ts idempotency by source_event_id preserved", () => {
  const src = readFileSync(new URL("../partners/commissions.ts", import.meta.url), "utf8");
  assert.match(src, /stripe_invoice_payment_succeeded/);
  assert.match(src, /commission_already_exists/);
});

test("M: 14-day approval engine unchanged", () => {
  const validation = readFileSync(
    new URL("../partners/commissionValidation.ts", import.meta.url),
    "utf8"
  );
  assert.match(validation, /COMMISSION_VALIDATION_DAYS = 14/);
  const proc = readFileSync(new URL("./stripePartnerCommission.ts", import.meta.url), "utf8");
  assert.doesNotMatch(proc, /approveCommissionIfEligible/);
});
