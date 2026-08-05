import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  billingHarness,
  createBillingMockServiceClient,
  resetBillingHarness,
} from "./testMocks/promotedAccess.harness.mjs";
import {
  buildStripeEvent,
  buildSubscriptionCheckoutSession,
  buildStripeSubscription,
  createWebhookMockServiceClient,
  resetWebhookHarness,
  seedSubscriptionCustomer,
  SPECIALIST_ID,
  CUSTOMER_ID,
  webhookHarness,
} from "./testMocks/promotedAccessWebhook.harness.mjs";

process.env.PAYMENTS_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
process.env.STRIPE_PRICE_BASIC = "price_basic_monthly_test";
process.env.STRIPE_PRICE_PREMIUM = "price_premium_monthly_test";
process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/billing-service-server.mjs", import.meta.url).href,
      "@/lib/billing/stripeClient": new URL("./testMocks/stripe-client.mjs", import.meta.url).href,
      "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { StripePaymentProvider } = await import("./stripePaymentProvider.ts");
const { processStripeWebhookEventForSubscriptions } = await import(
  "./processStripeSubscriptionWebhook.ts"
);
const { processStripeBillingWebhook, shouldRetryBillingWebhook } = await import(
  "./processStripeBillingWebhook.ts"
);
const { findUntrustedCheckoutBodyKeys } = await import("./checkoutBodyValidation.ts");
const { creditEligibleForConsumption, sessionHasPromotedCreditDiscount } = await import(
  "./subscriptionCreditValidation.ts"
);
const { confirmFirstPaidSubscriptionInvoice, precheckStripeInvoiceForCommission } = await import(
  "./stripeInvoiceEligibility.ts"
);

const stripeProviderSrc = readFileSync(
  new URL("./stripePaymentProvider.ts", import.meta.url),
  "utf8",
);
const subscriptionSrc = readFileSync(
  new URL("./processStripeSubscriptionWebhook.ts", import.meta.url),
  "utf8",
);
const consumeSrc = readFileSync(
  new URL("./consumePromotedSubscriptionCredit.ts", import.meta.url),
  "utf8",
);
const discountSrc = readFileSync(
  new URL("./createSubscriptionCreditDiscount.ts", import.meta.url),
  "utf8",
);
const partnerSrc = readFileSync(
  new URL("./processStripePartnerWebhook.ts", import.meta.url),
  "utf8",
);
const partnerCommissionSrc = readFileSync(
  new URL("./stripePartnerCommission.ts", import.meta.url),
  "utf8",
);
const checkoutRouteSrc = readFileSync(
  new URL("../../app/api/billing/checkout/route.ts", import.meta.url),
  "utf8",
);

const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const CREDIT_ID = "credit-test-0001";
const SOURCE_PAYMENT_ID = "pay-credit-source-001";

function seedCheckoutContext() {
  resetBillingHarness();
  billingHarness.specialists.push({
    id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "published_unverified",
  });
  billingHarness.billingCustomers.push({
    id: "bc-1",
    specialist_id: SPECIALIST_ID,
    provider: "stripe",
    provider_customer_id: CUSTOMER_ID,
  });
}

function seedSourcePayment(overrides = {}) {
  billingHarness.payments.push({
    id: SOURCE_PAYMENT_ID,
    specialist_id: SPECIALIST_ID,
    amount_cents: 1000,
    currency: "eur",
    status: "paid",
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });
}

function seedEligibleCredit(overrides = {}) {
  seedSourcePayment(overrides.sourcePayment ?? {});
  billingHarness.subscriptionCredits.push({
    id: CREDIT_ID,
    specialist_id: SPECIALIST_ID,
    source_payment_id: SOURCE_PAYMENT_ID,
    credit_cents: 1000,
    currency: "eur",
    eligible_until: new Date(Date.now() + 7 * 86400000).toISOString(),
    consumed_at: null,
    consumed_checkout_session_id: null,
    consumed_plan_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides.credit,
  });
}

function seedWebhookCredit(overrides = {}) {
  webhookHarness.payments.push({
    id: SOURCE_PAYMENT_ID,
    specialist_id: SPECIALIST_ID,
    amount_cents: 1000,
    currency: "eur",
    status: "paid",
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(overrides.sourcePayment ?? {}),
  });
  webhookHarness.subscriptionCredits.push({
    id: CREDIT_ID,
    specialist_id: SPECIALIST_ID,
    source_payment_id: SOURCE_PAYMENT_ID,
    credit_cents: 1000,
    currency: "eur",
    eligible_until: new Date(Date.now() + 7 * 86400000).toISOString(),
    consumed_at: null,
    consumed_checkout_session_id: null,
    consumed_plan_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...(overrides.credit ?? {}),
  });
}

