import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMatchedServiceRequestOffer } from "@/lib/leadEngine/requestOfferPolicy";

/**
 * Persists the initial matched service-request offer on request_offers.
 *
 * Lives outside requestOffers.ts because that module is the direct-lead shadow
 * writer and imports server-only shadow pricing. Matching must not load or
 * apply that pricing. This file is the only writer for the matched offer.
 */
export const SERVICE_REQUEST_COMMERCIAL_OFFERS_FLAG = "SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED";

export function areServiceRequestCommercialOffersEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env[SERVICE_REQUEST_COMMERCIAL_OFFERS_FLAG]?.trim().toLowerCase() === "true";
}

export type EnsureMatchedServiceRequestOffersResult =
  | { ok: true; kind: "disabled" | "ready" }
  | { ok: false; kind: "offer_write_failed" };

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

export async function ensureMatchedServiceRequestOffers(
  supabase: Pick<SupabaseClient, "from">,
  input: { requestId: string; specialistIds: readonly string[] },
  env: NodeJS.ProcessEnv = process.env,
): Promise<EnsureMatchedServiceRequestOffersResult> {
  if (!areServiceRequestCommercialOffersEnabled(env)) {
    return { ok: true, kind: "disabled" };
  }

  const specialistIds: string[] = [];
  for (const id of input.specialistIds) {
    if (id.length > 0 && !specialistIds.includes(id)) specialistIds.push(id);
  }
  try {
    for (const specialistId of specialistIds) {
      const payload = buildMatchedServiceRequestOffer({
        requestId: input.requestId,
        specialistId,
      });
      const { error } = await supabase.from("request_offers").insert(payload);
      if (!error || isUniqueViolation(error)) continue;
      console.error("[lead-engine/matched-offer] write failed", {
        code: error.code ?? "unknown",
      });
      return { ok: false, kind: "offer_write_failed" };
    }
    return { ok: true, kind: "ready" };
  } catch (error) {
    console.error("[lead-engine/matched-offer] write threw", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, kind: "offer_write_failed" };
  }
}
