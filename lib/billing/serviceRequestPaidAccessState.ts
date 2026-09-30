import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "@/lib/leadEngine/requestOfferPolicy";

/**
 * Statuses that already occupy the one-active-payment slot for a claim.
 * Same set as service-request authorization. failed, expired, released,
 * refunded, and disputed are not in it. Refunded and disputed do not by
 * themselves block a later purchase; an active grant still does.
 * Provider is irrelevant. This is not an entitlement.
 */
export const ACTIVE_REQUEST_OFFER_PAYMENT_STATUSES = ["pending", "authorized", "paid"] as const;

export type PaymentRequiredOffer = {
  id: string;
  requestKind: unknown;
  offerReason: unknown;
  billingModel: unknown;
  serviceRequestId: unknown;
  specialistId: unknown;
  currency: unknown;
  priceCents: unknown;
  idempotencyKey: unknown;
};

export type PaymentRequiredClaim = {
  id: string;
  status: unknown;
  serviceRequestId: unknown;
  matchId: unknown;
  specialistId: unknown;
  requestOfferId: unknown;
  clientConfirmedAt: unknown;
};

export type PaymentRequiredGrant = {
  offerId: string;
  specialistId: string;
  revokedAt: unknown;
};

export type PaymentRequiredPayment = {
  claimId: string;
  status: unknown;
};

export function isActiveRequestOfferPaymentStatus(status: unknown): boolean {
  return (ACTIVE_REQUEST_OFFER_PAYMENT_STATUSES as readonly unknown[]).includes(status);
}

