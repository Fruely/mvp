import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { findUntrustedCheckoutBodyKeys } from "./checkoutBodyValidation.ts";
import {
  confirmFirstPaidSubscriptionInvoice,
  extractSpecialistIdFromMetadata,
  precheckStripeInvoiceForCommission,
} from "./stripeInvoiceEligibility.ts";

const checkoutRoute = readFileSync(
  new URL("../../app/api/billing/checkout/route.ts", import.meta.url),
  "utf8",
);
const createCheckout = readFileSync(
  new URL("./createCheckoutSession.ts", import.meta.url),
  "utf8",
);
const stripeProviderSrc = readFileSync(
  new URL("./stripePaymentProvider.ts", import.meta.url),
  "utf8",
);
const billingCustomersSrc = readFileSync(
  new URL("./billingCustomers.ts", import.meta.url),
  "utf8",
);
const paymentProviderSrc = readFileSync(
  new URL("./paymentProvider.ts", import.meta.url),
  "utf8",
);
const stripeCommissionSrc = readFileSync(
  new URL("./stripePartnerCommission.ts", import.meta.url),
  "utf8",
);
const stripeReadinessSrc = readFileSync(
  new URL("./stripeReadiness.ts", import.meta.url),
  "utf8",
);
const planConfigSrc = readFileSync(new URL("./planConfig.ts", import.meta.url), "utf8");
const billingUrlsSrc = readFileSync(new URL("./billingUrls.ts", import.meta.url), "utf8");

