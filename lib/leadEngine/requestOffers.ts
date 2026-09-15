import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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

export type EnsureDirectLeadOfferResult =
  | { ok: true; kind: "created" | "existing" }
  | { ok: false; kind: "shadow_write_failed" };

/**
 * Stable server-side key for the initial direct-selection offer.
 * A later legitimate redistribution/re-offer must use a different key.
 */
export function buildDirectLeadOfferIdempotencyKey(input: {
  leadId: string;
  specialistId: string;
}): string {
  return `direct-lead:${input.leadId}:specialist:${input.specialistId}:initial`;
}

/**
 * Phase-1 shadow payload only.
 *
 * Current direct-lead production access is subscription-gated, so shadow rows snapshot
 * billing_model=subscription until the new commercial choice model is introduced.
 * price_cents deliberately remains NULL: dynamic pricing is not live yet.
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

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

/**
 * Best-effort shadow write. This function MUST NOT become a dependency of direct lead
 * creation until request_offers is deployed and the Lead Engine rollout is explicitly
 * promoted from shadow mode.
 */
export async function ensureDirectLeadShadowOffer(
  supabase: SupabaseClient,
  input: { leadId: string; specialistId: string },
): Promise<EnsureDirectLeadOfferResult> {
  try {
    const payload = buildDirectLeadShadowOffer(input);
    const { error } = await supabase.from("request_offers").insert(payload);

    if (!error) {
      return { ok: true, kind: "created" };
    }

    if (isUniqueViolation(error)) {
      return { ok: true, kind: "existing" };
    }

    console.warn("[lead-engine/request-offers] shadow direct offer write failed", {
      code: error.code ?? "unknown",
    });
    return { ok: false, kind: "shadow_write_failed" };
  } catch (error) {
    console.warn("[lead-engine/request-offers] shadow direct offer write threw", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return { ok: false, kind: "shadow_write_failed" };
  }
}
