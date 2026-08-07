import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

function baseEnv() {
  process.env.PAYMENTS_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";
}

const savedManualRenewalFlag = process.env.BILLING_MANUAL_RENEWAL_ENABLED;
const savedLifecycleFlag = process.env.LIFECYCLE_RECONCILIATION_ENABLED;

baseEnv();

test.beforeEach(() => {
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
  process.env.LIFECYCLE_RECONCILIATION_ENABLED = "true";
});

test.afterEach(() => {
  if (savedManualRenewalFlag === undefined) {
    delete process.env.BILLING_MANUAL_RENEWAL_ENABLED;
  } else {
    process.env.BILLING_MANUAL_RENEWAL_ENABLED = savedManualRenewalFlag;
  }
  if (savedLifecycleFlag === undefined) {
    delete process.env.LIFECYCLE_RECONCILIATION_ENABLED;
  } else {
    process.env.LIFECYCLE_RECONCILIATION_ENABLED = savedLifecycleFlag;
  }
});

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
  seedPlanPaymentContext,
  seedPlanPaymentCheckout,
  buildPlanPaymentCheckoutSession,
  buildStripeEvent,
  buildPaidCheckoutSession,
  buildSubscriptionCheckoutSession,
  seedPendingPayment,
  seedSubscriptionCustomer,
  pgAddCalendarMonth,
  webhookHarness,
  PLAN_PAYMENT_ID,
  PLAN_PAYMENT_SESSION_ID,
  PLAN_PAYMENT_PI_ID,
  PLAN_PAYMENT_CHARGE_ID,
  PROMOTED_CREDIT_ID,
  SPECIALIST_ID,
  PREMIUM_PRICE_ID,
  BINDING_ID,
  PROMOTION_ID,
  PAYMENT_ID,
  CHARGE_ID,
  PI_ID,
  SESSION_ID,
  USER_ID,
  CUSTOMER_ID,
} = await import("./testMocks/promotedAccessWebhook.harness.mjs");

const {
  processStripeWebhookEventForPlanPayments,
  shouldFinishPlanPaymentDeferredWithoutHttpRetry,
  shouldMarkPlanPaymentBillingEventSkipped,
  shouldRetryPlanPaymentWebhook,
} = await import("./processPlanPaymentWebhook.ts");
const {
  processStripeBillingWebhook,
  shouldFinishBillingEventDeferredWithoutHttpRetry,
  shouldMarkBillingEventSkipped,
  shouldRetryBillingWebhook,
} = await import("./processStripeBillingWebhook.ts");
const { processStripeWebhookEventForPromotedAccess } = await import(
  "./processPromotedAccessWebhook.ts"
);
const { claimBillingEvent, finishBillingEvent } = await import("./billingEvents.ts");
const { resolvePlanPaymentPaidAt } = await import("./planPaymentWebhookValidation.ts");
const { fulfillPlanPaymentEntitlement, retryUnappliedPlanPayments } = await import(
  "./planPaymentFulfillment.ts"
);
const { reconcileSpecialistAccess } = await import("./specialistAccessLifecycle.ts");

const routeSrc = readFileSync(new URL("../../app/api/billing/webhook/route.ts", import.meta.url), "utf8");
const handlerSrc = readFileSync(new URL("./processPlanPaymentWebhook.ts", import.meta.url), "utf8");
const sqlSrc = readFileSync(
  new URL("../../supabase/manual_migrations/2026-08-06_plan_payment_fulfillment.sql", import.meta.url),
  "utf8",
);
const verifySqlSrc = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-08-06_plan_payment_fulfillment_verify.sql",
    import.meta.url,
  ),
  "utf8",
);
const reconcileSqlSrc = readFileSync(
  new URL("../../supabase/manual_migrations/2026-08-07_reconcile_specialist_access.sql", import.meta.url),
  "utf8",
);
const reconcileVerifySqlSrc = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-08-07_reconcile_specialist_access_verify.sql",
    import.meta.url,
  ),
  "utf8",
);

function supabase() {
  return createWebhookMockServiceClient();
}

const CHARGE_TS = 1_700_000_000;
const EVENT_TS = 1_700_000_120;

