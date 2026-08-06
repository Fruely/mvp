import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

function baseEnv() {
  process.env.PAYMENTS_ENABLED = "true";
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";
  process.env.STRIPE_PRICE_BASIC_MONTHLY_ONE_TIME = "price_basic_one_time_test";
  process.env.STRIPE_PRICE_PREMIUM_MONTHLY_ONE_TIME = "price_premium_one_time_test";
  process.env.STRIPE_PRICE_BASIC = "price_basic_recurring_legacy";
  process.env.STRIPE_PRICE_PREMIUM = "price_premium_recurring_legacy";
}

baseEnv();

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

const { billingHarness, resetBillingHarness, createBillingMockServiceClient } = await import(
  "./testMocks/promotedAccess.harness.mjs"
);
const { computePlanPaymentAmounts } = await import("./planPaymentAmounts.ts");
const {
  evaluatePlanPurchasePolicy,
  hasActivePaidPeriod,
} = await import("./planPaymentPolicy.ts");
const { createPlanPaymentCheckout } = await import("./createPlanPaymentCheckout.ts");
const { expireStalePendingPlanPaymentReservations } = await import(
  "./expireStalePlanPaymentReservations.ts"
);
const { validatePlanPaymentStripePrice } = await import("./validatePlanPaymentStripePrice.ts");
const { getManualPlanPaymentConfig } = await import("./planPaymentConfig.ts");
const { getPlanPaymentCheckoutReadiness } = await import("./planPaymentReadiness.ts");
const { findUntrustedCheckoutBodyKeys } = await import("./checkoutBodyValidation.ts");
const { STALE_PENDING_RESERVATION_MINUTES } = await import("./planPaymentConstants.ts");

const routeSrc = readFileSync(
  new URL("../../app/api/billing/checkout/route.ts", import.meta.url),
  "utf8",
);
const createSrc = readFileSync(new URL("./createPlanPaymentCheckout.ts", import.meta.url), "utf8");
const createCheckoutSrc = readFileSync(new URL("./createCheckoutSession.ts", import.meta.url), "utf8");
const planConfigSrc = readFileSync(new URL("./planPaymentConfig.ts", import.meta.url), "utf8");
const stripeProviderSrc = readFileSync(new URL("./stripePaymentProvider.ts", import.meta.url), "utf8");
const validatePriceSrc = readFileSync(
  new URL("./validatePlanPaymentStripePrice.ts", import.meta.url),
  "utf8",
);

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

function serviceClient() {
  return createBillingMockServiceClient();
}

function seedSpecialistPlan(overrides = {}) {
  billingHarness.specialistPlans.push({
    specialist_id: "spec-1",
    plan_code: "starter",
    plan_status: "early_access",
    started_at: null,
    expires_at: null,
    grace_until: null,
    ...overrides,
  });
}

function seedEligibleCredit(id = "credit-1") {
  const now = Date.now();
  billingHarness.subscriptionCredits.push({
    id,
    specialist_id: "spec-1",
    source_payment_id: "pay-src-1",
    credit_cents: 1000,
    currency: "eur",
    eligible_until: new Date(now + 86400000).toISOString(),
    consumed_at: null,
  });
  billingHarness.payments.push({
    id: "pay-src-1",
    specialist_id: "spec-1",
    amount_cents: 1000,
    currency: "eur",
    status: "paid",
  });
}

function planRow(overrides = {}) {
  return {
    plan_code: "starter",
    plan_status: "early_access",
    started_at: null,
    expires_at: null,
    grace_until: null,
    fromDatabase: true,
    ...overrides,
  };
}

test("amounts: basic/premium with and without credit", () => {
  assert.deepEqual(computePlanPaymentAmounts({ planCode: "basic", applyPromotedCredit: false }), {
    grossAmountCents: 2900,
    discountAmountCents: 0,
    netAmountCents: 2900,
  });
  assert.deepEqual(computePlanPaymentAmounts({ planCode: "premium", applyPromotedCredit: false }), {
    grossAmountCents: 5900,
    discountAmountCents: 0,
    netAmountCents: 5900,
  });
  assert.equal(
    computePlanPaymentAmounts({ planCode: "basic", applyPromotedCredit: true }).netAmountCents,
    1900,
  );
  assert.equal(
    computePlanPaymentAmounts({ planCode: "premium", applyPromotedCredit: true }).netAmountCents,
    4900,
  );
});

test("Stripe Checkout uses mode payment and one-time Price env only", () => {
  assert.match(createSrc, /mode: "payment"/);
  assert.match(planConfigSrc, /STRIPE_PRICE_BASIC_MONTHLY_ONE_TIME/);
  assert.doesNotMatch(planConfigSrc, /STRIPE_PRICE_BASIC[^_M]/);
  assert.equal(getManualPlanPaymentConfig("basic")?.stripePriceId, "price_basic_one_time_test");
});

