import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

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

const {
  createWebhookMockServiceClient,
  resetWebhookHarness,
  seedSubscriptionCustomer,
  buildStripeSubscription,
  buildSubscriptionCheckoutSession,
  buildStripeEvent,
  webhookHarness,
  SPECIALIST_ID,
  CUSTOMER_ID,
  SUBSCRIPTION_ID,
  BASIC_PRICE_ID,
  PREMIUM_PRICE_ID,
} = await import("./testMocks/promotedAccessWebhook.harness.mjs");

const { processStripeWebhookEventForSubscriptions } = await import(
  "./processStripeSubscriptionWebhook.ts"
);
const { processStripeBillingWebhook, shouldRetryBillingWebhook } = await import(
  "./processStripeBillingWebhook.ts"
);
const { buildSpecialistPlanProjection } = await import(
  "./projectSpecialistPlanFromSubscription.ts"
);
const { resolveSpecialistEntitlements } = await import("./planEntitlements.ts");
const { resolvePromotedRequestAccess } = await import(
  "../serviceRequests/promotedRequestAccess.ts"
);
const { resolveSubscriptionPlanCode } = await import("./subscriptionPlanMapping.ts");
const { isOutOfOrderProviderEvent } = await import("./subscriptionWebhookValidation.ts");
const { createPromotedAccessCheckout } = await import("./createPromotedAccessCheckout.ts");

const orchestratorSrc = readFileSync(
  new URL("./processStripeBillingWebhook.ts", import.meta.url),
  "utf8",
);
const subscriptionSrc = readFileSync(
  new URL("./processStripeSubscriptionWebhook.ts", import.meta.url),
  "utf8",
);
const stripeProviderSrc = readFileSync(
  new URL("./stripePaymentProvider.ts", import.meta.url),
  "utf8",
);
const partnerSrc = readFileSync(
  new URL("./processStripePartnerWebhook.ts", import.meta.url),
  "utf8",
);

function supabase() {
  return createWebhookMockServiceClient();
}

test.beforeEach(() => {
  resetWebhookHarness();
  seedSubscriptionCustomer();
});

test("orchestrator wires subscription handler alongside partner and promoted", () => {
  assert.match(orchestratorSrc, /processStripeWebhookEventForSubscriptions/);
  assert.match(orchestratorSrc, /processStripeWebhookEventForPartners/);
  assert.match(orchestratorSrc, /processStripeWebhookEventForPromotedAccess/);
  assert.doesNotMatch(subscriptionSrc, /claimBillingEvent/);
});

test("checkout metadata includes specialist_subscription purpose and plan_code", () => {
  assert.match(stripeProviderSrc, /purpose: "specialist_subscription"/);
  assert.match(stripeProviderSrc, /plan_code: planConfig\.internalPlan/);
});

test("irrelevant event ignored", async () => {
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.updated", { id: CUSTOMER_ID }),
  );
  assert.equal(result.outcome, "ignored");
});

test("checkout.session.completed subscription handled", async () => {
  const session = buildSubscriptionCheckoutSession();
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("checkout.session.completed", session),
  );
  assert.equal(result.outcome, "synced");
  assert.equal(webhookHarness.billingSubscriptions.length, 1);
  assert.equal(webhookHarness.specialistPlans.length, 1);
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
});

test("subscription lifecycle events handled", async () => {
  for (const type of [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]) {
    resetWebhookHarness();
    seedSubscriptionCustomer();
    const sub = buildStripeSubscription(
      type === "customer.subscription.deleted"
        ? { status: "canceled", canceled_at: Math.floor(Date.now() / 1000) }
        : { status: "active" },
    );
    const result = await processStripeWebhookEventForSubscriptions(
      supabase(),
      buildStripeEvent(type, sub),
    );
    assert.equal(result.outcome, "synced", type);
  }
});

test("customer resolved via billing_customers", async () => {
  const sub = buildStripeSubscription();
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub),
  );
  assert.equal(result.outcome, "synced");
  assert.equal(webhookHarness.billingSubscriptions[0].specialist_id, SPECIALIST_ID);
});

test("metadata specialist mismatch rejected", async () => {
  const sub = buildStripeSubscription({
    metadata: { specialist_id: "00000000-0000-4000-8000-000000000001", plan_code: "basic" },
  });
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub),
  );
  assert.equal(result.outcome, "specialist_mismatch");
});

