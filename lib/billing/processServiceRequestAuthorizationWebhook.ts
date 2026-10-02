import type { SupabaseClient } from "@supabase/supabase-js";
import { persistConfirmationDeadline } from "@/lib/billing/serviceRequestConfirmationDeadline";
import { CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS } from "@/lib/leadEngine/serviceRequestAccessPricing";
import { stripePaymentIntentAttribution } from "@/lib/billing/requestOfferPaymentProvider";
import type Stripe from "stripe";
import {
  isServiceRequestCaptureEnabled,
  SERVICE_REQUEST_AUTHORIZATION_PURPOSE,
} from "@/lib/billing/createServiceRequestAuthorization";
import { fulfillConfirmedServiceRequestCapture } from "@/lib/billing/fulfillServiceRequestCapture";
import {
  expiryDecisionIsDurable,
  finalizeConfirmationExpiry,
} from "@/lib/billing/expireServiceRequestConfirmation";
import { isConfirmationDeadlineOpen, storedConfirmationDeadline } from "@/lib/billing/serviceRequestConfirmationDeadline";
import { finalizeClientRejectedConnection } from "@/lib/billing/rejectServiceRequestConnection";
import { notifyClientConfirmationRequired } from "@/lib/selection/interest";

/**
 * Authorization state for a service-request PaymentIntent.
 *
 * The direct-lead Checkout processor grants access. This processor must not
 * call it. A succeeded service-request intent is fulfilled only after the
 * client confirmation timestamp exists.
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
  match_id: string | null;
  request_offer_id: string | null;
  status: string;
  client_confirmed_at: string | null;
  client_rejected_at?: string | null;
  confirmation_expires_at?: unknown;
  match_status?: string | null;
  payment_rail?: string | null;
  release_reason?: string | null;
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
): Promise<{ outcome: "ok"; claim: ClaimRow } | { outcome: "invalid" } | { outcome: "retry" }> {
  const metadata = intent.metadata ?? {};
  if (metadata.purpose !== SERVICE_REQUEST_AUTHORIZATION_PURPOSE) return { outcome: "invalid" };
  if (metadata.payment_id !== payment.id) return { outcome: "invalid" };
  if (!payment.service_request_claim_id || metadata.claim_id !== payment.service_request_claim_id) {
    return { outcome: "invalid" };
  }
  if (metadata.offer_id !== payment.offer_id) return { outcome: "invalid" };
  if (metadata.specialist_id && metadata.specialist_id !== payment.specialist_id) return { outcome: "invalid" };
  if (intent.amount !== payment.amount_cents) return { outcome: "invalid" };
  if (payment.amount_cents !== CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS) {
    return { outcome: "invalid" };
  }
  if (intent.currency.toLowerCase() !== payment.currency.toLowerCase() || payment.currency !== "eur") {
    return { outcome: "invalid" };
  }
  if (payment.stripe_payment_intent_id && payment.stripe_payment_intent_id !== intent.id) {
    return { outcome: "invalid" };
  }

  const claimResult = await supabase
    .from("service_request_claims")
    .select("id, specialist_id, service_request_id, match_id, request_offer_id, status, client_confirmed_at, client_rejected_at, confirmation_expires_at, payment_rail, release_reason")
    .eq("id", payment.service_request_claim_id)
    .maybeSingle();
  if (claimResult.error) return { outcome: "retry" };
  const claim = claimResult.data as ClaimRow | null;
  if (!claim || claim.request_offer_id !== payment.offer_id || claim.specialist_id !== payment.specialist_id) {
    return { outcome: "invalid" };
  }
  if (claim.match_id) {
    const matchResult = await supabase
      .from("service_request_matches")
      .select("status")
      .eq("id", claim.match_id)
      .maybeSingle();
    if (matchResult.error) return { outcome: "retry" };
    claim.match_status = (matchResult.data as { status?: string } | null)?.status ?? null;
  }

  const offerResult = await supabase
    .from("request_offers")
    .select("id, request_kind, service_request_id, specialist_id")
    .eq("id", payment.offer_id)
    .maybeSingle();
  if (offerResult.error) return { outcome: "retry" };
  const offer = offerResult.data as OfferRow | null;
  if (
    !offer ||
    offer.request_kind !== "service_request" ||
    offer.service_request_id !== claim.service_request_id ||
    offer.specialist_id !== claim.specialist_id
  ) {
    return { outcome: "invalid" };
  }
  return { outcome: "ok", claim };
}

async function noteAuthorized(supabase: SupabaseClient, claimId: string, env: NodeJS.ProcessEnv): Promise<void> {
  if (!isServiceRequestCaptureEnabled(env)) return;
  await notifyClientConfirmationRequired(supabase, claimId);
}

export async function processStripeWebhookEventForServiceRequestAuthorization(
  supabase: SupabaseClient,
  event: Stripe.Event,
  env: NodeJS.ProcessEnv = process.env,
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
  if (relation.outcome === "retry") return { outcome: "retryable_failure" };
  if (relation.outcome === "invalid") return { outcome: "validation_failed" };
  const claim = relation.claim;

  if (event.type === "payment_intent.amount_capturable_updated") {
    if (intent.status !== "requires_capture") return { outcome: "validation_failed" };
    if (typeof claim.client_rejected_at === "string" && claim.client_rejected_at) {
      return { outcome: "success" };
    }
    if (confirmationWindowClosed(claim)) return { outcome: "success" };
    if (payment.status === "paid") return { outcome: "success" };
    if (payment.status === "authorized") {
      await noteAuthorized(supabase, claim.id, env);
      return { outcome: "success" };
    }
    if (payment.status !== "pending" || claim.status !== "reserved") {
      return { outcome: "validation_failed" };
    }
    const authorizedAt = new Date();
    const deadline = await persistConfirmationDeadline({
      supabase,
      claimId: claim.id,
      authorizedAt,
      env,
    });
    if (!deadline.ok) {
      return { outcome: "retryable_failure" };
    }
    const authorizedAtIso = authorizedAt.toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "authorized",
        authorized_at: authorizedAtIso,
        stripe_payment_intent_id: intent.id,
        ...stripePaymentIntentAttribution(intent.id),
        updated_at: authorizedAtIso,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (error) return { outcome: "retryable_failure" };
    await noteAuthorized(supabase, claim.id, env);
    return { outcome: "success" };
  }

  if (event.type === "payment_intent.payment_failed") {
    // One declined confirmation leaves the same PaymentIntent retryable.
    // Terminal release belongs to cancellation, not to this event.
    if (payment.status !== "pending" || claim.status !== "reserved") {
      return { outcome: "validation_failed" };
    }
    if (payment.stripe_payment_intent_id === intent.id) return { outcome: "success" };
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        stripe_payment_intent_id: intent.id,
        ...stripePaymentIntentAttribution(intent.id),
        updated_at: updatedAt,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  if (event.type === "payment_intent.canceled") {
    if (payment.status === "paid" || claim.status === "completed") return { outcome: "validation_failed" };
    if (typeof claim.client_rejected_at === "string" && claim.client_rejected_at) {
      return { outcome: await finalizeClientRejectedConnection(supabase, claim.id) };
    }
    const requestResult = await supabase
      .from("service_requests")
      .select("id, selected_specialist_id")
      .eq("id", claim.service_request_id)
      .maybeSingle();
    if (requestResult.error) return { outcome: "retryable_failure" };
    const request = requestResult.data as { id?: string; selected_specialist_id?: string | null } | null;
    if (
      expiryDecisionIsDurable({
        matchStatus: claim.match_status,
        clientConfirmedAt: claim.client_confirmed_at,
        clientRejectedAt: claim.client_rejected_at,
        confirmationExpiresAt: claim.confirmation_expires_at,
        claimStatus: claim.status,
        releaseReason: claim.release_reason,
        paymentRail: claim.payment_rail,
        amountCents: payment.amount_cents,
        currency: payment.currency,
        paymentStatus: payment.status,
        requestUnselected: Boolean(request?.id) && !request?.selected_specialist_id,
      })
    ) {
      const expired = await finalizeConfirmationExpiry(supabase, claim.id);
      if (expired === "expired") return { outcome: "success" };
      if (expired === "invariant") return { outcome: "validation_failed" };
      if (expired === "skipped") return { outcome: "validation_failed" };
      return { outcome: "retryable_failure" };
    }
    if (payment.status === "released") return { outcome: "success" };
    if (payment.status !== "pending" && payment.status !== "authorized") {
      return { outcome: "validation_failed" };
    }
    const releasedAt = new Date().toISOString();
    const transactionId = payment.stripe_payment_intent_id ?? intent.id;
    const { error } = await supabase
      .from("request_offer_payments")
      .update({
        status: "released",
        released_at: releasedAt,
        stripe_payment_intent_id: transactionId,
        ...stripePaymentIntentAttribution(transactionId),
        updated_at: releasedAt,
      })
      .eq("id", payment.id)
      .in("status", ["pending", "authorized"]);
    return error ? { outcome: "retryable_failure" } : { outcome: "success" };
  }

  if (event.type === "payment_intent.succeeded") {
    if (intent.status !== "succeeded") return { outcome: "validation_failed" };
    if (payment.status === "paid" && claim.status === "completed") return { outcome: "success" };
    if (claim.status !== "reserved" || !claim.client_confirmed_at) return { outcome: "validation_failed" };
    if (payment.status !== "pending" && payment.status !== "authorized" && payment.status !== "paid") {
      return { outcome: "validation_failed" };
    }
    try {
      const outcome = await fulfillConfirmedServiceRequestCapture(supabase, {
        payment,
        claim,
        paymentIntentId: intent.id,
      });
      return { outcome };
    } catch {
      return { outcome: "retryable_failure" };
    }
  }

  return { outcome: "ignored" };
}

function confirmationWindowClosed(claim: ClaimRow): boolean {
  if (claim.client_confirmed_at) return false;
  if (expiryDecisionIsDurable({
    matchStatus: claim.match_status,
    clientConfirmedAt: claim.client_confirmed_at,
    clientRejectedAt: claim.client_rejected_at,
    confirmationExpiresAt: claim.confirmation_expires_at,
    claimStatus: claim.status,
    releaseReason: claim.release_reason,
  })) {
    return true;
  }
  const deadline = storedConfirmationDeadline(claim.confirmation_expires_at);
  return Boolean(deadline) && !isConfirmationDeadlineOpen(claim.confirmation_expires_at);
}