test("client cannot supply amount/price/discount/currency", () => {
  for (const key of ["amount", "currency", "price_id", "discount", "promoted_credit_id"]) {
    assert.ok(findUntrustedCheckoutBodyKeys({ plan_code: "basic", [key]: "evil" }).includes(key));
  }
});

test("plan purchase policy matrix", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  const nowIso = new Date().toISOString();

  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow(),
      requestedPlanCode: "premium",
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "starter", plan_status: "early_access", expires_at: null }),
      requestedPlanCode: "basic",
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "basic", plan_status: "active", expires_at: future }),
      requestedPlanCode: "basic",
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "basic", plan_status: "active", expires_at: future }),
      requestedPlanCode: "premium",
    }).allowed,
    false,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "premium", plan_status: "active", expires_at: future }),
      requestedPlanCode: "basic",
    }).allowed,
    false,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "basic", plan_status: "expired", expires_at: past }),
      requestedPlanCode: "premium",
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({
        plan_code: "basic",
        plan_status: "grace",
        expires_at: past,
        grace_until: future,
      }),
      requestedPlanCode: "premium",
    }).allowed,
    true,
  );
  assert.equal(
    evaluatePlanPurchasePolicy({
      currentPlan: planRow({ plan_code: "basic", plan_status: "cancelled", expires_at: past }),
      requestedPlanCode: "premium",
    }).allowed,
    true,
  );
  assert.equal(hasActivePaidPeriod({ expires_at: nowIso }), false);
});

test("customer creation failure marks order failed", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  billingHarness.customerShouldFail = true;

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, false);
  const row = billingHarness.planPayments[0];
  assert.equal(row.status, "failed");
  assert.equal(row.failure_code, "stripe_customer_failed");
});

test("coupon creation failure marks order failed", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  seedEligibleCredit();
  billingHarness.couponShouldFail = true;

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, false);
  assert.equal(billingHarness.planPayments[0].failure_code, "stripe_coupon_failed");
});

test("stale pending releases credit; fresh pending conflicts", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  seedEligibleCredit("credit-stale");
  const staleCreatedAt = new Date(
    Date.now() - (STALE_PENDING_RESERVATION_MINUTES + 1) * 60 * 1000,
  ).toISOString();
  billingHarness.planPayments.push({
    id: "pp-stale",
    specialist_id: "spec-1",
    promoted_credit_id: "credit-stale",
    status: "pending",
    created_at: staleCreatedAt,
    updated_at: staleCreatedAt,
  });

  const expiredCount = await expireStalePendingPlanPaymentReservations(
    serviceClient(),
    "credit-stale",
  );
  assert.equal(expiredCount, 1);
  assert.equal(billingHarness.planPayments[0].status, "expired");
  assert.ok(billingHarness.planPayments[0].expired_at);

  const ok = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });
  assert.equal(ok.ok, true);

  billingHarness.planPayments.push({
    id: "pp-fresh",
    specialist_id: "spec-1",
    promoted_credit_id: "credit-fresh",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  seedEligibleCredit("credit-fresh");

  const conflict = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.equal(conflict.reason, "promoted_credit_already_reserved");
});

test("feature flag false: legacy path only, no plan_payments in route", () => {
  const manualIdx = createCheckoutSrc.indexOf("if (manualRenewalEnabled)");
  const planPaymentCallIdx = createCheckoutSrc.indexOf("await createPlanPaymentCheckout");
  const legacyGuardIdx = createCheckoutSrc.indexOf("if (!paymentsEnabled)");
  assert.ok(manualIdx >= 0 && planPaymentCallIdx > manualIdx);
  assert.ok(legacyGuardIdx > planPaymentCallIdx);
  assert.doesNotMatch(createCheckoutSrc, /getPlanPaymentCheckoutReadiness/);
  assert.doesNotMatch(createCheckoutSrc, /getManualPlanPaymentConfig/);
  assert.match(stripeProviderSrc, /mode: "subscription"/);
  assert.doesNotMatch(routeSrc, /\.from\("plan_payments"\)/);
});

