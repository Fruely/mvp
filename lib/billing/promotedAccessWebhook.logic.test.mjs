import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

process.env.PAYMENTS_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
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
  seedPendingPayment,
  buildPaidCheckoutSession,
  buildStripeEvent,
  PAYMENT_ID,
  SPECIALIST_ID,
  PROMOTION_ID,
  BINDING_ID,
  SESSION_ID,
  PI_ID,
  CHARGE_ID,
  webhookHarness,
} = await import("./testMocks/promotedAccessWebhook.harness.mjs");

const { validateCheckoutSessionForPaidPayment } = await import(
  "./promotedAccessWebhookValidation.ts"
);
const { processStripeWebhookEventForPromotedAccess } = await import(
  "./processPromotedAccessWebhook.ts"
);
const { processStripeBillingWebhook, shouldRetryBillingWebhook } = await import(
  "./processStripeBillingWebhook.ts"
);
const { claimBillingEvent } = await import("./billingEvents.ts");

const routeSrc = readFileSync(
  new URL("../../app/api/billing/webhook/route.ts", import.meta.url),
  "utf8",
);
const orchestratorSrc = readFileSync(
  new URL("./processStripeBillingWebhook.ts", import.meta.url),
  "utf8",
);
const partnerSrc = readFileSync(
  new URL("./processStripePartnerWebhook.ts", import.meta.url),
  "utf8",
);
const fulfillmentSrc = readFileSync(
  new URL("./promotedAccessFulfillment.ts", import.meta.url),
  "utf8",
);

function supabase() {
  return createWebhookMockServiceClient();
}

test("A: invalid signature rejected before processing", () => {
  assert.match(routeSrc, /constructEvent/);
  assert.match(routeSrc, /invalid_signature/);
  assert.match(routeSrc, /request\.text\(\)/);
  const constructUse = routeSrc.indexOf("stripe.webhooks.constructEvent");
  const claimUse = routeSrc.indexOf("claim = await claimBillingEvent");
  assert.ok(constructUse > 0 && claimUse > constructUse);
});

test("B: irrelevant Stripe event safely ignored", async () => {
  resetWebhookHarness();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("customer.updated", { id: "cus_x" }),
  );
  assert.equal(result.outcome, "ignored");
});

test("C-E: partner invoice events remain wired in orchestrator", () => {
  assert.match(orchestratorSrc, /processStripeWebhookEventForPartners/);
  assert.match(partnerSrc, /invoice\.paid/);
  assert.match(partnerSrc, /invoice\.payment_succeeded/);
});

test("D: existing partner refund/dispute reversal remains working", () => {
  assert.match(partnerSrc, /charge\.refunded/);
  assert.match(partnerSrc, /charge\.dispute\.created/);
  assert.match(partnerSrc, /reversePartnerCommissionForCharge/);
});

test("E: completed payment session with payment_status=paid processed", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "paid");
  assert.equal(webhookHarness.accessGrants.length, 1);
  assert.equal(webhookHarness.subscriptionCredits.length, 1);
});

test("F: completed session with unpaid status grants nothing", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({ payment_status: "unpaid" }),
    ),
  );
  assert.equal(result.outcome, "pending");
  assert.equal(webhookHarness.payments[0].status, "pending");
  assert.equal(webhookHarness.accessGrants.length, 0);
});

test("G: async_payment_succeeded processed", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.async_payment_succeeded",
      buildPaidCheckoutSession(),
    ),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "paid");
});

test("H: async_payment_failed marks failed", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.async_payment_failed", {
      id: SESSION_ID,
      metadata: {
        purpose: "promoted_request_access",
        payment_id: PAYMENT_ID,
      },
    }),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "failed");
  assert.ok(webhookHarness.payments[0].failed_at);
});

test("I: expired session marks expired", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.expired", {
      id: SESSION_ID,
      metadata: {
        purpose: "promoted_request_access",
        payment_id: PAYMENT_ID,
      },
    }),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "expired");
});

test("J: payment row resolved by metadata.payment_id", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(webhookHarness.payments[0].id, PAYMENT_ID);
});

test("K: wrong purpose ignored safely", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({
        metadata: { purpose: "other", payment_id: PAYMENT_ID },
      }),
    ),
  );
  assert.equal(result.outcome, "ignored");
});

test("L: unknown payment id grants nothing", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({
        metadata: {
          purpose: "promoted_request_access",
          payment_id: "00000000-0000-0000-0000-000000000099",
        },
      }),
    ),
  );
  assert.equal(result.outcome, "validation_failed");
  assert.equal(webhookHarness.accessGrants.length, 0);
});

test("M: session id mismatch grants nothing", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({ id: "cs_wrong" }),
    ),
  );
  assert.equal(result.outcome, "validation_failed");
});

