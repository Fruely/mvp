import type { RequestOfferPricingSegment } from "@/lib/leadEngine/requestOfferPolicy";

export type LeadPricingRule = {
  id: string;
  pricing_segment: RequestOfferPricingSegment;
  category_id: string | null;
  specialist_service_id: string | null;
  min_service_value_cents: number | null;
  max_service_value_cents: number | null;
  base_lead_price_cents: number;
  percentage_basis_points: number | null;
  min_lead_price_cents: number;
  max_lead_price_cents: number | null;
  default_max_buyers: number;
  priority: number;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
};

export type LeadPricingInput = {
  pricingSegment: RequestOfferPricingSegment;
  categoryId?: string | null;
  specialistServiceId?: string | null;
  estimatedServiceValueMinCents?: number | null;
  estimatedServiceValueMaxCents?: number | null;
  at?: Date;
  /** Shadow-only escape hatch. Runtime/live pricing must leave this false. */
  includeInactive?: boolean;
};

export type ResolvedLeadPrice = {
  ruleId: string;
  priceCents: number;
  currency: "eur";
  maxBuyers: number;
  estimatedServiceValueCents: number | null;
};

function clamp(value: number, min: number, max: number | null): number {
  return Math.min(Math.max(value, min), max ?? Number.POSITIVE_INFINITY);
}

function estimatedServiceValue(input: LeadPricingInput): number | null {
  const min = input.estimatedServiceValueMinCents;
  const max = input.estimatedServiceValueMaxCents;

  if (typeof min === "number" && typeof max === "number") {
    return Math.round((min + max) / 2);
  }
  if (typeof min === "number") return min;
  if (typeof max === "number") return max;
  return null;
}

function isRuleCurrentlyEffective(rule: LeadPricingRule, at: Date): boolean {
  const now = at.getTime();
  if (rule.starts_at && new Date(rule.starts_at).getTime() > now) return false;
  if (rule.ends_at && new Date(rule.ends_at).getTime() <= now) return false;
  return true;
}

function isRuleApplicable(
  rule: LeadPricingRule,
  input: LeadPricingInput,
  serviceValueCents: number | null,
): boolean {
  if (rule.pricing_segment !== input.pricingSegment) return false;
  if (!input.includeInactive && !rule.active) return false;
  if (!isRuleCurrentlyEffective(rule, input.at ?? new Date())) return false;

  if (rule.category_id && rule.category_id !== (input.categoryId ?? null)) return false;
  if (
    rule.specialist_service_id &&
    rule.specialist_service_id !== (input.specialistServiceId ?? null)
  ) {
    return false;
  }

  if (rule.min_service_value_cents != null) {
    if (serviceValueCents == null || serviceValueCents < rule.min_service_value_cents) return false;
  }
  if (rule.max_service_value_cents != null) {
    if (serviceValueCents == null || serviceValueCents > rule.max_service_value_cents) return false;
  }

  return true;
}

function specificity(rule: LeadPricingRule): number {
  return Number(Boolean(rule.category_id)) + Number(Boolean(rule.specialist_service_id));
}

function createdAtMs(rule: LeadPricingRule): number {
  if (!rule.created_at) return 0;
  const parsed = new Date(rule.created_at).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Deterministic Lead Engine pricing resolver.
 *
 * Candidate order:
 * 1. lower priority
 * 2. more specific rule (service/category)
 * 3. newer rule
 * 4. stable rule id
 *
 * Price policy:
 * - start from base price;
 * - when estimated service value and percentage are present, use the higher of
 *   base price and percentage-derived price;
 * - clamp to the rule's lead-price floor/ceiling.
 *
 * This module is pure and does not write request_offers or call Stripe.
 */
export function resolveLeadPrice(
  rules: readonly LeadPricingRule[],
  input: LeadPricingInput,
): ResolvedLeadPrice | null {
  const serviceValueCents = estimatedServiceValue(input);

  const candidate = rules
    .filter((rule) => isRuleApplicable(rule, input, serviceValueCents))
    .slice()
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const specificityDiff = specificity(b) - specificity(a);
      if (specificityDiff !== 0) return specificityDiff;
      const createdDiff = createdAtMs(b) - createdAtMs(a);
      if (createdDiff !== 0) return createdDiff;
      return a.id.localeCompare(b.id);
    })[0];

  if (!candidate) return null;

  let rawPrice = candidate.base_lead_price_cents;
  if (
    serviceValueCents != null &&
    candidate.percentage_basis_points != null
  ) {
    const percentagePrice = Math.round(
      (serviceValueCents * candidate.percentage_basis_points) / 10_000,
    );
    rawPrice = Math.max(rawPrice, percentagePrice);
  }

  return {
    ruleId: candidate.id,
    priceCents: clamp(
      rawPrice,
      candidate.min_lead_price_cents,
      candidate.max_lead_price_cents,
    ),
    currency: "eur",
    maxBuyers: candidate.default_max_buyers,
    estimatedServiceValueCents: serviceValueCents,
  };
}
