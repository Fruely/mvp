import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { findBillingCustomerBySpecialistId } from "@/lib/billing/billingCustomers";
import {
  fulfillPromotedPaymentSuccess,
  loadPromotedPaymentById,
  loadPromotedPaymentByStripeChargeId,
  loadPromotedPaymentByStripePaymentIntentId,
  markPromotedPaymentDisputed,
  markPromotedPaymentExpired,
  markPromotedPaymentFailed,
  markPromotedPaymentRefunded,
} from "@/lib/billing/promotedAccessFulfillment";
import {
  extractPaymentIdFromMetadata,
  stripeId,
  validateCheckoutSessionForPaidPayment,
  validatePaymentIntentMetadata,
  type PromotedPaymentRow,
} from "@/lib/billing/promotedAccessWebhookValidation";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PromotedAccessWebhookOutcome =
  | "ignored"
  | "pending"
  | "success"
  | "validation_failed"
  | "retryable_failure";

export type PromotedAccessWebhookResult = {
  outcome: PromotedAccessWebhookOutcome;
};

const CHECKOUT_SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const CHECKOUT_FAILED_EVENT = "checkout.session.async_payment_failed";
const CHECKOUT_EXPIRED_EVENT = "checkout.session.expired";
const CHARGE_REFUNDED_EVENT = "charge.refunded";
const CHARGE_DISPUTE_EVENT = "charge.dispute.created";

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

async function validateStripeCustomerForPayment(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  payment: PromotedPaymentRow,
): Promise<boolean> {
  const sessionCustomerId = stripeId(session.customer);
  if (!sessionCustomerId) return true;

  const billingCustomer = await findBillingCustomerBySpecialistId(
    supabase,
    payment.specialist_id,
  );
  if (!billingCustomer?.provider_customer_id) return false;
  return billingCustomer.provider_customer_id === sessionCustomerId;
}