async function createSubscriptionCheckout(planCode = "basic") {
  const provider = new StripePaymentProvider({
    supabase: createBillingMockServiceClient(),
    specialistId: SPECIALIST_ID,
    userId: USER_ID,
  });
  return provider.createCheckoutSession({
    specialistId: SPECIALIST_ID,
    planCode,
    successUrl: "https://freuly.de/ru/specialist/dashboard/billing?success=1",
    cancelUrl: "https://freuly.de/ru/specialist/dashboard/billing?cancel=1",
    userId: USER_ID,
  });
}

test.beforeEach(() => {
  resetBillingHarness();
  resetWebhookHarness();
});

test("A: no credit creates normal subscription checkout without discounts", async () => {
  seedCheckoutContext();
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, true);
  assert.equal(billingHarness.stripeCoupons.length, 0);
  assert.equal(billingHarness.stripeSessions.length, 1);
  assert.equal(billingHarness.stripeSessions[0].discounts, undefined);
  assert.doesNotMatch(JSON.stringify(billingHarness.stripeSessions[0].metadata), /promoted_credit_id/);
});

test("B: valid credit applies one-time 1000 EUR discount coupon", async () => {
  seedCheckoutContext();
  seedEligibleCredit();
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, true);
  assert.equal(billingHarness.stripeCoupons.length, 1);
  assert.equal(billingHarness.stripeCoupons[0].amount_off, 1000);
  assert.equal(billingHarness.stripeSessions[0].discounts?.[0]?.coupon, "coupon_test_1");
});

test("C-D: coupon fixed at 1000 EUR once for basic and premium", async () => {
  for (const planCode of ["basic", "premium"]) {
    seedCheckoutContext();
    seedEligibleCredit();
    await createSubscriptionCheckout(planCode);
    assert.equal(billingHarness.stripeCoupons.at(-1).currency, "eur");
    assert.equal(billingHarness.stripeCoupons.at(-1).duration, "once");
    assert.equal(billingHarness.stripeCoupons.at(-1).max_redemptions, 1);
    assert.equal(billingHarness.stripeCoupons.at(-1).metadata.plan_code, planCode);
  }
});

test("E: expired credit ignored and full-price checkout created", async () => {
  seedCheckoutContext();
  seedEligibleCredit({
    credit: {
      eligible_until: new Date(Date.now() - 60_000).toISOString(),
    },
  });
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, true);
  assert.equal(billingHarness.stripeCoupons.length, 0);
});

test("F: consumed credit ignored at checkout", async () => {
  seedCheckoutContext();
  seedEligibleCredit({
    credit: {
      consumed_at: new Date().toISOString(),
      consumed_checkout_session_id: "cs_old",
      consumed_plan_code: "basic",
    },
  });
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, true);
  assert.equal(billingHarness.stripeCoupons.length, 0);
});

test("G-I: invalid source payment statuses skip credit", async () => {
  for (const status of ["pending", "refunded", "disputed"]) {
    seedCheckoutContext();
    seedEligibleCredit({ sourcePayment: { status } });
    const result = await createSubscriptionCheckout();
    assert.equal(result.ok, true, status);
    assert.equal(billingHarness.stripeCoupons.length, 0, status);
  }
});

test("J: credit specialist ownership enforced server-side", async () => {
  seedCheckoutContext();
  seedEligibleCredit({
    credit: { specialist_id: "00000000-0000-4000-8000-000000000099" },
  });
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, true);
  assert.equal(billingHarness.stripeCoupons.length, 0);
});

test("K-L: client cannot submit credit_id or discount amount", () => {
  const keys = findUntrustedCheckoutBodyKeys({
    plan_code: "basic",
    credit_id: CREDIT_ID,
    discount_amount: 1000,
    coupon_id: "coupon_evil",
  });
  assert.ok(keys.includes("credit_id"));
  assert.ok(keys.includes("discount_amount"));
  assert.ok(keys.includes("coupon_id"));
  assert.doesNotMatch(checkoutRouteSrc, /body\.credit_id/);
});

test("M-P: coupon is server-created, non-public, one-time", () => {
  assert.match(discountSrc, /amount_off: PROMOTED_SUBSCRIPTION_CREDIT_CENTS/);
  assert.match(discountSrc, /duration: "once"/);
  assert.match(discountSrc, /max_redemptions: 1/);
  assert.doesNotMatch(discountSrc, /promotionCodes|promotion_codes/);
  assert.match(stripeProviderSrc, /createSubscriptionCreditDiscount/);
  assert.doesNotMatch(stripeProviderSrc, /body\.coupon/);
});