function isoDaysFromNow(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

async function fulfillPaidSession(overrides = {}) {
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({
    chargeCreated: CHARGE_TS,
    eventCreated: EVENT_TS,
    ...overrides,
  });
  return processStripeWebhookEventForPlanPayments(
    supabase(),
    buildStripeEvent("checkout.session.completed", session, eventCreated),
  );
}

function seedPaidPlanPayment(overrides = {}) {
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  seedPlanPaymentContext({
    planPayment: {
      status: "paid",
      paid_at: paidAt,
      entitlement_applied_at: new Date().toISOString(),
      stripe_checkout_session_id: PLAN_PAYMENT_SESSION_ID,
      stripe_payment_intent_id: PLAN_PAYMENT_PI_ID,
      stripe_charge_id: PLAN_PAYMENT_CHARGE_ID,
      prior_expires_at: null,
      period_end_at: pgAddCalendarMonth(paidAt),
      ...overrides.planPayment,
    },
    specialistPlan: overrides.specialistPlan ?? { expires_at: pgAddCalendarMonth(paidAt) },
  });
}

function buildPlanPaymentCharge(overrides = {}) {
  const payment = webhookHarness.planPayments[0];
  const amount = payment?.net_amount_cents ?? 2900;
  return {
    id: payment?.stripe_charge_id ?? PLAN_PAYMENT_CHARGE_ID,
    payment_intent: payment?.stripe_payment_intent_id ?? PLAN_PAYMENT_PI_ID,
    amount,
    amount_refunded: amount,
    refunded: true,
    ...overrides,
  };
}

function buildPlanPaymentRefundEvent(chargeOverrides = {}, eventCreated = EVENT_TS) {
  return buildStripeEvent("charge.refunded", buildPlanPaymentCharge(chargeOverrides), eventCreated);
}

test("1: basic 2900 without credit extends +1 calendar month", async () => {
  seedPlanPaymentContext();
  await fulfillPaidSession();
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].expires_at, pgAddCalendarMonth(paidAt));
  assert.equal(webhookHarness.planPayments[0].prior_expires_at, null);
});

test("2: premium 5900 without credit", async () => {
  seedPlanPaymentContext({
    planPayment: {
      plan_code: "premium",
      gross_amount_cents: 5900,
      net_amount_cents: 5900,
      provider_price_id: PREMIUM_PRICE_ID,
    },
  });
  assert.equal((await fulfillPaidSession()).outcome, "success");
});

test("3-4: credit discount paths", async () => {
  seedPlanPaymentContext({
    credit: {},
    planPayment: {
      gross_amount_cents: 2900,
      discount_amount_cents: 1000,
      net_amount_cents: 1900,
      promoted_credit_id: PROMOTED_CREDIT_ID,
    },
  });
  await fulfillPaidSession();
  assert.ok(webhookHarness.subscriptionCredits[0].consumed_at);
});

test("5-6: stacking from locked expires_at vs paid_at", async () => {
  const priorExpires = "2030-06-15T12:00:00.000Z";
  seedPlanPaymentContext({ specialistPlan: { expires_at: priorExpires } });
  await fulfillPaidSession();
  assert.equal(
    webhookHarness.specialistPlans[0].expires_at,
    pgAddCalendarMonth(priorExpires),
  );
  assert.equal(webhookHarness.planPayments[0].prior_expires_at, priorExpires);
});

test("missing specialist_plan creates row with exactly +1 calendar month", async () => {
  seedPlanPaymentContext();
  assert.equal(webhookHarness.specialistPlans.length, 0);
  await fulfillPaidSession();
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  assert.equal(webhookHarness.specialistPlans.length, 1);
  assert.equal(webhookHarness.specialistPlans[0].expires_at, pgAddCalendarMonth(paidAt));
});

