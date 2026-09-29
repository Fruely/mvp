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

/** Statuses that can still be reserved and authorized. Paid, declined, expired, and fulfilled cannot. */
export const PURCHASABLE_SERVICE_REQUEST_OFFER_STATUSES = ["offered", "viewed", "accepted"] as const;
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

/** Stable server key for the initial matched service-request offer. */
export function buildMatchedServiceRequestOfferIdempotencyKey(input: {
  requestId: string;
  specialistId: string;
}): string {
  return `service-request:${input.requestId}:specialist:${input.specialistId}:matched:initial`;
}

/**
 * Initial matched service-request offer.
 * price_cents stays null until a later server-authoritative pricing decision.
 * This function has no price argument.
 */
export function buildMatchedServiceRequestOffer(input: {
  requestId: string;
  specialistId: string;
}): RequestOfferInsert {
  return {
    request_kind: "service_request",
    lead_id: null,
    service_request_id: input.requestId,
    promotion_id: null,
    specialist_id: input.specialistId,
    offer_reason: "matched",
    pricing_segment: "consumer",
    billing_model: "pay_per_lead",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey(input),
  };
}