test("unknown customer creates no projection", async () => {
  webhookHarness.billingCustomers = [];
  const sub = buildStripeSubscription({ customer: "cus_unknown" });
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub),
  );
  assert.equal(result.outcome, "unknown_customer");
  assert.equal(webhookHarness.billingSubscriptions.length, 0);
  assert.equal(webhookHarness.specialistPlans.length, 0);
});

test("basic and premium Price IDs map correctly", () => {
  const basicSub = buildStripeSubscription({
    items: { data: [{ price: { id: BASIC_PRICE_ID, recurring: { interval: "month" } } }] },
    metadata: { plan_code: "basic" },
  });
  const premiumSub = buildStripeSubscription({
    items: { data: [{ price: { id: PREMIUM_PRICE_ID, recurring: { interval: "month" } } }] },
    metadata: { plan_code: "premium" },
  });
  const basicResolved = resolveSubscriptionPlanCode(basicSub);
  const premiumResolved = resolveSubscriptionPlanCode(premiumSub);
  assert.equal(basicResolved.ok, true);
  assert.equal(premiumResolved.ok, true);
  if (basicResolved.ok) assert.equal(basicResolved.planCode, "basic");
  if (premiumResolved.ok) assert.equal(premiumResolved.planCode, "premium");
});

test("unknown Price ID creates no paid entitlement path", async () => {
  const sub = buildStripeSubscription({
    items: { data: [{ price: { id: "price_foreign", recurring: { interval: "month" } } }] },
  });
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub),
  );
  assert.equal(result.outcome, "unknown_price");
  assert.equal(webhookHarness.billingSubscriptions.length, 0);
});

test("billing_subscriptions insert and update preserve created_at", async () => {
  const sub = buildStripeSubscription();
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.created", sub, 1_700_000_000),
  );
  const createdAt = webhookHarness.billingSubscriptions[0].created_at;
  assert.ok(createdAt);

  const updatedSub = buildStripeSubscription({ status: "past_due" });
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", updatedSub, 1_700_000_100),
  );
  assert.equal(webhookHarness.billingSubscriptions.length, 1);
  assert.equal(webhookHarness.billingSubscriptions[0].created_at, createdAt);
  assert.equal(webhookHarness.billingSubscriptions[0].status, "past_due");
});

test("event.created stored and older event ignored", async () => {
  const sub = buildStripeSubscription();
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub, 1_700_000_200),
  );
  assert.ok(webhookHarness.billingSubscriptions[0].last_provider_event_created_at);

  const older = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", buildStripeSubscription({ status: "canceled" }), 1_700_000_100),
  );
  assert.equal(older.outcome, "out_of_order");
  assert.equal(webhookHarness.billingSubscriptions[0].status, "active");
});

test("projection semantics by Stripe status", () => {
  const now = Math.floor(Date.now() / 1000);
  const base = {
    current_period_start: now,
    current_period_end: now + 86400,
    trial_end: now + 604800,
    ended_at: now + 1200,
  };
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "active", ...base })).plan_status, "active");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "trialing", ...base })).plan_status, "trialing");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "past_due", ...base })).plan_status, "grace");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "unpaid", ...base })).plan_status, "expired");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "canceled", ...base })).plan_status, "cancelled");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "incomplete", ...base })).plan_status, "expired");
  assert.equal(buildSpecialistPlanProjection("basic", buildStripeSubscription({ status: "paused", ...base })).plan_status, "expired");
});

test("trialing projection is non-paid in entitlement resolver", async () => {
  const sub = buildStripeSubscription({ status: "trialing" });
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", sub),
  );
  const entitlements = resolveSpecialistEntitlements({
    plan_code: webhookHarness.specialistPlans[0].plan_code,
    plan_status: webhookHarness.specialistPlans[0].plan_status,
  });
  assert.equal(entitlements.effectivePaidPlan, null);
});

test("active subscription unlocks Phase 4D via specialist_plan projection", async () => {
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", buildStripeSubscription({ status: "active" })),
  );
  const entitlements = resolveSpecialistEntitlements({
    plan_code: webhookHarness.specialistPlans[0].plan_code,
    plan_status: webhookHarness.specialistPlans[0].plan_status,
  });
  const decision = resolvePromotedRequestAccess({
    bindingPresent: true,
    promotion: { public_title: "T", public_summary: "S", status: "published" },
    grant: null,
    effectivePaidPlan: entitlements.effectivePaidPlan,
    latestPayment: null,
  });
  assert.equal(entitlements.effectivePaidPlan, "basic");
  assert.equal(decision.kind, "unlocked");
});

