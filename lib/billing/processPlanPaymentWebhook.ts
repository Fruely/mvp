import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { isManualRenewalEnabled } from "@/lib/billing/featureFlags";
import {
  fulfillPlanPaymentEntitlement,
  loadPlanPaymentById,
  markPlanPaymentAsyncFailed,
  markPlanPaymentExpired,
} from "@/lib/billing/planPaymentFulfillment";
import {
  extractPlanPaymentIdFromSession,
  isPermanentPlanPaymentValidationFailure,
  isPlanPaymentPurpose,
  resolvePlanPaymentPaidAt,
  validatePlanPaymentCheckoutSession,
  validateUnpaidCompletedPlanPaymentSession,
} from "@/lib/billing/planPaymentWebhookValidation";
import { stripeId } from "@/lib/billing/stripeInvoiceEligibility";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PlanPaymentWebhookOutcome =
  | "ignored"
  | "deferred_flag_off"
  | "pending"
  | "success"
  | "validation_failed"
  | "retryable_failure";

export type PlanPaymentWebhookResult = {
  outcome: PlanPaymentWebhookOutcome;
  failureCode?: string;
};

const CHECKOUT_SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);
const CHECKOUT_FAILED_EVENT = "checkout.session.async_payment_failed";
const CHECKOUT_EXPIRED_EVENT = "checkout.session.expired";

const PLAN_PAYMENT_CHECKOUT_EVENTS = new Set<string>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  CHECKOUT_FAILED_EVENT,
  CHECKOUT_EXPIRED_EVENT,
]);

function eventCreatedIso(event: Stripe.Event): string {
  return new Date(event.created * 1000).toISOString();
}

async function resolveChargeIdFromPaymentIntent(
  paymentIntentId: string,
  expanded?: Stripe.PaymentIntent | string | null,
): Promise<string | null> {
  if (typeof expanded === "object" && expanded?.latest_charge !== undefined) {
    return stripeId(expanded.latest_charge);
  }

  const stripe = getStripeClient();
  if (!stripe) return null;

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return stripeId(pi.latest_charge);
  } catch {
    return null;
  }
}

async function retrieveExpandedCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripeClient();
  if (!stripe || !session.id) return session;

  try {
    return await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items.data.price", "payment_intent.latest_charge"],
    });
  } catch {
    const failedSessionId = session.id ?? null;
    console.info("[billing/plan-payment] plan_payment_session_retrieve_failed", {
      sessionId: failedSessionId,
    });
    return null;
  }
}

function extractLineItemPriceId(session: Stripe.Checkout.Session): string | null {
  const items = session.line_items?.data ?? [];
  if (items.length !== 1) return null;
  const price = items[0]?.price;
  if (!price) return null;
  return stripeId(price);
}

function validationFailureResult(
  code: string,
  retryable: boolean,
): PlanPaymentWebhookResult {
  if (retryable) {
    return { outcome: "retryable_failure", failureCode: code };
  }
  return { outcome: "validation_failed", failureCode: code };
}