async function handleCheckoutSessionSuccess(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<PromotedAccessWebhookResult> {
  const paymentId = extractPaymentIdFromMetadata(session.metadata);
  if (!paymentId) {
    console.info("[billing/promoted-access] promoted_event_ignored");
    return { outcome: "ignored" };
  }

  const payment = await loadPromotedPaymentById(supabase, paymentId);
  if (!payment) {
    console.info("[billing/promoted-access] promoted_validation_failed");
    return { outcome: "validation_failed" };
  }

  const validation = validateCheckoutSessionForPaidPayment(session, payment);
  if (validation.ok === false) {
    if (validation.reason === "pending") {
      console.info("[billing/promoted-access] promoted_payment_pending");
      return { outcome: "pending" };
    }
    console.info("[billing/promoted-access] promoted_validation_failed");
    return { outcome: "validation_failed" };
  }

  const customerOk = await validateStripeCustomerForPayment(supabase, session, payment);
  if (!customerOk) {
    console.info("[billing/promoted-access] promoted_validation_failed");
    return { outcome: "validation_failed" };
  }

  let chargeId = validation.chargeId;
  if (!chargeId) {
    chargeId = await resolveChargeIdFromPaymentIntent(
      validation.paymentIntentId,
      session.payment_intent,
    );
  }

  const stripe = getStripeClient();
  if (stripe) {
    try {
      const pi =
        typeof session.payment_intent === "object" && session.payment_intent
          ? session.payment_intent
          : await stripe.paymentIntents.retrieve(validation.paymentIntentId);
      if (!validatePaymentIntentMetadata(pi, payment)) {
        console.info("[billing/promoted-access] promoted_validation_failed");
        return { outcome: "validation_failed" };
      }
    } catch {
      console.info("[billing/promoted-access] promoted_validation_failed");
      return { outcome: "validation_failed" };
    }
  }

  const fulfillment = await fulfillPromotedPaymentSuccess(supabase, payment, {
    paymentIntentId: validation.paymentIntentId,
    chargeId,
    paidAt: validation.paidAt,
  });

  if (fulfillment === "retryable_failure") {
    return { outcome: "retryable_failure" };
  }

  return { outcome: "success" };
}

async function handleCheckoutSessionFailed(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<PromotedAccessWebhookResult> {
  const paymentId = extractPaymentIdFromMetadata(session.metadata);
  if (!paymentId) {
    console.info("[billing/promoted-access] promoted_event_ignored");
    return { outcome: "ignored" };
  }

  const payment = await loadPromotedPaymentById(supabase, paymentId);
  if (!payment) {
    console.info("[billing/promoted-access] promoted_validation_failed");
    return { outcome: "validation_failed" };
  }

  const result = await markPromotedPaymentFailed(supabase, payment);
  if (result === "retryable_failure") return { outcome: "retryable_failure" };
  return { outcome: "success" };
}

async function handleCheckoutSessionExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<PromotedAccessWebhookResult> {
  const paymentId = extractPaymentIdFromMetadata(session.metadata);
  if (!paymentId) {
    console.info("[billing/promoted-access] promoted_event_ignored");
    return { outcome: "ignored" };
  }

  const payment = await loadPromotedPaymentById(supabase, paymentId);
  if (!payment) {
    console.info("[billing/promoted-access] promoted_validation_failed");
    return { outcome: "validation_failed" };
  }

  const result = await markPromotedPaymentExpired(supabase, payment);
  if (result === "retryable_failure") return { outcome: "retryable_failure" };
  return { outcome: "success" };
}

async function resolvePromotedPaymentFromCharge(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
): Promise<PromotedPaymentRow | null> {
  const fromMetadata = extractPaymentIdFromMetadata(charge.metadata);
  if (fromMetadata) {
    const payment = await loadPromotedPaymentById(supabase, fromMetadata);
    if (payment) return payment;
  }

  const paymentIntentId = stripeId(charge.payment_intent);
  if (paymentIntentId) {
    const stripe = getStripeClient();
    if (stripe) {
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const fromPi = extractPaymentIdFromMetadata(pi.metadata);
        if (fromPi) {
          const payment = await loadPromotedPaymentById(supabase, fromPi);
          if (payment) return payment;
        }
      } catch {
        // fall through to DB lookup
      }
    }

    const byIntent = await loadPromotedPaymentByStripePaymentIntentId(
      supabase,
      paymentIntentId,
    );
    if (byIntent) return byIntent;
  }

  const chargeId = stripeId(charge.id) ?? (typeof charge.id === "string" ? charge.id : null);
  if (chargeId) {
    return loadPromotedPaymentByStripeChargeId(supabase, chargeId);
  }

  return null;
}

async function handleChargeReversal(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  kind: "refund" | "dispute",
): Promise<PromotedAccessWebhookResult> {
  const payment = await resolvePromotedPaymentFromCharge(supabase, charge);
  if (!payment) {
    console.info("[billing/promoted-access] promoted_event_ignored");
    return { outcome: "ignored" };
  }

  const result =
    kind === "refund"
      ? await markPromotedPaymentRefunded(supabase, payment)
      : await markPromotedPaymentDisputed(supabase, payment);

  if (result === "retryable_failure") return { outcome: "retryable_failure" };
  return { outcome: "success" };
}

export async function processStripeWebhookEventForPromotedAccess(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<PromotedAccessWebhookResult> {
  const type = event.type;

  if (CHECKOUT_SUCCESS_EVENTS.has(type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!extractPaymentIdFromMetadata(session.metadata)) {
      console.info("[billing/promoted-access] promoted_event_ignored");
      return { outcome: "ignored" };
    }
    return handleCheckoutSessionSuccess(supabase, session);
  }

  if (type === CHECKOUT_FAILED_EVENT) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!extractPaymentIdFromMetadata(session.metadata)) {
      console.info("[billing/promoted-access] promoted_event_ignored");
      return { outcome: "ignored" };
    }
    return handleCheckoutSessionFailed(supabase, session);
  }

  if (type === CHECKOUT_EXPIRED_EVENT) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!extractPaymentIdFromMetadata(session.metadata)) {
      console.info("[billing/promoted-access] promoted_event_ignored");
      return { outcome: "ignored" };
    }
    return handleCheckoutSessionExpired(supabase, session);
  }

  if (type === CHARGE_REFUNDED_EVENT || type === CHARGE_DISPUTE_EVENT) {
    const charge = event.data.object as Stripe.Charge;
    return handleChargeReversal(
      supabase,
      charge,
      type === CHARGE_REFUNDED_EVENT ? "refund" : "dispute",
    );
  }

  return { outcome: "ignored" };
}

export const PROMOTED_ACCESS_STRIPE_EVENT_TYPES = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
  "charge.dispute.created",
] as const;
