import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type MaterializeDirectPplOfferResult =
  | {
      ok: true;
      offerId: string;
      priceCents: number;
      currency: "eur";
      maxBuyers: number;
      alreadyMaterialized: boolean;
    }
  | {
      ok: false;
      reason:
        | "offer_not_found"
        | "offer_unavailable"
        | "shadow_not_ready"
        | "conflict"
        | "db_error";
    };

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

export async function materializeDirectPplOffer(
  supabase: SupabaseClient,
  input: { offerId: string; specialistId: string },
): Promise<MaterializeDirectPplOfferResult> {
  const { data: offer, error: loadError } = await supabase
    .from("request_offers")
    .select(
      "id, request_kind, specialist_id, billing_model, status, price_cents, currency, max_buyers_snapshot, shadow_price_cents, shadow_pricing_rule_id, shadow_max_buyers, shadow_priced_at, pricing_rule_id",
    )
    .eq("id", input.offerId)
    .eq("specialist_id", input.specialistId)
    .eq("request_kind", "direct_lead")
    .maybeSingle();

  if (loadError) return { ok: false, reason: "db_error" };
  if (!offer) return { ok: false, reason: "offer_not_found" };

  if (["declined", "expired"].includes(String(offer.status))) {
    return { ok: false, reason: "offer_unavailable" };
  }

  const livePrice = positiveInt(offer.price_cents);
  const liveMaxBuyers = positiveInt(offer.max_buyers_snapshot);
  if (
    offer.billing_model === "pay_per_lead" &&
    livePrice != null &&
    String(offer.currency).toLowerCase() === "eur" &&
    liveMaxBuyers != null
  ) {
    return {
      ok: true,
      offerId: String(offer.id),
      priceCents: livePrice,
      currency: "eur",
      maxBuyers: liveMaxBuyers,
      alreadyMaterialized: true,
    };
  }

  if (offer.billing_model !== "subscription" || offer.price_cents != null) {
    return { ok: false, reason: "conflict" };
  }

  const shadowPrice = positiveInt(offer.shadow_price_cents);
  const shadowMaxBuyers = positiveInt(offer.shadow_max_buyers);
  if (
    shadowPrice == null ||
    shadowMaxBuyers == null ||
    !offer.shadow_pricing_rule_id ||
    !offer.shadow_priced_at
  ) {
    return { ok: false, reason: "shadow_not_ready" };
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("request_offers")
    .update({
      billing_model: "pay_per_lead",
      price_cents: shadowPrice,
      pricing_rule_id: offer.shadow_pricing_rule_id,
      max_buyers_snapshot: shadowMaxBuyers,
      updated_at: nowIso,
    })
    .eq("id", input.offerId)
    .eq("specialist_id", input.specialistId)
    .eq("request_kind", "direct_lead")
    .eq("billing_model", "subscription")
    .is("price_cents", null)
    .select("id, billing_model, price_cents, currency, max_buyers_snapshot")
    .maybeSingle();

  if (updateError) return { ok: false, reason: "db_error" };

  if (!updated) {
    const { data: refetched, error: refetchError } = await supabase
      .from("request_offers")
      .select("id, billing_model, price_cents, currency, max_buyers_snapshot")
      .eq("id", input.offerId)
      .eq("specialist_id", input.specialistId)
      .maybeSingle();

    if (refetchError) return { ok: false, reason: "db_error" };
    const refetchedPrice = positiveInt(refetched?.price_cents);
    const refetchedMaxBuyers = positiveInt(refetched?.max_buyers_snapshot);
    if (
      refetched?.billing_model === "pay_per_lead" &&
      refetchedPrice != null &&
      String(refetched.currency).toLowerCase() === "eur" &&
      refetchedMaxBuyers != null
    ) {
      return {
        ok: true,
        offerId: String(refetched.id),
        priceCents: refetchedPrice,
        currency: "eur",
        maxBuyers: refetchedMaxBuyers,
        alreadyMaterialized: true,
      };
    }
    return { ok: false, reason: "conflict" };
  }

  return {
    ok: true,
    offerId: String(updated.id),
    priceCents: shadowPrice,
    currency: "eur",
    maxBuyers: shadowMaxBuyers,
    alreadyMaterialized: false,
  };
}