async function handleCheckoutSessionSuccess(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<PlanPaymentWebhookResult> {
  const planPaymentId = extractPlanPaymentIdFromSession(session);
  if (!planPaymentId) {
    return { outcome: "ignored" };
  }

  if (!isManualRenewalEnabled()) {
    console.info("[billing/plan-payment] plan_payment_deferred_flag_off", {
      planPaymentId,
      eventType: event.type,
    });
    return { outcome: "deferred_flag_off" };
  }

  const payment = await loadPlanPaymentById(supabase, planPaymentId);
  if (!payment) {
    console.info("[billing/plan-payment] plan_payment_not_found", { planPaymentId });
    return { outcome: "validation_failed", failureCode: "plan_payment_not_found" };
  }

  if (session.payment_status === "unpaid") {
    if (validateUnpaidCompletedPlanPaymentSession(session, payment)) {
      console.info("[billing/plan-payment] plan_payment_pending_async", { planPaymentId });
      return { outcome: "pending" };
    }
    return validationFailureResult("plan_payment_not_paid", true);
  }

  const expandedSession = await retrieveExpandedCheckoutSession(session);
  if (!expandedSession) {
    return validationFailureResult("plan_payment_stripe_unavailable", true);
  }

  const paymentIntentId = stripeId(expandedSession.payment_intent);
  if (!paymentIntentId) {
    return validationFailureResult("plan_payment_not_paid", true);
  }

  const paymentIntent =
    typeof expandedSession.payment_intent === "object" && expandedSession.payment_intent
      ? expandedSession.payment_intent
      : null;

  let chargeId = paymentIntent ? stripeId(paymentIntent.latest_charge) : null;
  if (!chargeId) {
    chargeId = await resolveChargeIdFromPaymentIntent(paymentIntentId, paymentIntent);
  }

  let chargeCreated: number | undefined;
  if (paymentIntent?.latest_charge && typeof paymentIntent.latest_charge === "object") {
    chargeCreated = paymentIntent.latest_charge.created;
  }

  const paidAt = resolvePlanPaymentPaidAt({
    charge: chargeCreated ? { created: chargeCreated } : null,
    eventCreated: event.created,
  });
  if (!paidAt) {
    return validationFailureResult("plan_payment_not_paid", true);
  }

  const lineItemPriceId = extractLineItemPriceId(expandedSession);
  if (!lineItemPriceId) {
    return validationFailureResult("plan_payment_stripe_unavailable", true);
  }

  const validation = validatePlanPaymentCheckoutSession(expandedSession, payment, {
    paymentIntentId,
    chargeId,
    paidAt,
    lineItemPriceId,
  });

  if (!validation.ok) {
    console.info("[billing/plan-payment] plan_payment_validation_failed", {
      planPaymentId,
      failureCode: validation.code,
    });
    return validationFailureResult(
      validation.code,
      validation.retryable && !isPermanentPlanPaymentValidationFailure(validation.code),
    );
  }

  const fulfillment = await fulfillPlanPaymentEntitlement(supabase, {
    planPaymentId: payment.id,
    paidAt: validation.paidAt,
    paymentIntentId: validation.paymentIntentId,
    chargeId: validation.chargeId,
    checkoutSessionId: expandedSession.id,
  });

  if (fulfillment.outcome === "retryable_failure") {
    return { outcome: "retryable_failure", failureCode: fulfillment.code };
  }
  if (fulfillment.outcome === "validation_failed") {
    return { outcome: "validation_failed", failureCode: fulfillment.code };
  }

  return { outcome: "success" };
}

async function handleCheckoutSessionFailed(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<PlanPaymentWebhookResult> {
  const planPaymentId = extractPlanPaymentIdFromSession(session);
  if (!planPaymentId) return { outcome: "ignored" };

  if (!isManualRenewalEnabled()) {
    console.info("[billing/plan-payment] plan_payment_deferred_flag_off", {
      planPaymentId,
      eventType: event.type,
    });
    return { outcome: "deferred_flag_off" };
  }

  const payment = await loadPlanPaymentById(supabase, planPaymentId);
  if (!payment) {
    return { outcome: "validation_failed", failureCode: "plan_payment_not_found" };
  }

  const result = await markPlanPaymentAsyncFailed(supabase, payment, eventCreatedIso(event));
  if (result === "retryable_failure") {
    return { outcome: "retryable_failure", failureCode: "plan_payment_fulfillment_failed" };
  }
  return { outcome: "success" };
}

async function handleCheckoutSessionExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  event: Stripe.Event,
): Promise<PlanPaymentWebhookResult> {
  const planPaymentId = extractPlanPaymentIdFromSession(session);
  if (!planPaymentId) return { outcome: "ignored" };

  if (!isManualRenewalEnabled()) {
    console.info("[billing/plan-payment] plan_payment_deferred_flag_off", {
      planPaymentId,
      eventType: event.type,
    });
    return { outcome: "deferred_flag_off" };
  }

  const payment = await loadPlanPaymentById(supabase, planPaymentId);
  if (!payment) {
    return { outcome: "validation_failed", failureCode: "plan_payment_not_found" };
  }

  const result = await markPlanPaymentExpired(supabase, payment, eventCreatedIso(event));
  if (result === "retryable_failure") {
    return { outcome: "retryable_failure", failureCode: "plan_payment_fulfillment_failed" };
  }
  return { outcome: "success" };
}

export function sessionLooksLikePlanPayment(session: Stripe.Checkout.Session): boolean {
  return isPlanPaymentPurpose(session.metadata);
}

export async function processStripeWebhookEventForPlanPayments(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<PlanPaymentWebhookResult> {
  if (!PLAN_PAYMENT_CHECKOUT_EVENTS.has(event.type)) {
    return { outcome: "ignored" };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (!sessionLooksLikePlanPayment(session)) {
    return { outcome: "ignored" };
  }

  if (CHECKOUT_SUCCESS_EVENTS.has(event.type)) {
    return handleCheckoutSessionSuccess(supabase, session, event);
  }
  if (event.type === CHECKOUT_FAILED_EVENT) {
    return handleCheckoutSessionFailed(supabase, session, event);
  }
  if (event.type === CHECKOUT_EXPIRED_EVENT) {
    return handleCheckoutSessionExpired(supabase, session, event);
  }

  return { outcome: "ignored" };
}

export function shouldMarkPlanPaymentBillingEventSkipped(
  result: PlanPaymentWebhookResult,
): boolean {
  return (
    result.outcome === "ignored" ||
    result.outcome === "pending" ||
    result.outcome === "validation_failed"
  );
}

export function shouldRetryPlanPaymentWebhook(result: PlanPaymentWebhookResult): boolean {
  return result.outcome === "retryable_failure";
}

export function shouldFinishPlanPaymentDeferredWithoutHttpRetry(
  result: PlanPaymentWebhookResult,
): boolean {
  return result.outcome === "deferred_flag_off";
}

export const PLAN_PAYMENT_STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
] as const;