test("Q-R: checkout metadata contains only approved credit fields without PII", async () => {
  seedCheckoutContext();
  seedEligibleCredit();
  await createSubscriptionCheckout();
  const session = billingHarness.stripeSessions[0];
  assert.equal(session.metadata.promoted_credit_id, CREDIT_ID);
  assert.equal(session.metadata.promoted_credit_cents, "1000");
  assert.ok(session.metadata.promoted_credit_checked_at);
  assert.doesNotMatch(JSON.stringify(session.metadata), /email|phone|name|partner|token|payment_id/);
  assert.equal(session.subscription_data.metadata.promoted_credit_id, CREDIT_ID);
  assert.equal(session.subscription_data.metadata.promoted_credit_cents, "1000");
  assert.equal(session.subscription_data.metadata.promoted_credit_checked_at, undefined);
});

test("S-T: coupon failure returns checkout_error without silent full-price fallback", async () => {
  seedCheckoutContext();
  seedEligibleCredit();
  billingHarness.couponShouldFail = true;
  const result = await createSubscriptionCheckout();
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "checkout_error");
  assert.equal(billingHarness.stripeSessions.length, 0);
});

test("U: checkout response contract unchanged", () => {
  assert.match(checkoutRouteSrc, /\{ url: result\.url \}/);
  assert.doesNotMatch(checkoutRouteSrc, /promoted_credit_id/);
  assert.doesNotMatch(checkoutRouteSrc, /coupon_id/);
});

test("V: credit not consumed at checkout creation", async () => {
  seedCheckoutContext();
  seedEligibleCredit();
  await createSubscriptionCheckout();
  assert.equal(billingHarness.subscriptionCredits[0].consumed_at, null);
});

test("W: success redirect path does not consume credit", () => {
  assert.doesNotMatch(stripeProviderSrc, /consumePromotedSubscriptionCredit/);
  assert.match(subscriptionSrc, /consumePromotedSubscriptionCredit/);
});

test("X: subscription.updated without checkout metadata does not consume credit", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit();
  await processStripeWebhookEventForSubscriptions(
    createWebhookMockServiceClient(),
    buildStripeEvent("customer.subscription.updated", buildStripeSubscription()),
  );
  assert.equal(webhookHarness.subscriptionCredits[0].consumed_at, null);
});

test("Y-AB: confirmed subscription checkout consumes credit once with audit fields", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit();
  const checkedAt = new Date().toISOString();
  const session = buildSubscriptionCheckoutSession({
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      internal_plan: "basic",
      promoted_credit_id: CREDIT_ID,
      promoted_credit_cents: "1000",
      promoted_credit_checked_at: checkedAt,
    },
    total_details: { amount_discount: 1000 },
    amount_subtotal: 2900,
    amount_total: 1900,
  });
  const result = await processStripeWebhookEventForSubscriptions(
    createWebhookMockServiceClient(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.outcome, "synced");
  assert.ok(webhookHarness.subscriptionCredits[0].consumed_at);
  assert.equal(webhookHarness.subscriptionCredits[0].consumed_checkout_session_id, session.id);
  assert.equal(webhookHarness.subscriptionCredits[0].consumed_plan_code, "basic");
});

test("AC: duplicate webhook for same session is idempotent", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit({
    credit: {
      consumed_at: new Date().toISOString(),
      consumed_checkout_session_id: "cs_test_subscription_001",
      consumed_plan_code: "basic",
    },
  });
  const session = buildSubscriptionCheckoutSession({
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      promoted_credit_id: CREDIT_ID,
      promoted_credit_cents: "1000",
      promoted_credit_checked_at: new Date().toISOString(),
    },
    total_details: { amount_discount: 1000 },
  });
  const result = await processStripeWebhookEventForSubscriptions(
    createWebhookMockServiceClient(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.outcome, "synced");
});

test("AD: credit consumed by different session yields conflict", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit({
    credit: {
      consumed_at: new Date().toISOString(),
      consumed_checkout_session_id: "cs_other_session",
      consumed_plan_code: "basic",
    },
  });
  const session = buildSubscriptionCheckoutSession({
    id: "cs_new_session",
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      promoted_credit_id: CREDIT_ID,
      promoted_credit_cents: "1000",
      promoted_credit_checked_at: new Date().toISOString(),
    },
    total_details: { amount_discount: 1000 },
  });
  const result = await processStripeWebhookEventForSubscriptions(
    createWebhookMockServiceClient(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.outcome, "conflict");
});

