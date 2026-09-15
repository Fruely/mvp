import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isDirectLeadPplCheckoutEnabled,
  mapDirectLeadOfferRow,
  type DirectLeadAccessFacts,
} from "@/lib/leadEngine/accessDecision";

/**
 * Thin DB adapter for direct-lead access facts.
 *
 * request_offer_access_grants is the only payment entitlement proof for direct PPL.
 * A payment row by itself never unlocks contacts. Pending payment is observational
 * processing state only. Reads fail closed and never write live price_cents or create
 * Checkout sessions.
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
  let paidEntitlement = false;
  let paymentProcessing = false;

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

  if (offer) {
    const { data: grant, error: grantError } = await supabase
      .from("request_offer_access_grants")
      .select("id")
      .eq("offer_id", offer.id)
      .eq("specialist_id", input.specialistId)
      .is("revoked_at", null)
      .maybeSingle();

    if (grantError) {
      console.warn("[lead-engine/access] request_offer_access_grants read failed", {
        code: grantError.code ?? "unknown",
      });
    } else {
      paidEntitlement = Boolean(grant?.id);
    }

    if (!paidEntitlement) {
      const { data: pendingPayment, error: paymentError } = await supabase
        .from("request_offer_payments")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("specialist_id", input.specialistId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        console.warn("[lead-engine/access] request_offer_payments read failed", {
          code: paymentError.code ?? "unknown",
        });
      } else {
        paymentProcessing = Boolean(pendingPayment?.id);
      }
    }
  }

  return {
    leadId: input.leadId,
    specialistId: input.specialistId,
    planStatus: input.planStatus,
    contactsUnlocked: input.contactsUnlocked === true,
    paidEntitlement,
    paymentProcessing,
    offer,
    directPplCheckoutEnabled: isDirectLeadPplCheckoutEnabled(),
  };
}
