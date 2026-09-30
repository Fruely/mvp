import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient } from "@/lib/billing/stripeClient";
import {
  isServiceRequestCaptureEnabled,
  isServiceRequestPaymentAuthEnabled,
  SERVICE_REQUEST_AUTHORIZATION_PURPOSE,
} from "@/lib/billing/createServiceRequestAuthorization";
import { specialistHasStorePurchaseCapability } from "@/lib/billing/prepareServiceRequestStorePayment";
import { recordServiceRequestClientConfirmation } from "@/lib/billing/recordServiceRequestClientConfirmation";
import {
  bindServiceRequestPaymentRail,
  isServiceRequestStorePaymentEnabled,
  paymentProvesStripeRail,
  SERVICE_REQUEST_STORE_PAYMENT_FLAG,
} from "@/lib/billing/serviceRequestPaymentRail";
import { isServiceRequestPaidClaimEnabled } from "@/lib/selection/reserveMatch";

export { isServiceRequestStorePaymentEnabled, SERVICE_REQUEST_STORE_PAYMENT_FLAG };

/**
 * Client confirmation of one reserved service-request connection.
 * The body is not an input. This function may capture the stored PaymentIntent.
 * It does not grant access, select a specialist, or open chat.
 */
export function serviceRequestCaptureIdempotencyKey(paymentId: string): string {
  return `service-request-capture:${paymentId}`;
}

type CaptureIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string> | null;
};

export type ServiceRequestCaptureStripe = {
  paymentIntents: {
    retrieve: (id: string) => Promise<CaptureIntent>;
    capture: (
      id: string,
      params: Record<string, unknown>,
      options: { idempotencyKey: string },
    ) => Promise<CaptureIntent>;
  };
};

export type ConfirmServiceRequestConnectionResult =
  | { ok: true; state: "capture_pending" }
  | { ok: true; state: "connected"; conversationId: string | null }
  | { ok: true; state: "payment_required" }
  | {
      ok: false;
      error: "not_found" | "not_claimable" | "already_claimed" | "invariant" | "payments_unavailable" | "retryable";
    };

type RequestRow = {
  id: string;
  selected_specialist_id: string | null;
  client_user_id: string | null;
};

type ClaimRow = {
  id: string;
  status: string;
  specialist_id: string;
  service_request_id: string;
  match_id: string;
  request_offer_id: string | null;
  client_confirmed_at: string | null;
  payment_rail: string | null;
};

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  service_request_claim_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  provider?: string | null;
};

type OfferRow = {
  id: string;
  request_kind: string;
  service_request_id: string | null;
  specialist_id: string;
  billing_model: string;
  price_cents: number | null;
  currency: string;
  status: string;
};

const LIVE_OFFER_STATUSES = ["offered", "viewed", "accepted", "paid"];

function livePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

async function connected(
  supabase: SupabaseClient,
  requestId: string,
): Promise<ConfirmServiceRequestConnectionResult> {
  const conversation = await supabase
    .from("conversations")
    .select("id")
    .eq("service_request_id", requestId)
    .maybeSingle();
  if (conversation.error) return { ok: false, error: "retryable" };
  const conversationId = typeof conversation.data?.id === "string" ? conversation.data.id : null;
  return { ok: true, state: "connected", conversationId };
}