test("active subscription blocks €10 promoted checkout via projected specialist_plan", async () => {
  const { createBillingMockServiceClient, resetBillingHarness, billingHarness } = await import(
    "./testMocks/promotedAccess.harness.mjs",
  );
  resetBillingHarness();
  billingHarness.specialists.push({
    id: SPECIALIST_ID,
    user_id: "user-1",
    status: "published_unverified",
  });
  billingHarness.billingCustomers.push({
    id: "bc-1",
    specialist_id: SPECIALIST_ID,
    provider: "stripe",
    provider_customer_id: CUSTOMER_ID,
  });
  billingHarness.specialistPlans.push({
    specialist_id: SPECIALIST_ID,
    plan_code: "basic",
    plan_status: "active",
  });
  billingHarness.signupBindings.push({
    id: "bind-1",
    promotion_id: "promo-1",
    specialist_id: SPECIALIST_ID,
    user_id: "user-1",
  });
  billingHarness.promotions.push({ id: "promo-1" });

  const result = await createPromotedAccessCheckout({
    supabase: createBillingMockServiceClient(),
    specialistId: SPECIALIST_ID,
    userId: "user-1",
    lang: "ru",
    siteUrl: "https://freuly.de",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "subscription_access");
});

test("canceled subscription stays locked without payment grant", async () => {
  await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent(
      "customer.subscription.deleted",
      buildStripeSubscription({ status: "canceled", canceled_at: Math.floor(Date.now() / 1000) }),
    ),
  );
  const entitlements = resolveSpecialistEntitlements({
    plan_code: webhookHarness.specialistPlans[0].plan_code,
    plan_status: webhookHarness.specialistPlans[0].plan_status,
  });
  assert.equal(entitlements.effectivePaidPlan, null);
});

test("subscription handler never writes early_access", () => {
  assert.doesNotMatch(subscriptionSrc, /early_access/);
});

test("subscription handler does not create partner commission", () => {
  assert.doesNotMatch(subscriptionSrc, /partner_commissions/);
  assert.doesNotMatch(subscriptionSrc, /createCommissionFromStripeInvoice/);
  assert.match(partnerSrc, /invoice\.paid/);
});

test("promoted €10 checkout still ignored by subscription handler", async () => {
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("checkout.session.completed", {
      id: "cs_promoted",
      mode: "payment",
      customer: CUSTOMER_ID,
      metadata: { purpose: "promoted_request_access", payment_id: "pay-1", specialist_id: SPECIALIST_ID },
    }),
  );
  assert.equal(result.outcome, "ignored");
});

test("partial specialist_plan failure is retryable", async () => {
  webhookHarness.specialistPlanInsertError = { code: "XX000", message: "plan failed" };
  const result = await processStripeWebhookEventForSubscriptions(
    supabase(),
    buildStripeEvent("customer.subscription.updated", buildStripeSubscription()),
  );
  assert.equal(result.outcome, "retryable_failure");
  assert.equal(webhookHarness.billingSubscriptions.length, 1);
  assert.equal(webhookHarness.specialistPlans.length, 0);
});

test("orchestrator retries on subscription retryable failure", async () => {
  webhookHarness.specialistPlanInsertError = { code: "XX000", message: "plan failed" };
  const result = await processStripeBillingWebhook(
    supabase(),
    buildStripeEvent("customer.subscription.updated", buildStripeSubscription()),
  );
  assert.equal(shouldRetryBillingWebhook(result), true);
});

test("out-of-order helper compares provider timestamps", () => {
  assert.equal(
    isOutOfOrderProviderEvent("2026-08-06T10:00:00.000Z", "2026-08-06T09:00:00.000Z"),
    true,
  );
  assert.equal(
    isOutOfOrderProviderEvent("2026-08-06T10:00:00.000Z", "2026-08-06T10:00:00.000Z"),
    false,
  );
});

test("no provider IDs in subscription handler logs", () => {
  assert.doesNotMatch(subscriptionSrc, /console\.(log|info|error)\([^)]*sub_/);
  assert.doesNotMatch(subscriptionSrc, /console\.(log|info|error)\([^)]*cus_/);
});