test("Stripe Price validation rejects recurring/wrong currency/amount/inactive", async () => {
  billingHarness.stripePriceOverrides["price_basic_one_time_test"] = {
    id: "price_basic_one_time_test",
    active: true,
    type: "recurring",
    currency: "eur",
    unit_amount: 2900,
  };
  let result = await validatePlanPaymentStripePrice({
    stripePriceId: "price_basic_one_time_test",
    planCode: "basic",
  });
  assert.equal(result.ok, false);

  billingHarness.stripePriceOverrides["price_basic_one_time_test"] = {
    id: "price_basic_one_time_test",
    active: true,
    type: "one_time",
    currency: "usd",
    unit_amount: 2900,
  };
  result = await validatePlanPaymentStripePrice({
    stripePriceId: "price_basic_one_time_test",
    planCode: "basic",
  });
  assert.equal(result.ok, false);

  billingHarness.stripePriceOverrides["price_basic_one_time_test"] = {
    id: "price_basic_one_time_test",
    active: true,
    type: "one_time",
    currency: "eur",
    unit_amount: 999,
  };
  result = await validatePlanPaymentStripePrice({
    stripePriceId: "price_basic_one_time_test",
    planCode: "basic",
  });
  assert.equal(result.ok, false);

  billingHarness.stripePriceOverrides["price_basic_one_time_test"] = {
    id: "price_basic_one_time_test",
    active: false,
    type: "one_time",
    currency: "eur",
    unit_amount: 2900,
  };
  result = await validatePlanPaymentStripePrice({
    stripePriceId: "price_basic_one_time_test",
    planCode: "basic",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.apiReason, "checkout_configuration_invalid");

  delete billingHarness.stripePriceOverrides["price_basic_one_time_test"];
  result = await validatePlanPaymentStripePrice({
    stripePriceId: "price_basic_one_time_test",
    planCode: "basic",
  });
  assert.equal(result.ok, true);
});

test("invalid Stripe Price marks order failed before session", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  billingHarness.stripePriceOverrides["price_basic_one_time_test"] = {
    id: "price_basic_one_time_test",
    active: true,
    type: "recurring",
    currency: "eur",
    unit_amount: 2900,
  };

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "checkout_configuration_invalid");
  assert.equal(billingHarness.planPayments[0].failure_code, "stripe_price_invalid");
  assert.equal(billingHarness.stripeSessions.length, 0);
});

test("orphan session: expire called, no URL returned, order failed", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  billingHarness.planPaymentUpdateError = { code: "PGRST500", message: "update failed" };

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "checkout_creation_failed");
  assert.ok(billingHarness.stripeExpiredSessionIds.length >= 1);
  assert.equal(billingHarness.planPayments[0].status, "failed");
  assert.equal(billingHarness.planPayments[0].failure_code, "db_update_failed");
});

test("expire failure does not expose raw error to client", async () => {
  resetBillingHarness();
  seedSpecialistPlan();
  billingHarness.planPaymentUpdateError = { code: "PGRST500", message: "update failed" };
  billingHarness.stripeExpireShouldFail = true;

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "basic",
    lang: "ua",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "checkout_creation_failed");
    assert.ok(!("message" in result));
  }
});

test("coupon params and checkout discount wiring", () => {
  const couponSrc = readFileSync(
    new URL("./createPlanPaymentCreditDiscount.ts", import.meta.url),
    "utf8",
  );
  assert.match(couponSrc, /amount_off: PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS/);
  assert.match(couponSrc, /duration: "once"/);
  assert.match(createSrc, /discounts = \[\{ coupon: discount\.couponId \}\]/);
});

test("missing one-time Price ID → payments_not_ready", () => {
  withEnv({ STRIPE_PRICE_BASIC_MONTHLY_ONE_TIME: undefined }, () => {
    const readiness = getPlanPaymentCheckoutReadiness("basic");
    assert.equal(readiness.ready, false);
    assert.ok(readiness.blockers.includes("one_time_price_missing"));
  });
});

test("security: no raw Stripe/Postgres objects logged in new billing files", () => {
  for (const src of [createSrc, validatePriceSrc]) {
    assert.doesNotMatch(src, /console\.(log|error|warn)\([^)]*session[^)]*\)/i);
    assert.doesNotMatch(src, /STRIPE_SECRET_KEY/);
    assert.doesNotMatch(src, /err instanceof Error/);
  }
});

test("success path pending → checkout_created", async () => {
  resetBillingHarness();
  seedSpecialistPlan();

  const result = await createPlanPaymentCheckout({
    supabase: serviceClient(),
    specialistId: "spec-1",
    userId: billingHarness.authUser.id,
    planCode: "premium",
    lang: "de",
    siteUrl: "https://freuly.de",
  });

  assert.equal(result.ok, true);
  assert.equal(billingHarness.planPayments[0].status, "checkout_created");
  assert.equal(billingHarness.stripeSessions[0].mode, "payment");
});

test("checkout module does not mutate specialist_plan", () => {
  assert.doesNotMatch(createSrc, /\.from\("specialist_plan"\)/);
});
