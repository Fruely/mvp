import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { SERVICE_REQUEST_AUTHORIZATION_PURPOSE } from "@/lib/billing/createServiceRequestAuthorization";

/**
 * Authorization state for a service-request PaymentIntent.
 *
 * The direct-lead Checkout processor grants access. This processor must not
 * call it. Authorization, release, and an externally captured payment stay on
 * request_offer_payments. The claim stays reserved.
 */
export type ServiceRequestAuthorizationWebhookOutcome =
  | "ignored"
  | "success"
  | "validation_failed"
  | "retryable_failure";

export type ServiceRequestAuthorizationWebhookResult = {
  outcome: ServiceRequestAuthorizationWebhookOutcome;
};

const HANDLED_EVENTS = new Set([
  "payment_intent.amount_capturable_updated",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.succeeded",
]);

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  service_request_claim_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
};

type ClaimRow = {
  id: string;
  specialist_id: string;
  service_request_id: string;
  request_offer_id: string | null;
  status: string;
};

type OfferRow = {
  id: string;
  request_kind: string;
  service_request_id: string | null;
  specialist_id: string;
};

const PAYMENT_COLUMNS =
  "id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id";

function intentOf(event: Stripe.Event): Stripe.PaymentIntent | null {
  if (!HANDLED_EVENTS.has(event.type)) return null;
  const object = event.data.object as { object?: string };
  if (object.object !== "payment_intent") return null;
  return event.data.object as Stripe.PaymentIntent;
}

async function loadPayment(
  supabase: SupabaseClient,
  paymentId: string,
): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentRow | null) ?? null;
}

async function coherent(
  supabase: SupabaseClient,
  payment: PaymentRow,
  intent: Stripe.PaymentIntent,
): Promise<"ok" | "invalid" | "retry"> {
  const metadata = intent.metadata ?? {};
  if (metadata.purpose !== SERVICE_REQUEST_AUTHORIZATION_PURPOSE) return "invalid";
  if (metadata.payment_id !== payment.id) return "invalid";
  if (!payment.service_request_claim_id || metadata.claim_id !== payment.service_request_claim_id) {
    return "invalid";
  }
  if (metadata.offer_id !== payment.offer_id) return "invalid";
  if (metadata.specialist_id && metadata.specialist_id !== payment.specialist_id) return "invalid";
  if (intent.amount !== payment.amount_cents) return "invalid";
  if (intent.currency.toLowerCase() !== payment.currency.toLowerCase() || payment.currency !== "eur") {
    return "invalid";
  }
  if (payment.stripe_payment_intent_id && payment.stripe_payment_intent_id !== intent.id) {
    return "invalid";
  }

  const claimResult = await supabase
    .from("service_request_claims")
    .select("id, specialist_id, service_request_id, request_offer_id, status")
    .eq("id", payment.service_request_claim_id)
    .maybeSingle();
  if (claimResult.error) return "retry";
  const claim = claimResult.data as ClaimRow | null;
  if (!claim || claim.request_offer_id !== payment.offer_id || claim.specialist_id !== payment.specialist_id) {
    return "invalid";
  }

  const offerResult = await supabase
    .from("request_offers")
    .select("id, request_kind, service_request_id, specialist_id")
    .eq("id", payment.offer_id)
    .maybeSingle();
  if (offerResult.error) return "retry";
  const offer = offerResult.data as OfferRow | null;
  if (
    !offer ||
    offer.request_kind !== "service_request" ||
    offer.service_request_id !== claim.service_request_id ||
    offer.specialist_id !== claim.specialist_id
  ) {
    return "invalid";
  }
  return "ok";
}

function outcomeFor(relation: "ok" | "invalid" | "retry"): ServiceRequestAuthorizationWebhookResult | null {
  if (relation === "retry") return { outcome: "retryable_failure" };
  if (relation === "invalid") return { outcome: "validation_failed" };
  return null;
}

export async function processStripeWebhookEventForServiceRequestAuthorization(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<ServiceRequestAuthorizationWebhookResult> {
  const intent = intentOf(event);
  if (!intent || intent.metadata?.purpose !== SERVICE_REQUEST_AUTHORIZATION_PURPOSE) {
    return { outcome: "ignored" };
  }
  const paymentId = intent.metadata.payment_id?.trim();
  if (!paymentId) return { outcome: "validation_failed" };

  let payment: PaymentRow | null;
  try {
    payment = await loadPayment(supabase, paymentId);
  } catch {
    return { outcome: "retryable_failure" };
  }
  if (!payment) return { outcome: "validation_failed" };

  const relation = await coherent(supabase, payment, intent);
  const rejected = outcomeFor(relation);
  if (rejected) return rejected;

  if (event.type === "payment_intent.amount_capturable_updated") {
    if (intent.status !== "requires_capture") return { outcome: "validation_failed" };
    if (payment.status === "authorized" || payment.status === "paid") return { outcome: "success" };
    if (payment.status !== "pending") return { outcome: "validation_failed" };
    const authorizedAt = new Date().toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "authorized",
        authorized_at: authorizedAt,
        stripe_payment_intent_id: intent.id,
        updated_at: authorizedAt,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  if (event.type === "payment_intent.payment_failed") {
    if (payment.status === "failed") return { outcome: "success" };
    if (payment.status !== "pending") return { outcome: "validation_failed" };
    const failedAt = new Date().toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "failed",
        failed_at: failedAt,
        stripe_payment_intent_id: payment.stripe_payment_intent_id ?? intent.id,
        updated_at: failedAt,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  if (event.type === "payment_intent.canceled") {
    if (payment.status === "released") return { outcome: "success" };
    if (payment.status !== "pending" && payment.status !== "authorized") {
      return { outcome: "validation_failed" };
    }
    const releasedAt = new Date().toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "released",
        released_at: releasedAt,
        stripe_payment_intent_id: payment.stripe_payment_intent_id ?? intent.id,
        updated_at: releasedAt,
      })
      .eq("id", payment.id)
      .in("status", ["pending", "authorized"]);
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  if (event.type === "payment_intent.succeeded") {
    if (intent.status !== "succeeded") return { outcome: "validation_failed" };
    if (payment.status === "paid") return { outcome: "success" };
    if (payment.status !== "pending" && payment.status !== "authorized") {
      return { outcome: "validation_failed" };
    }
    const paidAt = new Date().toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "paid",
        paid_at: paidAt,
        stripe_payment_intent_id: intent.id,
        updated_at: paidAt,
      })
      .eq("id", payment.id)
      .in("status", ["pending", "authorized"]);
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  return { outcome: "ignored" };
}
