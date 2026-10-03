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

