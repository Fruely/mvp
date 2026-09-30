import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "@/lib/leadEngine/requestOfferPolicy";

function positivePriceCents(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Legacy immediate TAKE must not finalize a connection that already has the
 * canonical positive matched paid offer. Offer status does not reopen a free path.
 * This check is not used by finalizeServiceRequestConnection.
 */
export async function legacyClaimBlockedByPaidOffer(
  supabase: Pick<SupabaseClient, "from">,
  input: { serviceRequestId: string; specialistId: string },
): Promise<boolean> {
  const idempotencyKey = buildMatchedServiceRequestOfferIdempotencyKey({
    requestId: input.serviceRequestId,
    specialistId: input.specialistId,
  });
  const result = await supabase
    .from("request_offers")
    .select("price_cents")
    .eq("idempotency_key", idempotencyKey)
    .eq("request_kind", "service_request")
    .eq("service_request_id", input.serviceRequestId)
    .eq("specialist_id", input.specialistId)
    .eq("offer_reason", "matched")
    .eq("billing_model", "pay_per_lead")
    .eq("currency", "eur")
    .maybeSingle();
  if (result.error) return true;
  return positivePriceCents(result.data?.price_cents);
}