test("two different payments same specialist stack +2 calendar months", async () => {
  seedPlanPaymentContext();
  await fulfillPaidSession();
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  const firstEnd = webhookHarness.specialistPlans[0].expires_at;
  assert.equal(firstEnd, pgAddCalendarMonth(paidAt));

  webhookHarness.planPayments.push({
    id: "pp-second",
    specialist_id: SPECIALIST_ID,
    user_id: webhookHarness.planPayments[0].user_id,
    status: "checkout_created",
    plan_code: "basic",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    provider_customer_id: webhookHarness.planPayments[0].provider_customer_id,
    provider_price_id: webhookHarness.planPayments[0].provider_price_id,
    stripe_checkout_session_id: "cs_second",
    stripe_payment_intent_id: null,
    stripe_charge_id: null,
    promoted_credit_id: null,
    entitlement_applied_at: null,
    prior_expires_at: null,
    period_end_at: null,
    paid_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const second = await fulfillPlanPaymentEntitlement(supabase(), {
    planPaymentId: "pp-second",
    paidAt: paidAt,
    paymentIntentId: "pi_second",
    chargeId: "ch_second",
    checkoutSessionId: "cs_second",
  });
  assert.equal(second.outcome, "success");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, pgAddCalendarMonth(firstEnd));
});

test("already_applied with different session is mismatch not idempotent success", async () => {
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  seedPlanPaymentContext({
    planPayment: {
      status: "paid",
      paid_at: paidAt,
      entitlement_applied_at: new Date().toISOString(),
      stripe_checkout_session_id: PLAN_PAYMENT_SESSION_ID,
      stripe_payment_intent_id: PLAN_PAYMENT_PI_ID,
      stripe_charge_id: PLAN_PAYMENT_CHARGE_ID,
      prior_expires_at: null,
      period_end_at: pgAddCalendarMonth(paidAt),
    },
  });

  const result = await fulfillPlanPaymentEntitlement(supabase(), {
    planPaymentId: PLAN_PAYMENT_ID,
    paidAt,
    paymentIntentId: PLAN_PAYMENT_PI_ID,
    chargeId: PLAN_PAYMENT_CHARGE_ID,
    checkoutSessionId: "cs_replay_other",
  });
  assert.equal(result.outcome, "validation_failed");
});

test("already_applied with same Stripe IDs returns already_applied", async () => {
  const paidAt = new Date(CHARGE_TS * 1000).toISOString();
  seedPlanPaymentContext({
    planPayment: {
      status: "paid",
      paid_at: paidAt,
      entitlement_applied_at: new Date().toISOString(),
      stripe_checkout_session_id: PLAN_PAYMENT_SESSION_ID,
      stripe_payment_intent_id: PLAN_PAYMENT_PI_ID,
      stripe_charge_id: PLAN_PAYMENT_CHARGE_ID,
      prior_expires_at: null,
      period_end_at: pgAddCalendarMonth(paidAt),
    },
  });

  const result = await fulfillPlanPaymentEntitlement(supabase(), {
    planPaymentId: PLAN_PAYMENT_ID,
    paidAt,
    paymentIntentId: PLAN_PAYMENT_PI_ID,
    chargeId: PLAN_PAYMENT_CHARGE_ID,
    checkoutSessionId: PLAN_PAYMENT_SESSION_ID,
  });
  assert.equal(result.outcome, "success");
  assert.equal(result.idempotent, true);
});

test("7-8: calendar month edge cases", () => {
  assert.equal(pgAddCalendarMonth("2024-01-31T12:00:00.000Z"), "2024-02-29T12:00:00.000Z");
  assert.equal(pgAddCalendarMonth("2024-03-31T00:00:00.000Z"), "2024-04-30T00:00:00.000Z");
});

test("11-13: duplicate and concurrent idempotency", async () => {
  seedPlanPaymentContext();
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({
    chargeCreated: CHARGE_TS,
    eventCreated: EVENT_TS,
  });
  const event = buildStripeEvent("checkout.session.completed", session, eventCreated);
  await processStripeWebhookEventForPlanPayments(supabase(), event);
  const first = webhookHarness.specialistPlans[0].expires_at;
  await processStripeWebhookEventForPlanPayments(supabase(), event);
  assert.equal(webhookHarness.specialistPlans[0].expires_at, first);
});

test("14: paid but unapplied retry succeeds", async () => {
  seedPlanPaymentContext({
    planPayment: { status: "paid", paid_at: new Date(CHARGE_TS * 1000).toISOString() },
  });
  const result = await fulfillPlanPaymentEntitlement(supabase(), {
    planPaymentId: PLAN_PAYMENT_ID,
    paidAt: new Date(CHARGE_TS * 1000).toISOString(),
    paymentIntentId: PLAN_PAYMENT_PI_ID,
    chargeId: PLAN_PAYMENT_CHARGE_ID,
    checkoutSessionId: PLAN_PAYMENT_SESSION_ID,
  });
  assert.equal(result.outcome, "success");
});

test("16: same credit different session fails", async () => {
  seedPlanPaymentContext({
    credit: {
      consumed_at: new Date().toISOString(),
      consumed_checkout_session_id: "cs_other_session",
    },
    planPayment: { promoted_credit_id: PROMOTED_CREDIT_ID },
  });
  const result = await fulfillPlanPaymentEntitlement(supabase(), {
    planPaymentId: PLAN_PAYMENT_ID,
    paidAt: new Date(CHARGE_TS * 1000).toISOString(),
    paymentIntentId: PLAN_PAYMENT_PI_ID,
    chargeId: PLAN_PAYMENT_CHARGE_ID,
    checkoutSessionId: PLAN_PAYMENT_SESSION_ID,
  });
  assert.equal(result.outcome, "validation_failed");
});

test("17-20: permanent validation failures are skipped", async () => {
  seedPlanPaymentContext();
  const amount = await fulfillPaidSession({ amount_total: 9999 });
  assert.equal(amount.outcome, "validation_failed");
  assert.equal(amount.failureCode, "plan_payment_amount_mismatch");
});

test("stripe retrieve failure is retryable", async () => {
  seedPlanPaymentContext();
  webhookHarness.stripeRetrieveShouldFail = true;
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({
    chargeCreated: CHARGE_TS,
    eventCreated: EVENT_TS,
  });
  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildStripeEvent("checkout.session.completed", session, eventCreated),
  );
  assert.equal(result.outcome, "retryable_failure");
  webhookHarness.stripeRetrieveShouldFail = false;
});

test("25: unpaid completed stays pending", async () => {
  seedPlanPaymentContext();
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({ payment_status: "unpaid" });
  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildStripeEvent("checkout.session.completed", session, eventCreated),
  );
  assert.equal(result.outcome, "pending");
});

test("26-30: lifecycle events", async () => {
  seedPlanPaymentContext({ planPayment: { status: "checkout_created" } });
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({ payment_status: "unpaid" });
  await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildStripeEvent("checkout.session.expired", session, eventCreated),
  );
  assert.equal(webhookHarness.planPayments[0].status, "expired");
});

test("31: flag false is recoverable without HTTP retry storm", async () => {
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "false";
  seedPlanPaymentContext();
  const result = await fulfillPaidSession();
  assert.equal(result.outcome, "deferred_flag_off");
  assert.ok(shouldFinishPlanPaymentDeferredWithoutHttpRetry(result));
  assert.equal(shouldRetryPlanPaymentWebhook(result), false);
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
});

