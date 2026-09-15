import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDirectLeadPplCheckoutEnabled,
  mapDirectLeadOfferRow,
  resolveDirectLeadAccessDecision,
  type LeadAccessDecision,
} from "@/lib/leadEngine/accessDecision";

type DashboardLeadAccessInput = {
  id: string;
  contacts_unlocked: boolean;
};

export type DashboardLeadAccessDecisionMap = Record<string, LeadAccessDecision>;

export async function loadDashboardLeadAccessDecisions(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    planStatus: string | null;
    leads: DashboardLeadAccessInput[];
  },
): Promise<DashboardLeadAccessDecisionMap> {
  const leadIds = input.leads.map((lead) => lead.id).filter(Boolean);
  if (leadIds.length === 0) return {};

  const offerByLeadId = new Map<string, Record<string, unknown>>();
  const { data: offerRows, error: offerError } = await supabase
    .from("request_offers")
    .select("id, lead_id, status, price_cents, currency, shadow_price_cents, offered_at")
    .eq("request_kind", "direct_lead")
    .eq("specialist_id", input.specialistId)
    .in("lead_id", leadIds)
    .order("offered_at", { ascending: false });

  if (offerError) {
    console.warn("[lead-engine/dashboard-access] request_offers read failed", {
      code: offerError.code ?? "unknown",
    });
  } else {
    for (const row of offerRows ?? []) {
      const leadId = typeof row.lead_id === "string" ? row.lead_id : null;
      if (leadId && !offerByLeadId.has(leadId)) {
        offerByLeadId.set(leadId, row as Record<string, unknown>);
      }
    }
  }

  const offerIds = Array.from(offerByLeadId.values())
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));

  const activeGrantOfferIds = new Set<string>();
  const pendingPaymentOfferIds = new Set<string>();

  if (offerIds.length > 0) {
    const [{ data: grants, error: grantError }, { data: payments, error: paymentError }] =
      await Promise.all([
        supabase
          .from("request_offer_access_grants")
          .select("offer_id")
          .eq("specialist_id", input.specialistId)
          .in("offer_id", offerIds)
          .is("revoked_at", null),
        supabase
          .from("request_offer_payments")
          .select("offer_id")
          .eq("specialist_id", input.specialistId)
          .in("offer_id", offerIds)
          .eq("status", "pending"),
      ]);

    if (grantError) {
      console.warn("[lead-engine/dashboard-access] grants read failed", {
        code: grantError.code ?? "unknown",
      });
    } else {
      for (const row of grants ?? []) {
        if (typeof row.offer_id === "string") activeGrantOfferIds.add(row.offer_id);
      }
    }

    if (paymentError) {
      console.warn("[lead-engine/dashboard-access] payments read failed", {
        code: paymentError.code ?? "unknown",
      });
    } else {
      for (const row of payments ?? []) {
        if (typeof row.offer_id === "string") pendingPaymentOfferIds.add(row.offer_id);
      }
    }
  }

  const directPplCheckoutEnabled = isDirectLeadPplCheckoutEnabled();
  const decisions: DashboardLeadAccessDecisionMap = {};

  for (const lead of input.leads) {
    const offer = mapDirectLeadOfferRow(offerByLeadId.get(lead.id));
    const offerId = offer?.id ?? null;
    decisions[lead.id] = resolveDirectLeadAccessDecision({
      leadId: lead.id,
      specialistId: input.specialistId,
      planStatus: input.planStatus,
      contactsUnlocked: lead.contacts_unlocked === true,
      paidEntitlement: offerId ? activeGrantOfferIds.has(offerId) : false,
      paymentProcessing: offerId ? pendingPaymentOfferIds.has(offerId) : false,
      offer,
      directPplCheckoutEnabled,
    });
  }

  return decisions;
}
