import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveLeadPrice,
  type LeadPricingRule,
  type ResolvedLeadPrice,
} from "@/lib/leadEngine/pricingPolicy";
import type { RequestOfferPricingSegment } from "@/lib/leadEngine/requestOfferPolicy";

const PRICING_RULE_SELECT = [
  "id",
  "pricing_segment",
  "category_id",
  "specialist_service_id",
  "min_service_value_cents",
  "max_service_value_cents",
  "base_lead_price_cents",
  "percentage_basis_points",
  "min_lead_price_cents",
  "max_lead_price_cents",
  "default_max_buyers",
  "priority",
  "active",
  "starts_at",
  "ends_at",
  "created_at",
].join(",");

export type ShadowPricingInput = {
  pricingSegment: RequestOfferPricingSegment;
  categoryId?: string | null;
  specialistServiceId?: string | null;
  estimatedServiceValueMinCents?: number | null;
  estimatedServiceValueMaxCents?: number | null;
};

/**
 * Reads only inactive pricing rules and evaluates them explicitly in shadow mode.
 * This is observational only: it never changes live price_cents, billing_model,
 * entitlement, or Stripe checkout behavior.
 */
export async function resolveShadowLeadPrice(
  supabase: SupabaseClient,
  input: ShadowPricingInput,
): Promise<ResolvedLeadPrice | null> {
  const { data, error } = await supabase
    .from("lead_pricing_rules")
    .select(PRICING_RULE_SELECT)
    .eq("pricing_segment", input.pricingSegment)
    .eq("active", false);

  if (error) {
    console.warn("[lead-engine/shadow-pricing] pricing rule read failed", {
      code: error.code ?? "unknown",
    });
    return null;
  }

  return resolveLeadPrice((data ?? []) as LeadPricingRule[], {
    pricingSegment: input.pricingSegment,
    categoryId: input.categoryId ?? null,
    specialistServiceId: input.specialistServiceId ?? null,
    estimatedServiceValueMinCents: input.estimatedServiceValueMinCents ?? null,
    estimatedServiceValueMaxCents: input.estimatedServiceValueMaxCents ?? null,
    includeInactive: true,
  });
}

export function buildShadowPricingSnapshot(
  resolved: ResolvedLeadPrice,
  pricedAt = new Date(),
) {
  return {
    shadow_price_cents: resolved.priceCents,
    shadow_pricing_rule_id: resolved.ruleId,
    shadow_max_buyers: resolved.maxBuyers,
    shadow_priced_at: pricedAt.toISOString(),
  };
}