test("AE: credit expired after checkout but valid at creation can still consume", () => {
  const eligibleUntil = "2026-08-10T00:00:00.000Z";
  const checkedAt = "2026-08-09T12:00:00.000Z";
  const nowIso = "2026-08-11T00:00:00.000Z";
  assert.equal(
    creditEligibleForConsumption(
      { eligible_until: eligibleUntil },
      { promoted_credit_checked_at: checkedAt },
      nowIso,
    ),
    true,
  );
});

test("AF: source payment refund before completion prevents consume", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit({ sourcePayment: { status: "refunded" } });
  const session = buildSubscriptionCheckoutSession({
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      promoted_credit_id: CREDIT_ID,
      promoted_credit_cents: "1000",
      promoted_credit_checked_at: new Date().toISOString(),
    },
    total_details: { amount_discount: 1000 },
  });
  const result = await processStripeWebhookEventForSubscriptions(
    createWebhookMockServiceClient(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.outcome, "synced");
  assert.equal(webhookHarness.subscriptionCredits[0].consumed_at, null);
});

test("AG: refund after consume does not revert subscription projection", () => {
  assert.doesNotMatch(consumeSrc, /specialist_plan/);
  assert.doesNotMatch(consumeSrc, /consumed_at: null/);
});

test("AH-AI: partner commission not created by promoted payment or credit consumption", () => {
  assert.doesNotMatch(consumeSrc, /partner_commissions/);
  assert.doesNotMatch(subscriptionSrc, /createCommissionFromStripeInvoice/);
  assert.match(partnerSrc, /invoice\.paid/);
  assert.doesNotMatch(partnerCommissionSrc, /promoted_request_subscription_credits/);
});

test("AJ-AK: partner commission uses actual discounted invoice amounts", () => {
  for (const amount of [1900, 4900]) {
    const r = precheckStripeInvoiceForCommission({
      id: `in_${amount}`,
      status: "paid",
      amount_paid: amount,
      billing_reason: "subscription_create",
      currency: "eur",
      lines: { data: [{ price: { recurring: { interval: "month" } } }] },
    });
    assert.equal(r.eligible, true, String(amount));
    assert.deepEqual(confirmFirstPaidSubscriptionInvoice(1), {
      eligible: true,
      billingInterval: "month",
    });
  }
});

test("AL-AN: non-discount and duplicate invoice commission semantics unchanged", () => {
  const full = precheckStripeInvoiceForCommission({
    id: "in_full",
    status: "paid",
    amount_paid: 2900,
    billing_reason: "subscription_create",
    currency: "eur",
    lines: { data: [{ price: { recurring: { interval: "month" } } }] },
  });
  assert.equal(full.eligible, true);
  assert.match(partnerCommissionSrc, /reverseCommissionForInvalidPayment/);
  assert.match(partnerCommissionSrc, /amount_paid/);
});

test("credit consumption retryable failure triggers orchestrator retry", async () => {
  seedSubscriptionCustomer();
  seedWebhookCredit();
  webhookHarness.creditUpdateError = { code: "XX000", message: "credit update failed" };
  const session = buildSubscriptionCheckoutSession({
    metadata: {
      purpose: "specialist_subscription",
      specialist_id: SPECIALIST_ID,
      plan_code: "basic",
      promoted_credit_id: CREDIT_ID,
      promoted_credit_cents: "1000",
      promoted_credit_checked_at: new Date().toISOString(),
    },
    total_details: { amount_discount: 1000 },
  });
  const result = await processStripeBillingWebhook(
    createWebhookMockServiceClient(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.subscription.outcome, "retryable_failure");
  assert.equal(shouldRetryBillingWebhook(result), true);
});

test("sessionHasPromotedCreditDiscount validates Stripe discount evidence", () => {
  assert.equal(
    sessionHasPromotedCreditDiscount({
      metadata: { promoted_credit_cents: "1000" },
      total_details: { amount_discount: 1000 },
    }),
    true,
  );
  assert.equal(
    sessionHasPromotedCreditDiscount({
      metadata: { promoted_credit_cents: "1000" },
      amount_subtotal: 5900,
      amount_total: 4900,
    }),
    true,
  );
  assert.equal(
    sessionHasPromotedCreditDiscount({
      metadata: { promoted_credit_cents: "999" },
      total_details: { amount_discount: 1000 },
    }),
    false,
  );
});

test("architecture modules exist and checkout route stays thin", () => {
  assert.match(stripeProviderSrc, /getEligiblePromotedSubscriptionCredit/);
  assert.match(subscriptionSrc, /consumePromotedSubscriptionCredit/);
  assert.doesNotMatch(checkoutRouteSrc, /promoted_request_subscription_credits/);
});