test("N: mode not payment grants nothing", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({ mode: "subscription" }),
    ),
  );
  assert.equal(result.outcome, "validation_failed");
});

test("O-P: amount/currency mismatch grants nothing", async () => {
  seedPendingPayment();
  const badAmount = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({ amount_total: 900 }),
    ),
  );
  assert.equal(badAmount.outcome, "validation_failed");

  seedPendingPayment();
  const badCurrency = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({ currency: "usd" }),
    ),
  );
  assert.equal(badCurrency.outcome, "validation_failed");
});

test("Q: metadata context mismatch grants nothing", async () => {
  seedPendingPayment();
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent(
      "checkout.session.completed",
      buildPaidCheckoutSession({
        metadata: {
          purpose: "promoted_request_access",
          payment_id: PAYMENT_ID,
          specialist_id: "wrong-specialist",
        },
      }),
    ),
  );
  assert.equal(result.outcome, "validation_failed");
});

test("R-S: PaymentIntent and Charge ids stored", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(webhookHarness.payments[0].stripe_payment_intent_id, PI_ID);
  assert.equal(webhookHarness.payments[0].stripe_charge_id, CHARGE_ID);
});

test("T: paid_at set once", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const paidAt = webhookHarness.payments[0].paid_at;
  assert.ok(paidAt);
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(webhookHarness.payments[0].paid_at, paidAt);
});

test("U: payment identity/amount/context not mutated", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const payment = webhookHarness.payments[0];
  assert.equal(payment.amount_cents, 1000);
  assert.equal(payment.currency, "eur");
  assert.equal(payment.specialist_id, SPECIALIST_ID);
  assert.equal(payment.promotion_id, PROMOTION_ID);
  assert.equal(payment.signup_binding_id, BINDING_ID);
});

test("V-W: access grant created after confirmed paid event with DB values", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const grant = webhookHarness.accessGrants[0];
  assert.equal(grant.source_type, "payment");
  assert.equal(grant.source_payment_id, PAYMENT_ID);
  assert.equal(grant.specialist_id, SPECIALIST_ID);
  assert.equal(grant.promotion_id, PROMOTION_ID);
  assert.equal(grant.revoked_at, null);
});

test("X-Z: credit created with 1000 eur and eligible_until +7 days", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const credit = webhookHarness.subscriptionCredits[0];
  assert.equal(credit.credit_cents, 1000);
  assert.equal(credit.currency, "eur");
  assert.equal(credit.source_payment_id, PAYMENT_ID);
  const paidAt = new Date(webhookHarness.payments[0].paid_at).getTime();
  const eligibleUntil = new Date(credit.eligible_until).getTime();
  assert.equal(eligibleUntil - paidAt, 7 * 24 * 60 * 60 * 1000);
});

test("AA-AC: duplicate completed/access/credit events idempotent", async () => {
  seedPendingPayment();
  const event = buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession());
  await processStripeWebhookEventForPromotedAccess(supabase(), event);
  const result = await processStripeWebhookEventForPromotedAccess(supabase(), event);
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.accessGrants.length, 1);
  assert.equal(webhookHarness.subscriptionCredits.length, 1);
});

test("AD: partial failure remains retryable", async () => {
  seedPendingPayment();
  webhookHarness.nextGrantInsertFailsOnce = true;
  const first = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(first.outcome, "retryable_failure");
  assert.equal(webhookHarness.payments[0].status, "paid");
  assert.equal(webhookHarness.accessGrants.length, 0);

  const second = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(second.outcome, "success");
  assert.equal(webhookHarness.accessGrants.length, 1);
});

test("AE: success redirect plays no role", () => {
  assert.doesNotMatch(fulfillmentSrc, /success_url/);
  assert.doesNotMatch(routeSrc, /promoted_checkout=success/);
});

test("AF-AG: refund marks payment refunded and revokes payment-sourced access", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("charge.refunded", {
      id: CHARGE_ID,
      payment_intent: PI_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "refunded");
  assert.ok(webhookHarness.accessGrants[0].revoked_at);
  assert.equal(webhookHarness.accessGrants[0].revoke_reason, "refund");
});