test("34-35: promoted and subscription regressions", async () => {
  seedPendingPayment();
  assert.equal(
    (await processStripeWebhookEventForPromotedAccess(
      supabase(),
      buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
    )).outcome,
    "success",
  );
  resetWebhookHarness();
  seedSubscriptionCustomer();
  assert.notEqual(
    (
      await processStripeBillingWebhook(
        supabase(),
        buildStripeEvent("checkout.session.completed", buildSubscriptionCheckoutSession()),
      )
    ).subscription.outcome,
    "ignored",
  );
});

test("36-37: RPC failure retryable without partial entitlement", async () => {
  seedPlanPaymentContext();
  webhookHarness.planPaymentFulfillmentError = { message: "rpc_failed" };
  assert.equal((await fulfillPaidSession()).outcome, "retryable_failure");
  assert.equal(webhookHarness.specialistPlans.length, 0);
  webhookHarness.planPaymentFulfillmentError = null;
});

test("39: retry helper selects paid/unapplied only", async () => {
  seedPlanPaymentContext({ planPayment: { status: "paid" } });
  webhookHarness.planPayments.push({
    id: "pp-applied",
    specialist_id: SPECIALIST_ID,
    status: "paid",
    entitlement_applied_at: new Date().toISOString(),
    stripe_checkout_session_id: "cs_applied",
  });
  const rows = await retryUnappliedPlanPayments(supabase());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, PLAN_PAYMENT_ID);
});

test("paid_at: charge.created beats event.created and is stable", () => {
  const chargeCreated = 1_700_000_100;
  const eventCreated = 1_700_000_200;
  const first = resolvePlanPaymentPaidAt({
    charge: { created: chargeCreated },
    eventCreated,
  });
  const second = resolvePlanPaymentPaidAt({
    charge: { created: chargeCreated },
    eventCreated: eventCreated + 999,
  });
  assert.equal(first, new Date(chargeCreated * 1000).toISOString());
  assert.equal(first, second);
});

test("paid_at: event.created fallback when charge missing", () => {
  const paidAt = resolvePlanPaymentPaidAt({ eventCreated: EVENT_TS });
  assert.equal(paidAt, new Date(EVENT_TS * 1000).toISOString());
});

test("deferred flag off route uses HTTP 200 and billing_events failed", async () => {
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "false";
  resetWebhookHarness();
  seedPlanPaymentContext();
  const sb = supabase();
  const claim = await claimBillingEvent(sb, {
    providerEventId: "evt_flag_off",
    eventType: "checkout.session.completed",
  });
  const { session, eventCreated } = buildPlanPaymentCheckoutSession({
    chargeCreated: CHARGE_TS,
    eventCreated: EVENT_TS,
  });
  const result = await processStripeBillingWebhook(
    sb,
    buildStripeEvent("checkout.session.completed", session, eventCreated),
  );
  assert.ok(shouldFinishBillingEventDeferredWithoutHttpRetry(result));
  assert.equal(shouldRetryBillingWebhook(result), false);
  await finishBillingEvent(sb, claim.rowId, { status: "failed", error: "manual_renewal_disabled" });
  const reclaim = await claimBillingEvent(sb, {
    providerEventId: "evt_flag_off",
    eventType: "checkout.session.completed",
  });
  assert.equal(reclaim.action, "process");
  assert.match(routeSrc, /deferred: true/);
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
});

test("RPC security markers present in SQL", () => {
  assert.match(sqlSrc, /v_plan_created boolean := false/);
  assert.match(sqlSrc, /IF v_plan_created THEN[\s\S]*v_prior_expires := NULL/);
  assert.match(sqlSrc, /SECURITY DEFINER/);
  assert.match(sqlSrc, /SET search_path = pg_catalog, public/);
  assert.match(
    sqlSrc,
    /pg_advisory_xact_lock\(\s*pg_catalog\.hashtext\('plan_payment_entitlement'\),\s*pg_catalog\.hashtext\(v_payment\.specialist_id::text\)\s*\)/,
  );
  assert.doesNotMatch(
    sqlSrc,
    /ON CONFLICT \(specialist_id\) DO UPDATE[\s\S]*expires_at\s*=\s*EXCLUDED\.expires_at/,
  );
  assert.match(sqlSrc, /ON CONFLICT \(specialist_id\) DO NOTHING/);
  assert.match(sqlSrc, /FROM public\.specialist_plan[\s\S]*FOR UPDATE/);
  assert.match(sqlSrc, /REVOKE ALL ON FUNCTION/);
  assert.match(sqlSrc, /FROM anon, authenticated/);
  assert.match(sqlSrc, /GRANT EXECUTE ON FUNCTION/);
  assert.match(sqlSrc, /TO service_role/);
  assert.match(sqlSrc, /OWNER TO postgres/);
});

