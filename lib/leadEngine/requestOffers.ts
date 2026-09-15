import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDirectLeadShadowOffer } from "@/lib/leadEngine/requestOfferPolicy";
import {
  buildShadowPricingSnapshot,
  resolveShadowLeadPrice,
} from "@/lib/leadEngine/shadowPricing";
import {
  deriveHighestShadowServiceValue,
  type ShadowServiceValueRow,
} from "@/lib/leadEngine/serviceValuePolicy";

export const LEAD_ENGINE_SHADOW_OFFERS_ENV = "LEAD_ENGINE_SHADOW_OFFERS_ENABLED";

export type EnsureDirectLeadOfferResult =
  | { ok: true; kind: "disabled" | "created" | "existing" }
  | { ok: false; kind: "shadow_write_failed" };

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

export function areLeadEngineShadowOffersEnabled(): boolean {
  return process.env[LEAD_ENGINE_SHADOW_OFFERS_ENV] === "true";
}

async function loadSpecialistPricingContext(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<{
  categoryId: string | null;
  specialistServiceId: string | null;
  estimatedServiceValueMinCents: number | null;
  estimatedServiceValueMaxCents: number | null;
}> {
  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("category_id")
    .eq("id", specialistId)
    .maybeSingle();

  if (specialistError) {
    console.warn("[lead-engine/request-offers] specialist pricing context read failed", {
      code: specialistError.code ?? "unknown",
    });
    return {
      categoryId: null,
      specialistServiceId: null,
      estimatedServiceValueMinCents: null,
      estimatedServiceValueMaxCents: null,
    };
  }

  const categoryId =
    specialist && typeof specialist.category_id === "string"
      ? specialist.category_id
      : null;

  const { data: services, error: servicesError } = await supabase
    .from("specialist_services")
    .select("id, category_id, pricing_type, price_from, price_to, currency, is_active")
    .eq("specialist_id", specialistId)
    .eq("is_active", true);

  if (servicesError) {
    console.warn("[lead-engine/request-offers] specialist service pricing read failed", {
      code: servicesError.code ?? "unknown",
    });
    return {
      categoryId,
      specialistServiceId: null,
      estimatedServiceValueMinCents: null,
      estimatedServiceValueMaxCents: null,
    };
  }

  const serviceValue = deriveHighestShadowServiceValue(
    (services ?? []) as unknown as ShadowServiceValueRow[],
    categoryId,
  );

  return {
    categoryId,
    specialistServiceId: serviceValue?.specialistServiceId ?? null,
    estimatedServiceValueMinCents:
      serviceValue?.estimatedServiceValueMinCents ?? null,
    estimatedServiceValueMaxCents:
      serviceValue?.estimatedServiceValueMaxCents ?? null,
  };
}

async function attachDirectLeadShadowPricing(
  supabase: SupabaseClient,
  input: { leadId: string; specialistId: string },
): Promise<void> {
  try {
    const context = await loadSpecialistPricingContext(supabase, input.specialistId);
    const resolved = await resolveShadowLeadPrice(supabase, {
      pricingSegment: "professional",
      categoryId: context.categoryId,
      specialistServiceId: context.specialistServiceId,
      estimatedServiceValueMinCents: context.estimatedServiceValueMinCents,
      estimatedServiceValueMaxCents: context.estimatedServiceValueMaxCents,
    });

    if (!resolved) return;

    const idempotencyKey = `direct-lead:${input.leadId}:specialist:${input.specialistId}:initial`;
    const { error } = await supabase
      .from("request_offers")
      .update(buildShadowPricingSnapshot(resolved))
      .eq("idempotency_key", idempotencyKey)
      .is("shadow_priced_at", null);

    if (error) {
      console.warn("[lead-engine/request-offers] shadow pricing snapshot write failed", {
        code: error.code ?? "unknown",
      });
    }
  } catch (error) {
    console.warn("[lead-engine/request-offers] shadow pricing snapshot write threw", {
      name: error instanceof Error ? error.name : "unknown",
    });
  }
}

/**
 * Best-effort shadow write. Disabled by default until the additive request_offers
 * migration has been applied to the target Supabase environment.
 *
 * This function MUST NOT become a dependency of direct lead creation while Phase 1 is
 * in shadow mode.
 */
export async function ensureDirectLeadShadowOffer(
  supabase: SupabaseClient,
  input: { leadId: string; specialistId: string },
): Promise<EnsureDirectLeadOfferResult> {
  if (!areLeadEngineShadowOffersEnabled()) {
    return { ok: true, kind: "disabled" };
  }

  try {
    const payload = buildDirectLeadShadowOffer(input);
    const { error } = await supabase.from("request_offers").insert(payload);

    if (!error) {
      await attachDirectLeadShadowPricing(supabase, input);
      return { ok: true, kind: "created" };
    }

    if (isUniqueViolation(error)) {
      // Best-effort backfill if an idempotent replay finds an older offer without
      // a shadow pricing snapshot.
      await attachDirectLeadShadowPricing(supabase, input);
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
