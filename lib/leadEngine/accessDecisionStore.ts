import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isDirectLeadPplCheckoutEnabled,
  mapDirectLeadOfferRow,
  type DirectLeadAccessFacts,
} from "@/lib/leadEngine/accessDecision";

/**
 * Thin DB adapter for direct-lead access facts.
 * Direct PPL payment/grant tables are not wired yet: paidEntitlement stays false
 * until a later activation step. Offer reads are observational and never write
 * live `price_cents`.
 */
export async function loadDirectLeadAccessFacts(
  supabase: SupabaseClient,
  input: {
    leadId: string;
    specialistId: string;
    planStatus: string | null;
    contactsUnlocked: boolean;
  },
): Promise<DirectLeadAccessFacts> {
  let offer: DirectLeadAccessFacts["offer"] = null;

  const { data, error } = await supabase
    .from("request_offers")
    .select("id, status, price_cents, currency, shadow_price_cents")
    .eq("request_kind", "direct_lead")
    .eq("lead_id", input.leadId)
    .eq("specialist_id", input.specialistId)
    .order("offered_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("[lead-engine/access] request_offers read failed", {
      code: error.code ?? "unknown",
    });
  } else {
    offer = mapDirectLeadOfferRow(
      (data as Record<string, unknown> | null) ?? null,
    );
  }

  return {
    leadId: input.leadId,
    specialistId: input.specialistId,
    planStatus: input.planStatus,
    contactsUnlocked: input.contactsUnlocked === true,
    paidEntitlement: false,
    paymentProcessing: false,
    offer,
    directPplCheckoutEnabled: isDirectLeadPplCheckoutEnabled(),
  };
}