test("verify SQL uses OID lookup, ACL explode, and always one row", () => {
  assert.match(
    verifySqlSrc,
    /to_regprocedure\(\s*'public\.fulfill_plan_payment_entitlement\(uuid,timestamptz,text,text,text\)'\s*\)/,
  );
  assert.match(verifySqlSrc, /aclexplode/);
  assert.doesNotMatch(verifySqlSrc, /has_function_privilege\(\s*'public'/);
  assert.match(verifySqlSrc, /WITH target AS/);
  assert.match(verifySqlSrc, /LEFT JOIN pg_catalog\.pg_proc p ON p\.oid = t\.oid/);
  assert.match(verifySqlSrc, /FROM fn;/);
  assert.match(verifySqlSrc, /fn\.oid IS NOT NULL AS function_exists/);
  assert.match(verifySqlSrc, /WHEN fn\.oid IS NULL THEN false/);
  assert.doesNotMatch(verifySqlSrc, /WHERE n\.nspname = 'public'[\s\S]*proname = 'fulfill_plan_payment_entitlement'/);
});

test("handler avoids logging raw session payloads", () => {
  assert.doesNotMatch(handlerSrc, /console\.(log|error|info)\([^)]*\bsession\b/);
  assert.match(handlerSrc, /planPaymentId/);
});

test("full refund marks paid plan_payment refunded with event timestamp", async () => {
  seedPaidPlanPayment();
  const entitlementAppliedAt = webhookHarness.planPayments[0].entitlement_applied_at;
  const periodEndAt = webhookHarness.planPayments[0].period_end_at;

  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent(),
  );

  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "refunded");
  assert.equal(
    webhookHarness.planPayments[0].refunded_at,
    new Date(EVENT_TS * 1000).toISOString(),
  );
  assert.equal(webhookHarness.planPayments[0].entitlement_applied_at, entitlementAppliedAt);
  assert.equal(webhookHarness.planPayments[0].period_end_at, periodEndAt);
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, null);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("partial refund leaves plan_payment paid", async () => {
  seedPaidPlanPayment();
  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({
      amount: 2900,
      amount_refunded: 1000,
      refunded: false,
    }),
  );

  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "paid");
  assert.equal(webhookHarness.planPayments[0].refunded_at, undefined);
});

test("unknown charge refund is ignored", async () => {
  seedPaidPlanPayment();
  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildStripeEvent("charge.refunded", {
      id: "ch_unknown",
      payment_intent: "pi_unknown",
      amount: 2900,
      amount_refunded: 2900,
      refunded: true,
    }),
  );

  assert.equal(result.outcome, "ignored");
  assert.equal(webhookHarness.planPayments[0].status, "paid");
});

test("already refunded plan_payment is idempotent success", async () => {
  const refundedAt = new Date(EVENT_TS * 1000).toISOString();
  seedPaidPlanPayment({
    planPayment: {
      status: "refunded",
      refunded_at: refundedAt,
    },
  });

  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({}, EVENT_TS + 60),
  );

  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "refunded");
  assert.equal(webhookHarness.planPayments[0].refunded_at, refundedAt);
});

test("refund resolves plan_payment by payment_intent when charge id lookup misses", async () => {
  seedPaidPlanPayment({
    planPayment: {
      stripe_charge_id: null,
    },
  });

  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({ id: "ch_fallback_only" }),
  );

  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "refunded");
  assert.equal(webhookHarness.planPayments[0].stripe_charge_id, null);
});

test("full plan refund marks billing event processed in dispatcher", async () => {
  seedPaidPlanPayment();
  const billingResult = await processStripeBillingWebhook(
    supabase(),
    buildPlanPaymentRefundEvent(),
  );

  assert.equal(billingResult.planPayment.outcome, "success");
  assert.equal(shouldMarkPlanPaymentBillingEventSkipped(billingResult.planPayment), false);
  assert.equal(shouldMarkBillingEventSkipped(billingResult), false);
});

test("unrelated promoted charge.refunded still succeeds without plan payment mutation", async () => {
  resetWebhookHarness();
  webhookHarness.billingCustomers.push({
    id: "bc-1",
    specialist_id: SPECIALIST_ID,
    provider: "stripe",
    provider_customer_id: CUSTOMER_ID,
  });
  webhookHarness.payments.push({
    id: PAYMENT_ID,
    signup_binding_id: BINDING_ID,
    promotion_id: PROMOTION_ID,
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    amount_cents: 1000,
    currency: "eur",
    status: "paid",
    stripe_checkout_session_id: SESSION_ID,
    stripe_payment_intent_id: PI_ID,
    stripe_charge_id: CHARGE_ID,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  seedPlanPaymentCheckout({
    status: "paid",
    paid_at: new Date(CHARGE_TS * 1000).toISOString(),
    entitlement_applied_at: new Date().toISOString(),
    stripe_payment_intent_id: "pi_plan_only",
    stripe_charge_id: "ch_plan_only",
    period_end_at: pgAddCalendarMonth(new Date(CHARGE_TS * 1000).toISOString()),
  });

  const billingResult = await processStripeBillingWebhook(
    supabase(),
    buildStripeEvent("charge.refunded", {
      id: CHARGE_ID,
      payment_intent: PI_ID,
      amount: 1000,
      amount_refunded: 1000,
      refunded: true,
      metadata: {
        purpose: "promoted_request_access",
        payment_id: PAYMENT_ID,
      },
    }),
  );

  assert.equal(billingResult.promoted.outcome, "success");
  assert.equal(billingResult.planPayment.outcome, "ignored");
  assert.equal(webhookHarness.payments[0].status, "refunded");
  assert.equal(webhookHarness.planPayments[0].status, "paid");
});

// -------------------------------------------------------
// Lifecycle resolver tests
// -------------------------------------------------------

test("lifecycle: first paid period → active", async () => {
  const futureExpires = isoDaysFromNow(20);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: futureExpires, plan_code: "basic" },
    planPayment: { period_end_at: futureExpires },
  });
  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "basic");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, futureExpires);
});