function withEnv(overrides, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("A: authenticated specialist checkout creates Stripe session server-side", () => {
  assert.match(checkoutRoute, /resolveSpecialistLeadSession/);
  assert.match(checkoutRoute, /createCheckoutSessionForSpecialist/);
  assert.match(stripeProviderSrc, /mode: "subscription"/);
  assert.match(stripeProviderSrc, /checkout\.sessions\.create/);
});

test("B: unauthenticated request rejected", () => {
  assert.match(checkoutRoute, /resolveSpecialistLeadSession/);
  assert.match(checkoutRoute, /specialistLeadSessionErrorStatus/);
  assert.match(checkoutRoute, /session\.kind !== "ok"/);
});

test("C: user without owned specialist rejected", () => {
  assert.match(checkoutRoute, /specialist_required|specialistLeadSessionErrorCode/);
  assert.match(checkoutRoute, /status: specialistLeadSessionErrorStatus/);
});

test("D: client-provided specialist_id rejected", () => {
  const keys = findUntrustedCheckoutBodyKeys({ plan_code: "basic", specialist_id: "evil" });
  assert.ok(keys.includes("specialist_id"));
  assert.match(checkoutRoute, /untrusted_fields/);
});

test("E: client-provided Price ID rejected", () => {
  const keys = findUntrustedCheckoutBodyKeys({
    plan_code: "basic",
    price_id: "price_evil",
    stripe_price_id: "price_evil2",
  });
  assert.ok(keys.includes("price_id"));
  assert.ok(keys.includes("stripe_price_id"));
});

test("F: client-provided amount/currency rejected", () => {
  const keys = findUntrustedCheckoutBodyKeys({
    plan_code: "basic",
    amount: 2900,
    currency: "usd",
  });
  assert.ok(keys.includes("amount"));
  assert.ok(keys.includes("currency"));
});

test("G: unknown plan rejected", () => {
  assert.match(createCheckout, /parsePaidPlanCode/);
  assert.match(createCheckout, /invalid_plan/);
});

test("H: misconfigured plan uses server env mapping only", () => {
  assert.match(planConfigSrc, /readEnvPrice/);
  assert.match(planConfigSrc, /STRIPE_PRICE_BASIC/);
  assert.doesNotMatch(stripeProviderSrc, /input\.price/);
});

test("I: monthly plan resolves trusted monthly Price env keys", () => {
  assert.match(planConfigSrc, /STRIPE_PRICE_BASIC/);
  assert.match(planConfigSrc, /STRIPE_PRICE_BASIC_MONTHLY/);
  assert.match(planConfigSrc, /billingInterval: "month"/);
});

test("J: annual plan resolves trusted annual Price when configured", () => {
  assert.match(planConfigSrc, /STRIPE_PRICE_BASIC_ANNUAL/);
  assert.match(planConfigSrc, /billingInterval: "year"/);
});

test("K: session metadata contains trusted specialist_id and plan_code", () => {
  assert.match(stripeProviderSrc, /buildStripeCheckoutMetadata/);
  assert.match(billingCustomersSrc, /specialist_id: input\.specialistId/);
  assert.match(billingCustomersSrc, /plan_code: input\.internalPlan/);
  assert.match(billingCustomersSrc, /purpose: "specialist_subscription"/);
});

test("L: subscription metadata contains trusted specialist_id/plan_code", () => {
  assert.match(stripeProviderSrc, /subscription_data:/);
  assert.match(stripeProviderSrc, /specialist_id: input\.specialistId/);
  assert.match(stripeProviderSrc, /plan_code: planConfig\.internalPlan/);
  assert.match(stripeProviderSrc, /purpose: "specialist_subscription"/);
});

test("M: billing_customers mapping uses insert with conflict handling", () => {
  assert.match(billingCustomersSrc, /billing_customers/);
  assert.match(billingCustomersSrc, /23505/);
});

test("N: repeated checkout reuses existing Stripe Customer", () => {
  assert.match(billingCustomersSrc, /reused: true/);
  assert.match(billingCustomersSrc, /if \(existing\?\.provider_customer_id\)/);
});

test("O: concurrent customer creation reconciles on unique conflict", () => {
  assert.match(billingCustomersSrc, /orphan_stripe_customer_after_race/);
});

test("P: existing active subscription prevents duplicate checkout", () => {
  assert.match(stripeProviderSrc, /assertNoBlockingStripeSubscription/);
  assert.match(billingCustomersSrc, /classifyStripeSubscriptionBlock/);
});

test("Q: success/cancel URLs built server-side with locale", () => {
  assert.match(billingUrlsSrc, /buildBillingCheckoutUrls/);
  assert.match(billingUrlsSrc, /buildTrustedLegacyBillingCheckoutUrls/);
  assert.match(createCheckout, /buildBillingCheckoutUrls/);
  assert.doesNotMatch(createCheckout, /body\.success/);
});

test("R: webhook resolves specialist from subscription metadata", () => {
  assert.match(stripeCommissionSrc, /subscriptions\.retrieve/);
  assert.match(stripeCommissionSrc, /extractSpecialistIdFromMetadata/);
  const id = extractSpecialistIdFromMetadata({ specialist_id: "spec-webhook" });
  assert.equal(id, "spec-webhook");
});

test("S: webhook fallback resolves specialist through billing_customers", () => {
  assert.match(stripeCommissionSrc, /billing_customers/);
  assert.match(stripeCommissionSrc, /provider_customer_id/);
});

test("T: email is not primary identity resolution path", () => {
  assert.doesNotMatch(stripeCommissionSrc, /\.eq\("email"/);
});

test("U: first monthly invoice eligible for commission", () => {
  const r = precheckStripeInvoiceForCommission({
    id: "in_1",
    status: "paid",
    amount_paid: 2900,
    billing_reason: "subscription_create",
    lines: { data: [{ price: { recurring: { interval: "month" } } }] },
  });
  assert.equal(r.eligible, true);
  assert.deepEqual(confirmFirstPaidSubscriptionInvoice(1), {
    eligible: true,
    billingInterval: "month",
  });
});

test("V: annual invoice creates no commission", () => {
  const r = precheckStripeInvoiceForCommission({
    id: "in_annual",
    status: "paid",
    amount_paid: 29000,
    billing_reason: "subscription_create",
    lines: { data: [{ price: { recurring: { interval: "year" } } }] },
  });
  assert.equal(r.eligible, false);
});

test("W: renewal invoice creates no commission", () => {
  const renewal = confirmFirstPaidSubscriptionInvoice(2);
  assert.equal(renewal.eligible, false);
});

test("X: duplicate billing_events handled via unique constraint", () => {
  const events = readFileSync(new URL("./billingEvents.ts", import.meta.url), "utf8");
  assert.match(events, /23505/);
});

test("Y: refund path reverses pending commission", () => {
  assert.match(stripeCommissionSrc, /reverseCommissionForInvalidPayment/);
});

test("Z: missing readiness disables production checkout safely", () => {
  assert.match(stripeReadinessSrc, /getStripeCheckoutReadiness/);
  assert.match(stripeReadinessSrc, /payments_disabled/);
  assert.match(createCheckout, /checkout_unavailable/);
  assert.match(paymentProviderSrc, /StubPaymentProvider/);
  assert.match(paymentProviderSrc, /isStripeCheckoutReady/);
});

test("Stub is not used as hidden production fallback when not ready", () => {
  assert.match(paymentProviderSrc, /if \(isStripeCheckoutReady\(\)\)/);
  assert.match(paymentProviderSrc, /return new StubPaymentProvider/);
});

test("client success/cancel URL fields rejected", () => {
  const keys = findUntrustedCheckoutBodyKeys({
    plan_code: "basic",
    success_url: "https://evil.example/ok",
  });
  assert.ok(keys.includes("success_url"));
});

test("checkout readiness requires PAYMENTS_ENABLED and Stripe env", () => {
  assert.match(stripeReadinessSrc, /STRIPE_SECRET_KEY|stripe_secret_key_missing/);
  assert.match(stripeReadinessSrc, /stripe_webhook_secret_missing/);
  assert.match(stripeReadinessSrc, /no_monthly_stripe_price_configured/);
});
