import assert from "node:assert/strict";
import test from "node:test";

import { resolveLeadPrice, type LeadPricingRule } from "@/lib/leadEngine/pricingPolicy";

function rule(overrides: Partial<LeadPricingRule> = {}): LeadPricingRule {
  return {
    id: "rule-professional",
    pricing_segment: "professional",
    category_id: null,
    specialist_service_id: null,
    min_service_value_cents: null,
    max_service_value_cents: null,
    base_lead_price_cents: 2000,
    percentage_basis_points: 800,
    min_lead_price_cents: 2000,
    max_lead_price_cents: 8000,
    default_max_buyers: 1,
    priority: 100,
    active: false,
    starts_at: null,
    ends_at: null,
    created_at: "2026-09-15T11:08:13.017Z",
    ...overrides,
  };
}

test("inactive rules are ignored by default", () => {
  assert.equal(
    resolveLeadPrice([rule()], { pricingSegment: "professional" }),
    null,
  );
});

test("shadow mode may explicitly evaluate inactive baseline rules", () => {
  assert.deepEqual(
    resolveLeadPrice([rule()], {
      pricingSegment: "professional",
      includeInactive: true,
    }),
    {
      ruleId: "rule-professional",
      priceCents: 2000,
      currency: "eur",
      maxBuyers: 1,
      estimatedServiceValueCents: null,
    },
  );
});

test("percentage price can exceed base and is clamped to ceiling", () => {
  const result = resolveLeadPrice([rule()], {
    pricingSegment: "professional",
    estimatedServiceValueMinCents: 200_000,
    estimatedServiceValueMaxCents: 200_000,
    includeInactive: true,
  });

  assert.equal(result?.estimatedServiceValueCents, 200_000);
  assert.equal(result?.priceCents, 8000);
});

test("service-value range uses midpoint deterministically", () => {
  const result = resolveLeadPrice([rule()], {
    pricingSegment: "professional",
    estimatedServiceValueMinCents: 50_000,
    estimatedServiceValueMaxCents: 100_000,
    includeInactive: true,
  });

  assert.equal(result?.estimatedServiceValueCents, 75_000);
  assert.equal(result?.priceCents, 6000);
});

test("lower priority wins before specificity", () => {
  const generic = rule({ id: "generic", priority: 10 });
  const specific = rule({
    id: "specific",
    priority: 20,
    category_id: "category-1",
    base_lead_price_cents: 3000,
  });

  const result = resolveLeadPrice([specific, generic], {
    pricingSegment: "professional",
    categoryId: "category-1",
    includeInactive: true,
  });

  assert.equal(result?.ruleId, "generic");
});

test("more specific rule wins when priorities tie", () => {
  const generic = rule({ id: "generic" });
  const category = rule({
    id: "category",
    category_id: "category-1",
    base_lead_price_cents: 3000,
  });
  const service = rule({
    id: "service",
    category_id: "category-1",
    specialist_service_id: "service-1",
    base_lead_price_cents: 4000,
  });

  const result = resolveLeadPrice([generic, category, service], {
    pricingSegment: "professional",
    categoryId: "category-1",
    specialistServiceId: "service-1",
    includeInactive: true,
  });

  assert.equal(result?.ruleId, "service");
  assert.equal(result?.priceCents, 4000);
});

test("segment mismatch does not resolve", () => {
  assert.equal(
    resolveLeadPrice([rule()], {
      pricingSegment: "business",
      includeInactive: true,
    }),
    null,
  );
});

test("future and expired rules are ignored", () => {
  const at = new Date("2026-09-15T12:00:00Z");
  const future = rule({
    id: "future",
    starts_at: "2026-09-16T00:00:00Z",
  });
  const expired = rule({
    id: "expired",
    ends_at: "2026-09-15T11:00:00Z",
  });

  assert.equal(
    resolveLeadPrice([future, expired], {
      pricingSegment: "professional",
      includeInactive: true,
      at,
    }),
    null,
  );
});