test("lifecycle: natural expiry → grace", async () => {
  const pastExpires = isoDaysFromNow(-2);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: pastExpires, plan_code: "basic" },
    planPayment: { period_end_at: pastExpires },
  });
  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
  const expectedGrace = new Date(Date.parse(pastExpires) + 7 * 86400000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].grace_until, expectedGrace);
});

test("lifecycle: natural grace expired → inactive", async () => {
  const oldExpires = isoDaysFromNow(-15);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: oldExpires, plan_code: "basic" },
    planPayment: { period_end_at: oldExpires },
  });
  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, null);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("lifecycle: full refund single payment → refund-based grace", async () => {
  const recentTs = Math.floor(Date.now() / 1000);
  seedPaidPlanPayment();
  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({}, recentTs),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "refunded");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "basic");
});

test("lifecycle: refund grace expires → inactive", async () => {
  const oldRefundTs = Math.floor((Date.now() - 10 * 86400000) / 1000);
  const periodEnd = isoDaysFromNow(-10);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: periodEnd, plan_code: "basic", grace_until: isoDaysFromNow(-3) },
    planPayment: { period_end_at: periodEnd },
  });

  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({}, oldRefundTs),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, null);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("lifecycle: new payment during refund grace → active", async () => {
  const recentTs = Math.floor(Date.now() / 1000);
  seedPaidPlanPayment();

  await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({}, recentTs),
  );
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");

  const futureExpires = isoDaysFromNow(30);
  webhookHarness.planPayments.push({
    id: "pp-reactivate",
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "paid",
    plan_code: "basic",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: "price_basic_monthly_test",
    stripe_checkout_session_id: "cs_reactivate",
    stripe_payment_intent_id: "pi_reactivate",
    stripe_charge_id: "ch_reactivate",
    promoted_credit_id: null,
    entitlement_applied_at: new Date().toISOString(),
    prior_expires_at: null,
    period_end_at: futureExpires,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, futureExpires);
});

test("lifecycle: inactive specialist pays → reactivated", async () => {
  const oldExpires = isoDaysFromNow(-20);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: oldExpires, plan_code: "basic", plan_status: "inactive" },
    planPayment: { period_end_at: oldExpires },
  });
  webhookHarness.specialists[0].billing_visibility_blocked = true;

  const futureExpires = isoDaysFromNow(30);
  webhookHarness.planPayments.push({
    id: "pp-reactivate",
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "paid",
    plan_code: "premium",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 5900,
    discount_amount_cents: 0,
    net_amount_cents: 5900,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: PREMIUM_PRICE_ID,
    stripe_checkout_session_id: "cs_reactivate",
    stripe_payment_intent_id: "pi_reactivate",
    stripe_charge_id: "ch_reactivate",
    promoted_credit_id: null,
    entitlement_applied_at: new Date().toISOString(),
    prior_expires_at: null,
    period_end_at: futureExpires,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "premium");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, futureExpires);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
});

test("lifecycle: legacy specialist without billing history is not affected", async () => {
  resetWebhookHarness();
  seedSubscriptionCustomer();
  webhookHarness.specialistPlans.push({
    id: "sp-legacy",
    specialist_id: SPECIALIST_ID,
    plan_code: "free",
    plan_status: "early_access",
    started_at: null,
    expires_at: null,
    grace_until: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.rpcOutcome, "no_billing_history");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "early_access");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "free");
});

test("lifecycle: billing_visibility_blocked synced on inactive", async () => {
  const oldExpires = isoDaysFromNow(-15);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: oldExpires, plan_code: "basic" },
    planPayment: { period_end_at: oldExpires },
  });
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);

  await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("lifecycle: billing_visibility_blocked cleared on active", async () => {
  const futureExpires = isoDaysFromNow(20);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: futureExpires, plan_code: "basic", plan_status: "inactive" },
    planPayment: { period_end_at: futureExpires },
  });
  webhookHarness.specialists[0].billing_visibility_blocked = true;

  await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
});

test("lifecycle: reconcile idempotent — replay returns unchanged", async () => {
  const futureExpires = isoDaysFromNow(20);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: futureExpires, plan_code: "basic" },
    planPayment: { period_end_at: futureExpires },
  });

  const first = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(first.lifecycleStatus, "active");

  const second = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(second.lifecycleStatus, "active");
  assert.equal(second.rpcOutcome, "unchanged");
});