export async function confirmServiceRequestConnection(input: {
  supabase: SupabaseClient;
  publicId: string;
  clientUserId: string;
  env?: NodeJS.ProcessEnv;
  stripe?: ServiceRequestCaptureStripe | null;
}): Promise<ConfirmServiceRequestConnectionResult> {
  const env = input.env ?? process.env;
  if (!isServiceRequestPaidClaimEnabled(env)) return { ok: false, error: "not_found" };
  const publicId = input.publicId.trim();
  if (!publicId || publicId.length > 80 || !/^[A-Za-z0-9_-]+$/.test(publicId)) {
    return { ok: false, error: "not_found" };
  }
  if (!input.clientUserId) return { ok: false, error: "not_found" };

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id, client_user_id")
    .eq("public_id", publicId)
    .eq("client_user_id", input.clientUserId)
    .maybeSingle();
  if (requestResult.error) return { ok: false, error: "retryable" };
  const request = requestResult.data as RequestRow | null;
  if (!request?.id || request.client_user_id !== input.clientUserId) return { ok: false, error: "not_found" };

  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, payment_rail")
    .eq("service_request_id", request.id)
    .eq("status", "reserved")
    .maybeSingle();
  if (claimResult.error) return { ok: false, error: "retryable" };
  const claim = claimResult.data as ClaimRow | null;
  if (!claim) {
    const completed = await input.supabase
      .from("service_request_claims")
      .select("id")
      .eq("service_request_id", request.id)
      .eq("status", "completed")
      .maybeSingle();
    if (completed.error) return { ok: false, error: "retryable" };
    if (completed.data?.id && request.selected_specialist_id) return connected(input.supabase, request.id);
    return { ok: false, error: "not_claimable" };
  }
  if (claim.service_request_id !== request.id || !claim.request_offer_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (request.selected_specialist_id && request.selected_specialist_id !== claim.specialist_id) {
    return { ok: false, error: "already_claimed" };
  }
  if (request.selected_specialist_id === claim.specialist_id) {
    return connected(input.supabase, request.id);
  }

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select(
      "id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id, provider",
    )
    .eq("service_request_claim_id", claim.id)
    .in("status", ["pending", "authorized", "paid"]);
  if (paymentResult.error) return { ok: false, error: "retryable" };
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  let rail = claim.payment_rail === "stripe" || claim.payment_rail === "store" ? claim.payment_rail : null;
  if (!rail && payments.some((row) => paymentProvesStripeRail(row))) {
    const bound = await bindServiceRequestPaymentRail({
      supabase: input.supabase,
      claimId: claim.id,
      specialistId: claim.specialist_id,
      rail: "stripe",
    });
    if (!bound.ok) {
      return { ok: false, error: bound.error === "retryable" ? "retryable" : "not_claimable" };
    }
    rail = "stripe";
  }
  if (!rail) return { ok: false, error: "not_claimable" };
  if (rail === "store") {
    return confirmStoreRail({
      supabase: input.supabase,
      env,
      requestId: request.id,
      clientUserId: input.clientUserId,
      claim,
      payments,
    });
  }
  if (!isServiceRequestPaymentAuthEnabled(env) || !isServiceRequestCaptureEnabled(env)) {
    return { ok: false, error: "not_found" };
  }
  const payment = payments.find((row) => row.status === "authorized") ?? null;
  if (!payment && payments.some((row) => row.status === "pending")) {
    return { ok: false, error: "not_claimable" };
  }
  if (!payment && payments.some((row) => row.status === "paid")) {
    return { ok: true, state: "capture_pending" };
  }
  if (!payment) return { ok: false, error: "not_claimable" };
  const amount = livePrice(payment.amount_cents);
  if (
    payment.service_request_claim_id !== claim.id ||
    payment.offer_id !== claim.request_offer_id ||
    payment.specialist_id !== claim.specialist_id ||
    payment.currency !== "eur" ||
    amount == null ||
    !payment.stripe_payment_intent_id
  ) {
    return { ok: false, error: "invariant" };
  }

  const offerResult = await input.supabase
    .from("request_offers")
    .select("id, request_kind, service_request_id, specialist_id, billing_model, status, price_cents, currency")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offerResult.error) return { ok: false, error: "retryable" };
  const offer = offerResult.data as OfferRow | null;
  const offerPrice = livePrice(offer?.price_cents);
  if (
    !offer ||
    offer.request_kind !== "service_request" ||
    offer.service_request_id !== request.id ||
    offer.specialist_id !== claim.specialist_id ||
    offer.billing_model !== "pay_per_lead" ||
    offer.currency !== "eur" ||
    !LIVE_OFFER_STATUSES.includes(offer.status) ||
    offerPrice == null ||
    offerPrice !== amount
  ) {
    return { ok: false, error: "invariant" };
  }

  const matchResult = await input.supabase
    .from("service_request_matches")
    .select("id, service_request_id, specialist_id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (matchResult.error) return { ok: false, error: "retryable" };
  const match = matchResult.data as {
    service_request_id?: string;
    specialist_id?: string;
    status?: string;
  } | null;
  if (
    !match ||
    match.service_request_id !== request.id ||
    match.specialist_id !== claim.specialist_id ||
    match.status !== "active"
  ) {
    return { ok: false, error: "not_claimable" };
  }

  const stripe =
    input.stripe === undefined ? (getStripeClient() as ServiceRequestCaptureStripe | null) : input.stripe;
  if (!stripe) return { ok: false, error: "payments_unavailable" };

  let intent: CaptureIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  } catch (error) {
    console.error("[billing/service-request-confirm] retrieve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }

  const metadata = intent.metadata ?? {};
  if (
    intent.id !== payment.stripe_payment_intent_id ||
    intent.amount !== amount ||
    intent.currency.toLowerCase() !== "eur" ||
    metadata.purpose !== SERVICE_REQUEST_AUTHORIZATION_PURPOSE ||
    metadata.payment_id !== payment.id ||
    metadata.offer_id !== payment.offer_id ||
    metadata.claim_id !== claim.id ||
    metadata.specialist_id !== claim.specialist_id
  ) {
    return { ok: false, error: "invariant" };
  }
  if (intent.status !== "requires_capture" && intent.status !== "succeeded") {
    return { ok: false, error: "not_claimable" };
  }

  const recorded = await recordServiceRequestClientConfirmation({
    supabase: input.supabase,
    requestId: request.id,
    clientUserId: input.clientUserId,
  });
  if (!recorded.ok) return recorded;

  if (intent.status === "succeeded") return { ok: true, state: "capture_pending" };

  try {
    const captured = await stripe.paymentIntents.capture(
      intent.id,
      {},
      { idempotencyKey: serviceRequestCaptureIdempotencyKey(payment.id) },
    );
    if (captured.id !== intent.id || captured.amount !== amount) return { ok: false, error: "invariant" };
  } catch (error) {
    console.error("[billing/service-request-confirm] capture failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }
  return { ok: true, state: "capture_pending" };
}

async function confirmStoreRail(input: {
  supabase: SupabaseClient;
  env: NodeJS.ProcessEnv;
  requestId: string;
  clientUserId: string;
  claim: ClaimRow;
  payments: PaymentRow[];
}): Promise<ConfirmServiceRequestConnectionResult> {
  if (input.payments.length > 0) return { ok: false, error: "not_claimable" };
  const grantResult = await input.supabase
    .from("request_offer_access_grants")
    .select("id, revoked_at")
    .eq("offer_id", input.claim.request_offer_id)
    .eq("specialist_id", input.claim.specialist_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (grantResult.error) return { ok: false, error: "retryable" };
  if (grantResult.data?.id) return { ok: true, state: "capture_pending" };
  if (!isServiceRequestStorePaymentEnabled(input.env)) return { ok: false, error: "not_found" };
  const ready = await specialistHasStorePurchaseCapability(input.supabase, input.claim.specialist_id);
  if (ready === "retryable") return { ok: false, error: "retryable" };
  if (!ready) return { ok: false, error: "not_found" };
  const recorded = await recordServiceRequestClientConfirmation({
    supabase: input.supabase,
    requestId: input.requestId,
    clientUserId: input.clientUserId,
  });
  if (!recorded.ok) return recorded;
  return { ok: true, state: "payment_required" };
}
