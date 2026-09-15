import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDirectLeadShadowOffer } from "@/lib/leadEngine/requestOfferPolicy";

export type EnsureDirectLeadOfferResult =
  | { ok: true; kind: "created" | "existing" }
  | { ok: false; kind: "shadow_write_failed" };

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