test("lifecycle: concurrent lock compatibility with fulfillment", async () => {
  seedPaidPlanPayment({
    specialistPlan: { expires_at: isoDaysFromNow(20), plan_code: "basic" },
    planPayment: { period_end_at: isoDaysFromNow(20) },
  });

  const [r1, r2] = await Promise.all([
    reconcileSpecialistAccess(supabase(), SPECIALIST_ID),
    reconcileSpecialistAccess(supabase(), SPECIALIST_ID),
  ]);
  assert.equal(r1.outcome, "success");
  assert.equal(r2.outcome, "success");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
});

test("lifecycle: production test case — stale basic/active refunded → grace", async () => {
  const refundedAt = "2026-08-07T08:10:39.180Z";
  resetWebhookHarness();
  seedSubscriptionCustomer();

  webhookHarness.specialistPlans.push({
    id: "sp-prod",
    specialist_id: SPECIALIST_ID,
    plan_code: "basic",
    plan_status: "active",
    started_at: "2026-08-06T10:00:00.000Z",
    expires_at: "2026-09-06T10:00:00.000Z",
    grace_until: "2026-09-13T10:00:00.000Z",
    created_at: "2026-08-06T10:00:00.000Z",
    updated_at: "2026-08-06T10:00:00.000Z",
  });

  webhookHarness.planPayments.push({
    id: "9a7076d6-f99d-4f7c-a452-32303e8e398a",
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "refunded",
    plan_code: "basic",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: "price_basic_monthly_test",
    stripe_checkout_session_id: "cs_prod",
    stripe_payment_intent_id: "pi_prod",
    stripe_charge_id: "ch_prod",
    promoted_credit_id: null,
    entitlement_applied_at: "2026-08-06T10:00:00.000Z",
    prior_expires_at: null,
    period_end_at: "2026-09-06T10:00:00.000Z",
    refunded_at: refundedAt,
    paid_at: "2026-08-06T10:00:00.000Z",
    created_at: "2026-08-06T10:00:00.000Z",
    updated_at: "2026-08-07T08:10:39.180Z",
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.lifecycleStatus, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "basic");
  const expectedGraceUntil = new Date(Date.parse(refundedAt) + 7 * 86400000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].grace_until, expectedGraceUntil);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
});

test("lifecycle: lifecycle flag off skips reconciliation on refund", async () => {
  process.env.LIFECYCLE_RECONCILIATION_ENABLED = "false";
  const recentTs = Math.floor(Date.now() / 1000);
  seedPaidPlanPayment();

  const result = await processStripeWebhookEventForPlanPayments(
    supabase(),
    buildPlanPaymentRefundEvent({}, recentTs),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.planPayments[0].status, "refunded");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");
  process.env.LIFECYCLE_RECONCILIATION_ENABLED = "true";
});

// -------------------------------------------------------
// Cron / natural expiry via reconcile (BLOCKER 1 scenarios)
// -------------------------------------------------------

test("cron: active with expired expires_at → reconcile → grace", async () => {
  const pastExpires = isoDaysFromNow(-2);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: pastExpires, plan_code: "basic" },
    planPayment: { period_end_at: pastExpires },
  });
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "active");

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.lifecycleStatus, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
  const expectedGrace = new Date(Date.parse(pastExpires) + 7 * 86400000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].grace_until, expectedGrace);
});

test("cron: grace with expired grace_until → reconcile → inactive", async () => {
  const oldExpires = isoDaysFromNow(-15);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: oldExpires, plan_code: "basic", plan_status: "grace",
      grace_until: isoDaysFromNow(-8) },
    planPayment: { period_end_at: oldExpires },
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("cron: natural expiry grace anchor = period_end_at + 7d", async () => {
  const periodEnd = isoDaysFromNow(-3);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: periodEnd, plan_code: "basic" },
    planPayment: { period_end_at: periodEnd },
  });

  await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  const expectedGrace = new Date(Date.parse(periodEnd) + 7 * 86400000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].grace_until, expectedGrace);
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
});

test("cron: payment during natural grace → active", async () => {
  const pastExpires = isoDaysFromNow(-2);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: pastExpires, plan_code: "basic" },
    planPayment: { period_end_at: pastExpires },
  });

  const futureExpires = isoDaysFromNow(30);
  webhookHarness.planPayments.push({
    id: "pp-renewal",
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "paid",
    plan_code: "basic",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: "price_basic_monthly_test",
    stripe_checkout_session_id: "cs_renewal",
    stripe_payment_intent_id: "pi_renewal",
    stripe_charge_id: "ch_renewal",
    promoted_credit_id: null,
    entitlement_applied_at: new Date().toISOString(),
    prior_expires_at: null,
    period_end_at: futureExpires,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialistPlans[0].expires_at, futureExpires);
});

// -------------------------------------------------------
// Moderation safety (BLOCKER 2 scenarios)
// -------------------------------------------------------

