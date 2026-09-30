import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "@/lib/leadEngine/requestOfferPolicy";

/**
 * Provider-neutral record that the owning client confirmed one reserved connection.
 * It does not inspect a payment provider, capture money, grant access, or open chat.
 */
export type RecordClientConfirmationResult =
  | { ok: true; clientConfirmedAt: string }
  | { ok: false; error: "not_found" | "not_claimable" | "already_claimed" | "invariant" | "retryable" };

function positivePrice(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
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
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at")
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
  } | null;
  if (!claim?.id || claim.status !== "reserved") return { ok: false, error: "not_claimable" };
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
  if (!offer) return { ok: false, error: "not_claimable" };
  if (offer.request_kind !== "service_request") return { ok: false, error: "not_claimable" };
  if (
    offer.service_request_id !== request.id ||
    offer.specialist_id !== claim.specialist_id ||
    offer.offer_reason !== "matched" ||
    offer.billing_model !== "pay_per_lead" ||
    offer.currency !== "eur" ||
    !positivePrice(offer.price_cents) ||
    offer.idempotency_key !==
      buildMatchedServiceRequestOfferIdempotencyKey({
        requestId: request.id,
        specialistId: claim.specialist_id,
      })
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

  if (!claim.client_confirmed_at) {
    const confirmedAt = new Date().toISOString();
    const saved = await input.supabase
      .from("service_request_claims")
      .update({ client_confirmed_at: confirmedAt, updated_at: confirmedAt })
      .eq("id", claim.id)
      .eq("status", "reserved")
      .is("client_confirmed_at", null);
    if (saved.error) return { ok: false, error: "retryable" };
  }

  const reread = await input.supabase
    .from("service_request_claims")
    .select("id, status, client_confirmed_at")
    .eq("id", claim.id)
    .maybeSingle();
  if (reread.error) return { ok: false, error: "retryable" };
  if (reread.data?.status !== "reserved" || typeof reread.data.client_confirmed_at !== "string") {
    return { ok: false, error: "not_claimable" };
  }
  return { ok: true, clientConfirmedAt: reread.data.client_confirmed_at };
}