function positivePrice(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function confirmedAt(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function canonicalOffer(
  offer: PaymentRequiredOffer | null,
  requestId: string,
  specialistId: string,
): offer is PaymentRequiredOffer {
  if (!offer) return false;
  return (
    offer.requestKind === "service_request" &&
    offer.offerReason === "matched" &&
    offer.billingModel === "pay_per_lead" &&
    offer.serviceRequestId === requestId &&
    offer.specialistId === specialistId &&
    offer.currency === "eur" &&
    positivePrice(offer.priceCents) &&
    offer.idempotencyKey ===
      buildMatchedServiceRequestOfferIdempotencyKey({ requestId, specialistId })
  );
}

/**
 * True only when the specialist must initiate paid access.
 * An in-flight or settled payment, or an active grant, makes this false.
 * This function does not write.
 */
export function derivePaymentRequired(input: {
  requestId: string;
  matchId: string;
  specialistId: string;
  offer: PaymentRequiredOffer | null;
  claim: PaymentRequiredClaim | null;
  grants: readonly PaymentRequiredGrant[];
  payments: readonly PaymentRequiredPayment[];
}): boolean {
  const { offer, claim } = input;
  if (!canonicalOffer(offer, input.requestId, input.specialistId) || !claim) return false;
  if (claim.status !== "reserved") return false;
  if (claim.serviceRequestId !== input.requestId) return false;
  if (claim.matchId !== input.matchId) return false;
  if (claim.specialistId !== input.specialistId) return false;
  if (claim.requestOfferId !== offer.id) return false;
  if (!confirmedAt(claim.clientConfirmedAt)) return false;
  const grantActive = input.grants.some(
    (grant) =>
      grant.offerId === offer.id &&
      grant.specialistId === input.specialistId &&
      grant.revokedAt == null,
  );
  if (grantActive) return false;
  const paymentActive = input.payments.some(
    (payment) => payment.claimId === claim.id && isActiveRequestOfferPaymentStatus(payment.status),
  );
  return !paymentActive;
}

type MatchKey = { matchId: string; requestId: string };

function asRow(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function offerFact(row: Record<string, unknown>): PaymentRequiredOffer | null {
  if (typeof row.id !== "string" || !row.id) return null;
  return {
    id: row.id,
    requestKind: row.request_kind,
    offerReason: row.offer_reason,
    billingModel: row.billing_model,
    serviceRequestId: row.service_request_id,
    specialistId: row.specialist_id,
    currency: row.currency,
    priceCents: row.price_cents,
    idempotencyKey: row.idempotency_key,
  };
}

function claimFact(row: Record<string, unknown>): PaymentRequiredClaim | null {
  if (typeof row.id !== "string" || !row.id) return null;
  return {
    id: row.id,
    status: row.status,
    serviceRequestId: row.service_request_id,
    matchId: row.match_id,
    specialistId: row.specialist_id,
    requestOfferId: row.request_offer_id,
    clientConfirmedAt: row.client_confirmed_at,
  };
}

/**
 * One batch read for every match in the preview.
 * A lookup error fails closed to false so a second charge is not suggested.
 */
export async function loadPaymentRequiredByMatch(
  supabase: SupabaseClient,
  specialistId: string,
  items: readonly MatchKey[],
  offers: readonly Record<string, unknown>[],
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  for (const item of items) result.set(item.matchId, false);
  if (!items.length) return result;

  const matchIds = items.map((item) => item.matchId);
  const claims = await supabase
    .from("service_request_claims")
    .select("id, status, service_request_id, match_id, specialist_id, request_offer_id, client_confirmed_at")
    .eq("specialist_id", specialistId)
    .in("match_id", matchIds);
  if (claims.error || !Array.isArray(claims.data)) return result;
  const claimRows = (claims.data as unknown[]).map(asRow).filter((row): row is Record<string, unknown> => Boolean(row));
  const claimIds = claimRows.map((row) => row.id).filter((id): id is string => typeof id === "string");
  const offerFacts = offers.map(offerFact).filter((offer): offer is PaymentRequiredOffer => Boolean(offer));

  let grantRows: PaymentRequiredGrant[] = [];
  const offerIds: string[] = [];
  for (const row of claimRows) {
    if (typeof row.request_offer_id === "string" && !offerIds.includes(row.request_offer_id)) {
      offerIds.push(row.request_offer_id);
    }
  }
  if (offerIds.length) {
    const grants = await supabase
      .from("request_offer_access_grants")
      .select("offer_id, specialist_id, revoked_at")
      .eq("specialist_id", specialistId)
      .in("offer_id", offerIds);
    if (grants.error || !Array.isArray(grants.data)) return result;
    grantRows = (grants.data as unknown[]).flatMap((value) => {
      const row = asRow(value);
      if (!row || typeof row.offer_id !== "string" || typeof row.specialist_id !== "string") return [];
      return [{ offerId: row.offer_id, specialistId: row.specialist_id, revokedAt: row.revoked_at }];
    });
  }

  let paymentRows: PaymentRequiredPayment[] = [];
  if (claimIds.length) {
    const payments = await supabase
      .from("request_offer_payments")
      .select("service_request_claim_id, status")
      .in("service_request_claim_id", claimIds);
    if (payments.error || !Array.isArray(payments.data)) return result;
    paymentRows = (payments.data as unknown[]).flatMap((value) => {
      const row = asRow(value);
      if (!row || typeof row.service_request_claim_id !== "string") return [];
      return [{ claimId: row.service_request_claim_id, status: row.status }];
    });
  }

  const claimsByMatch = new Map<string, PaymentRequiredClaim[]>();
  for (const row of claimRows) {
    const claim = claimFact(row);
    if (!claim || typeof claim.matchId !== "string") continue;
    const current = claimsByMatch.get(claim.matchId) ?? [];
    current.push(claim);
    claimsByMatch.set(claim.matchId, current);
  }

  for (const item of items) {
    const matchClaims = claimsByMatch.get(item.matchId) ?? [];
    const required = matchClaims.some((claim) => {
      const offer = offerFacts.find((candidate) => candidate.id === claim.requestOfferId) ?? null;
      return derivePaymentRequired({
        requestId: item.requestId,
        matchId: item.matchId,
        specialistId,
        offer,
        claim,
        grants: grantRows,
        payments: paymentRows,
      });
    });
    result.set(item.matchId, required);
  }
  return result;
}