test("AH: refund does not revoke subscription-sourced access", async () => {
  seedPendingPayment({ status: "paid", paid_at: new Date().toISOString(), stripe_payment_intent_id: PI_ID, stripe_charge_id: CHARGE_ID });
  webhookHarness.accessGrants.push({
    id: "grant-sub",
    specialist_id: SPECIALIST_ID,
    promotion_id: PROMOTION_ID,
    source_type: "subscription",
    source_payment_id: null,
    granted_at: new Date().toISOString(),
    revoked_at: null,
    revoke_reason: null,
  });
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("charge.refunded", {
      id: CHARGE_ID,
      payment_intent: PI_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(webhookHarness.accessGrants[0].revoked_at, null);
});

test("AI-AJ: dispute marks payment disputed and revokes payment-sourced access", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("charge.dispute.created", {
      id: CHARGE_ID,
      payment_intent: PI_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "disputed");
  assert.equal(webhookHarness.accessGrants[0].revoke_reason, "dispute");
});

test("AK: refund/dispute does not delete rows", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("charge.refunded", {
      id: CHARGE_ID,
      payment_intent: PI_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(webhookHarness.payments.length, 1);
  assert.equal(webhookHarness.accessGrants.length, 1);
  assert.equal(webhookHarness.subscriptionCredits.length, 1);
});

test("AL: refunded payment cannot be restored by duplicate success", async () => {
  seedPendingPayment({
    status: "refunded",
    paid_at: new Date().toISOString(),
    refunded_at: new Date().toISOString(),
    stripe_payment_intent_id: PI_ID,
    stripe_charge_id: CHARGE_ID,
  });
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(result.outcome, "validation_failed");
  assert.equal(webhookHarness.payments[0].status, "refunded");
});

test("AM-AN: failed/expired payment creates no access/credit", async () => {
  seedPendingPayment();
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.async_payment_failed", {
      id: SESSION_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(webhookHarness.accessGrants.length, 0);
  assert.equal(webhookHarness.subscriptionCredits.length, 0);

  seedPendingPayment({ status: "expired", expired_at: new Date().toISOString() });
  await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.expired", {
      id: SESSION_ID,
      metadata: { purpose: "promoted_request_access", payment_id: PAYMENT_ID },
    }),
  );
  assert.equal(webhookHarness.accessGrants.length, 0);
});

test("AO: late async success from expired handled when Stripe paid", async () => {
  seedPendingPayment({ status: "expired", expired_at: new Date().toISOString() });
  const result = await processStripeWebhookEventForPromotedAccess(
    supabase(),
    buildStripeEvent("checkout.session.async_payment_succeeded", buildPaidCheckoutSession()),
  );
  assert.equal(result.outcome, "success");
  assert.equal(webhookHarness.payments[0].status, "paid");
});

test("AP-AQ: no raw Stripe error in response; sanitized logs only", () => {
  assert.match(routeSrc, /processing_failed/);
  assert.match(routeSrc, /error: "invalid_signature"/);
  assert.match(fulfillmentSrc, /promoted_payment_paid/);
  assert.doesNotMatch(fulfillmentSrc, /console\.(log|error).*payment_id/);
});

test("AR: billing_events idempotency preserved in orchestrator", () => {
  assert.match(routeSrc, /claimBillingEvent/);
  assert.match(routeSrc, /finishBillingEvent/);
  assert.match(orchestratorSrc, /processStripeWebhookEventForPromotedAccess/);
  assert.match(orchestratorSrc, /processStripeWebhookEventForPartners/);
});

test("AS-AY: webhook orchestration does not replace partner dispatch", () => {
  assert.match(orchestratorSrc, /shouldRetryBillingWebhook/);
  assert.match(partnerSrc, /shouldMarkPartnerBillingEventSkipped/);
  assert.doesNotMatch(partnerSrc, /promoted_request_payments/);
});

test("orchestrator retries on promoted retryable failure", async () => {
  resetWebhookHarness();
  seedPendingPayment();
  webhookHarness.nextGrantInsertFailsOnce = true;
  const result = await processStripeBillingWebhook(
    supabase(),
    buildStripeEvent("checkout.session.completed", buildPaidCheckoutSession()),
  );
  assert.equal(result.promoted.outcome, "retryable_failure");
  assert.equal(shouldRetryBillingWebhook(result), true);
});

test("validateCheckoutSessionForPaidPayment pending vs paid", () => {
  seedPendingPayment();
  const payment = webhookHarness.payments[0];
  const pending = validateCheckoutSessionForPaidPayment(
    buildPaidCheckoutSession({ payment_status: "unpaid" }),
    payment,
  );
  assert.equal(pending.ok, false);
  if (!pending.ok) assert.equal(pending.reason, "pending");
});

test("billing_events claim supports retry after failed", async () => {
  resetWebhookHarness();
  const sb = supabase();
  const first = await claimBillingEvent(sb, {
    providerEventId: "evt_retry_1",
    eventType: "checkout.session.completed",
  });
  assert.equal(first.action, "process");
  webhookHarness.billingEvents[0].processing_status = "failed";
  const second = await claimBillingEvent(sb, {
    providerEventId: "evt_retry_1",
    eventType: "checkout.session.completed",
  });
  assert.equal(second.action, "process");
});
