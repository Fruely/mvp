export const REQUEST_OFFER_REQUEST_KINDS = ["direct_lead", "service_request"] as const;
export type RequestOfferRequestKind = (typeof REQUEST_OFFER_REQUEST_KINDS)[number];

export const REQUEST_OFFER_REASONS = [
  "direct_selection",
  "matched",
  "redistributed",
  "manual",
] as const;
export type RequestOfferReason = (typeof REQUEST_OFFER_REASONS)[number];

export const REQUEST_OFFER_PRICING_SEGMENTS = [
  "consumer",
  "professional",
  "business",
] as const;
export type RequestOfferPricingSegment =
  (typeof REQUEST_OFFER_PRICING_SEGMENTS)[number];

export const REQUEST_OFFER_BILLING_MODELS = ["subscription", "pay_per_lead"] as const;
export type RequestOfferBillingModel =
  (typeof REQUEST_OFFER_BILLING_MODELS)[number];

export const REQUEST_OFFER_STATUSES = [
  "offered",
  "viewed",
  "accepted",
  "paid",
  "declined",
  "expired",
  "fulfilled",
] as const;
export type RequestOfferStatus = (typeof REQUEST_OFFER_STATUSES)[number];

export type RequestOfferInsert = {
  request_kind: RequestOfferRequestKind;
  lead_id: string | null;
  service_request_id: string | null;
  promotion_id: string | null;
  specialist_id: string;
  offer_reason: RequestOfferReason;
  pricing_segment: RequestOfferPricingSegment;
  billing_model: RequestOfferBillingModel;
  price_cents: number | null;
  currency: "eur";
  status: RequestOfferStatus;
  idempotency_key: string;
};

/** Stable server-side key for the first automatic match of an open request. */
export function buildServiceRequestMatchOfferIdempotencyKey(input: {
  serviceRequestId: string;
  specialistId: string;
}): string {
  return `service-request:${input.serviceRequestId}:specialist:${input.specialistId}:match:initial`;
}

/**
 * Initial automatic match offer for an open service request.
 *
 * The offer starts with the same safe commercial posture as a direct-lead
 * shadow offer: subscription is the current entitlement path and the live
 * pay-per-lead price remains unset. Shadow pricing can be attached separately
 * without changing checkout, contact visibility, or billing behaviour.
 */
export function buildServiceRequestMatchedShadowOffer(input: {
  serviceRequestId: string;
  specialistId: string;
}): RequestOfferInsert {
  return {
    request_kind: "service_request",
    lead_id: null,
    service_request_id: input.serviceRequestId,
    promotion_id: null,
    specialist_id: input.specialistId,
    offer_reason: "matched",
    pricing_segment: "professional",
    billing_model: "subscription",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key: buildServiceRequestMatchOfferIdempotencyKey(input),
  };
}

/** Stable server-side key for the initial direct-selection offer. */
export function buildDirectLeadOfferIdempotencyKey(input: {
  leadId: string;
  specialistId: string;
}): string {
  return `direct-lead:${input.leadId}:specialist:${input.specialistId}:initial`;
}

/**
 * Initial direct-selection offer.
 *
 * New offers are created with a subscription billing snapshot and a separate shadow
 * price. When an eligible specialist without tariff access chooses pay-per-lead,
 * server-side checkout materializes that shadow snapshot into immutable live
 * pay_per_lead fields before Stripe Checkout is created.
 *
 * price_cents remains NULL until that materialization step; the browser never chooses
 * the commercial price.
 */
export function buildDirectLeadShadowOffer(input: {
  leadId: string;
  specialistId: string;
}): RequestOfferInsert {
  return {
    request_kind: "direct_lead",
    lead_id: input.leadId,
    service_request_id: null,
    promotion_id: null,
    specialist_id: input.specialistId,
    offer_reason: "direct_selection",
    pricing_segment: "professional",
    billing_model: "subscription",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key: buildDirectLeadOfferIdempotencyKey(input),
  };
}
