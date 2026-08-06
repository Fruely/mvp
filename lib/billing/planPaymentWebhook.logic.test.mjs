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

baseEnv();

test.beforeEach(() => {
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
});

test.afterEach(() => {
  if (savedManualRenewalFlag === undefined) {
    delete process.env.BILLING_MANUAL_RENEWAL_ENABLED;
  } else {
    process.env.BILLING_MANUAL_RENEWAL_ENABLED = savedManualRenewalFlag;
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
} = await import("./testMocks/promotedAccessWebhook.harness.mjs");

const {
  processStripeWebhookEventForPlanPayments,
  shouldFinishPlanPaymentDeferredWithoutHttpRetry,
  shouldRetryPlanPaymentWebhook,
} = await import("./processPlanPaymentWebhook.ts");
const {
  processStripeBillingWebhook,
  shouldFinishBillingEventDeferredWithoutHttpRetry,
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

function supabase() {
  return createWebhookMockServiceClient();
}

const CHARGE_TS = 1_700_000_000;
const EVENT_TS = 1_700_000_120;

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