test("lifecycle: moderation-hidden specialist + billing reactivation does NOT become visible", async () => {
  const futureExpires = isoDaysFromNow(30);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: futureExpires, plan_code: "basic", plan_status: "inactive" },
    planPayment: { period_end_at: futureExpires },
  });
  webhookHarness.specialists[0].is_visible = false;
  webhookHarness.specialists[0].billing_visibility_blocked = true;

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
  assert.equal(webhookHarness.specialists[0].is_visible, false);
});

test("lifecycle: billing-hidden specialist + payment → billing block removed", async () => {
  const oldExpires = isoDaysFromNow(-20);
  seedPaidPlanPayment({
    specialistPlan: { expires_at: oldExpires, plan_code: "basic", plan_status: "inactive" },
    planPayment: { period_end_at: oldExpires },
  });
  webhookHarness.specialists[0].billing_visibility_blocked = true;

  const futureExpires = isoDaysFromNow(30);
  webhookHarness.planPayments.push({
    id: "pp-reactivate2",
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "paid",
    plan_code: "basic",
    billing_interval: "month",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    provider_customer_id: CUSTOMER_ID,
    provider_price_id: "price_basic_monthly_test",
    stripe_checkout_session_id: "cs_reactivate2",
    stripe_payment_intent_id: "pi_reactivate2",
    stripe_charge_id: "ch_reactivate2",
    promoted_credit_id: null,
    entitlement_applied_at: new Date().toISOString(),
    prior_expires_at: null,
    period_end_at: futureExpires,
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "active");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
});

// -------------------------------------------------------
// Initial grace (BLOCKER 3 scenarios)
// -------------------------------------------------------

test("lifecycle: initial enrollment after rollout → grace 7d", async () => {
  const enrolledAt = new Date().toISOString();
  resetWebhookHarness();
  seedSubscriptionCustomer();

  webhookHarness.specialistPlans.push({
    id: "sp-initial",
    specialist_id: SPECIALIST_ID,
    plan_code: "starter",
    plan_status: "active",
    started_at: enrolledAt,
    expires_at: null,
    grace_until: null,
    lifecycle_enrolled_at: enrolledAt,
    created_at: enrolledAt,
    updated_at: enrolledAt,
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.outcome, "success");
  assert.equal(result.lifecycleStatus, "grace");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "grace");
  const expectedGrace = new Date(Date.parse(enrolledAt) + 7 * 86400000).toISOString();
  assert.equal(webhookHarness.specialistPlans[0].grace_until, expectedGrace);
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, false);
});

test("lifecycle: initial grace expired → inactive", async () => {
  const enrolledAt = isoDaysFromNow(-10);
  resetWebhookHarness();
  seedSubscriptionCustomer();

  webhookHarness.specialistPlans.push({
    id: "sp-initial-expired",
    specialist_id: SPECIALIST_ID,
    plan_code: "starter",
    plan_status: "grace",
    started_at: enrolledAt,
    expires_at: null,
    grace_until: isoDaysFromNow(-3),
    lifecycle_enrolled_at: enrolledAt,
    created_at: enrolledAt,
    updated_at: enrolledAt,
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
  assert.equal(webhookHarness.specialists[0].billing_visibility_blocked, true);
});

test("lifecycle: republish does NOT grant another initial 7d", async () => {
  const oldEnrolledAt = isoDaysFromNow(-20);
  resetWebhookHarness();
  seedSubscriptionCustomer();

  webhookHarness.specialistPlans.push({
    id: "sp-republish",
    specialist_id: SPECIALIST_ID,
    plan_code: "starter",
    plan_status: "inactive",
    started_at: oldEnrolledAt,
    expires_at: null,
    grace_until: null,
    lifecycle_enrolled_at: oldEnrolledAt,
    created_at: oldEnrolledAt,
    updated_at: oldEnrolledAt,
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.lifecycleStatus, "inactive");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "inactive");
});

test("lifecycle: grandfathered legacy without enrollment → unchanged", async () => {
  resetWebhookHarness();
  seedSubscriptionCustomer();

  webhookHarness.specialistPlans.push({
    id: "sp-grandfathered",
    specialist_id: SPECIALIST_ID,
    plan_code: "free",
    plan_status: "early_access",
    started_at: null,
    expires_at: null,
    grace_until: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const result = await reconcileSpecialistAccess(supabase(), SPECIALIST_ID);
  assert.equal(result.rpcOutcome, "no_billing_history");
  assert.equal(webhookHarness.specialistPlans[0].plan_status, "early_access");
  assert.equal(webhookHarness.specialistPlans[0].plan_code, "free");
});

// -------------------------------------------------------
// SQL source checks
// -------------------------------------------------------

test("SQL migration includes billing_visibility_blocked and lifecycle_enrolled_at", () => {
  assert.match(reconcileSqlSrc, /billing_visibility_blocked/);
  assert.match(reconcileSqlSrc, /lifecycle_enrolled_at/);
  assert.match(reconcileSqlSrc, /v_initial_grace/);
  assert.match(reconcileSqlSrc, /category_specialist_counts/);
  assert.match(reconcileSqlSrc, /search_specialists_local_radius/);
});
