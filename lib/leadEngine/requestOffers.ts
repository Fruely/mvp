import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDirectLeadShadowOffer } from "@/lib/leadEngine/requestOfferPolicy";

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
