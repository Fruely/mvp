import type { SupabaseClient } from "@supabase/supabase-js";
import { applyServiceRequestClientDecision } from "@/lib/billing/expireServiceRequestConfirmation";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "@/lib/leadEngine/requestOfferPolicy";
import { CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS } from "@/lib/leadEngine/serviceRequestAccessPricing";

/**
 * Records the owning client's confirmation of one reserved connection.
 * Stripe requires payment_rail stripe and an open confirmation_expires_at at the write.
 * Store does not read that deadline. It does not capture, grant access, or open chat.
 */
export type RecordClientConfirmationResult =
  | { ok: true; clientConfirmedAt: string }
  | {
      ok: false;
      error: "not_found" | "not_claimable" | "already_claimed" | "confirmation_expired" | "invariant" | "retryable";
    };

function canonicalConnectionFee(value: unknown): boolean {
  return value === CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS;
}

export function isCanonicalMatchedServiceRequestOffer(
  offer: {
    request_kind?: string;
    offer_reason?: string;
    service_request_id?: string | null;
    specialist_id?: string;
    billing_model?: string;
    price_cents?: number | null;
    currency?: string;
    idempotency_key?: string;
  },
  requestId: string,
  specialistId: string,
): boolean {
  return (
    offer.request_kind === "service_request" &&
    offer.service_request_id === requestId &&
    offer.specialist_id === specialistId &&
    offer.offer_reason === "matched" &&
    offer.billing_model === "pay_per_lead" &&
    offer.currency === "eur" &&
    canonicalConnectionFee(offer.price_cents) &&
    offer.idempotency_key ===
      buildMatchedServiceRequestOfferIdempotencyKey({ requestId, specialistId })
  );
}

export async function recordServiceRequestClientConfirmation(input: {
  supabase: SupabaseClient;
  requestId: string;
  clientUserId: string;
}): Promise<RecordClientConfirmationResult> {
  if (!input.requestId || !input.clientUserId) return { ok: false, error: "not_found" };

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id, client_user_id")
    .eq("id", input.requestId)
    .eq("client_user_id", input.clientUserId)
    .maybeSingle();
  if (requestResult.error) return { ok: false, error: "retryable" };
  const request = requestResult.data as {
    id?: string;
    selected_specialist_id?: string | null;
    client_user_id?: string | null;
  } | null;
  if (!request?.id || request.client_user_id !== input.clientUserId) return { ok: false, error: "not_found" };

  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail, confirmation_expires_at")
    .eq("service_request_id", request.id)
    .eq("status", "reserved")
    .maybeSingle();
  if (claimResult.error) return { ok: false, error: "retryable" };
  const claim = claimResult.data as {
    id?: string;
    status?: string;
    specialist_id?: string;
    service_request_id?: string;
    match_id?: string;
    request_offer_id?: string | null;
    client_confirmed_at?: string | null;
    client_rejected_at?: string | null;
    payment_rail?: string | null;
    confirmation_expires_at?: unknown;
  } | null;
  if (!claim?.id || claim.status !== "reserved") return { ok: false, error: "not_claimable" };
  if (typeof claim.client_rejected_at === "string" && claim.client_rejected_at) {
    return { ok: false, error: "not_claimable" };
  }
  if (claim.service_request_id !== request.id || !claim.request_offer_id || !claim.specialist_id || !claim.match_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (request.selected_specialist_id && request.selected_specialist_id !== claim.specialist_id) {
    return { ok: false, error: "already_claimed" };
  }

  const offerResult = await input.supabase
    .from("request_offers")
    .select("id, request_kind, offer_reason, service_request_id, specialist_id, billing_model, price_cents, currency, idempotency_key")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offerResult.error) return { ok: false, error: "retryable" };
  const offer = offerResult.data as {
    request_kind?: string;
    offer_reason?: string;
    service_request_id?: string | null;
    specialist_id?: string;
    billing_model?: string;
    price_cents?: number | null;
    currency?: string;
    idempotency_key?: string;
  } | null;
  if (!offer || !claim.specialist_id) return { ok: false, error: "not_claimable" };
  if (offer.request_kind !== "service_request") return { ok: false, error: "not_claimable" };
  if (!isCanonicalMatchedServiceRequestOffer(offer, request.id, claim.specialist_id)) {
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

  if (!claim.client_confirmed_at && claim.payment_rail === "store") {
    const confirmedAt = new Date().toISOString();
    const saved = await input.supabase
      .from("service_request_claims")
      .update({ client_confirmed_at: confirmedAt, updated_at: confirmedAt })
      .eq("id", claim.id)
      .eq("status", "reserved")
      .eq("payment_rail", "store")
      .is("client_confirmed_at", null)
      .is("client_rejected_at", null);
    if (saved.error) return { ok: false, error: "retryable" };
  } else if (!claim.client_confirmed_at && claim.payment_rail === "stripe") {
    const decided = await applyServiceRequestClientDecision(input.supabase, claim.id, "confirm");
    if (!decided.ok) return decided;
  } else if (!claim.client_confirmed_at) {
    return { ok: false, error: "not_claimable" };
  }

  const reread = await input.supabase
    .from("service_request_claims")
    .select("id, status, client_confirmed_at, client_rejected_at")
    .eq("id", claim.id)
    .maybeSingle();
  if (reread.error) return { ok: false, error: "retryable" };
  if (
    reread.data?.status !== "reserved" ||
    typeof reread.data.client_confirmed_at !== "string" ||
    (typeof reread.data.client_rejected_at === "string" && reread.data.client_rejected_at)
  ) {
    return { ok: false, error: "not_claimable" };
  }
  return { ok: true, clientConfirmedAt: reread.data.client_confirmed_at };
}
