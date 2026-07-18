import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { PartnerDomainError } from "@/lib/partners/errors";
import type { PartnerCommissionRow } from "@/lib/partners/types";

const ADMIN_ACTOR = "admin_token";

export type ConfirmFirstPaymentResult = {
  commission: PartnerCommissionRow;
  created: boolean;
};

/**
 * Interim financial source: admin-confirmed first payment.
 * Does NOT read specialist_plan. Idempotent on (source_type, source_event_id)
 * and unique(specialist_id).
 *
 * Attribution rule: commissions may still be created for attributions whose
 * partner is later paused/disabled (legal first-touch). Rejected partners blocked.
 */
export async function confirmFirstPaymentCommission(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    externalPaymentReference: string;
    paidAt?: string | null;
  }
): Promise<ConfirmFirstPaymentResult> {
  const specialistId = input.specialistId.trim();
  const sourceEventId = input.externalPaymentReference.trim();
  if (!specialistId) throw new PartnerDomainError("specialist_id_required");
  if (!sourceEventId) throw new PartnerDomainError("payment_reference_required");

  const { data: specialist, error: specErr } = await supabase
    .from("specialists")
    .select("id")
    .eq("id", specialistId)
    .maybeSingle();
  if (specErr) throw new PartnerDomainError("specialist_lookup_failed", 500);
  if (!specialist) throw new PartnerDomainError("specialist_not_found", 404);

  // Idempotency: same source event
  const { data: byEvent } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("source_type", "admin_confirmed_first_payment")
    .eq("source_event_id", sourceEventId)
    .maybeSingle();
  if (byEvent) {
    return { commission: byEvent as PartnerCommissionRow, created: false };
  }

  // One earning commission per specialist
  const { data: bySpecialist } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (bySpecialist) {
    throw new PartnerDomainError("commission_already_exists", 409);
  }

  const { data: attribution, error: attrErr } = await supabase
    .from("partner_attributions")
    .select("*")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (attrErr) throw new PartnerDomainError("attribution_lookup_failed", 500);
  if (!attribution) throw new PartnerDomainError("attribution_not_found", 404);

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("*")
    .eq("id", attribution.partner_id)
    .maybeSingle();
  if (partnerErr || !partner) throw new PartnerDomainError("partner_not_found", 404);

  if (partner.status === "rejected") {
    throw new PartnerDomainError("partner_rejected", 409);
  }

  const amount = partner.commission_amount_cents as number;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new PartnerDomainError("invalid_partner_rate", 500);
  }

  let earnedAt = new Date().toISOString();
  if (input.paidAt) {
    const d = new Date(input.paidAt);
    if (Number.isNaN(d.getTime())) throw new PartnerDomainError("invalid_paid_at");
    earnedAt = d.toISOString();
  }

  const ts = new Date().toISOString();
  const { data: created, error: insertErr } = await supabase
    .from("partner_commissions")
    .insert({
      partner_id: partner.id,
      attribution_id: attribution.id,
      specialist_id: specialistId,
      source_type: "admin_confirmed_first_payment",
      source_event_id: sourceEventId,
      amount_cents: amount,
      currency: partner.currency,
      status: "approved",
      earned_at: earnedAt,
      approved_at: ts,
      created_at: ts,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      // Race: re-fetch by event or specialist
      const { data: again } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("source_type", "admin_confirmed_first_payment")
        .eq("source_event_id", sourceEventId)
        .maybeSingle();
      if (again) return { commission: again as PartnerCommissionRow, created: false };

      const { data: bySpec } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("specialist_id", specialistId)
        .maybeSingle();
      if (bySpec) throw new PartnerDomainError("commission_already_exists", 409);
    }
    console.error("[partners/commissions] insert failed", insertErr.message);
    throw new PartnerDomainError("commission_create_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: ADMIN_ACTOR,
    action: "admin_confirm_first_payment",
    entityType: "partner_commission",
    entityId: created.id,
    partnerId: partner.id,
    payload: {
      specialist_id: specialistId,
      source_event_id: sourceEventId,
      amount_cents: amount,
      currency: partner.currency,
      status: "approved",
    },
  });

  return { commission: created as PartnerCommissionRow, created: true };
}

/**
 * Future Stripe hook — same ledger, different source_type.
 * Not wired in Phase 1; exported for roadmap alignment.
 */
export async function createCommissionFromStripeInvoice(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    invoiceId: string;
    paidAt?: string | null;
  }
): Promise<ConfirmFirstPaymentResult> {
  // Mirror admin-confirm with source_type stripe; keep structure ready.
  const specialistId = input.specialistId.trim();
  const invoiceId = input.invoiceId.trim();
  if (!specialistId || !invoiceId) {
    throw new PartnerDomainError("invalid_stripe_input");
  }

  const { data: byEvent } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("source_type", "stripe_invoice_payment_succeeded")
    .eq("source_event_id", invoiceId)
    .maybeSingle();
  if (byEvent) return { commission: byEvent as PartnerCommissionRow, created: false };

  const { data: bySpecialist } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (bySpecialist) throw new PartnerDomainError("commission_already_exists", 409);

  const { data: attribution } = await supabase
    .from("partner_attributions")
    .select("*")
    .eq("specialist_id", specialistId)
    .maybeSingle();
  if (!attribution) throw new PartnerDomainError("attribution_not_found", 404);

  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("id", attribution.partner_id)
    .maybeSingle();
  if (!partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.status === "rejected") throw new PartnerDomainError("partner_rejected", 409);

  const amount = partner.commission_amount_cents as number;
  const ts = new Date().toISOString();
  const earnedAt = input.paidAt ? new Date(input.paidAt).toISOString() : ts;

  const { data: created, error } = await supabase
    .from("partner_commissions")
    .insert({
      partner_id: partner.id,
      attribution_id: attribution.id,
      specialist_id: specialistId,
      source_type: "stripe_invoice_payment_succeeded",
      source_event_id: invoiceId,
      amount_cents: amount,
      currency: partner.currency,
      status: "approved",
      earned_at: earnedAt,
      approved_at: ts,
      created_at: ts,
      updated_at: ts,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: again } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("source_type", "stripe_invoice_payment_succeeded")
        .eq("source_event_id", invoiceId)
        .maybeSingle();
      if (again) return { commission: again as PartnerCommissionRow, created: false };
    }
    throw new PartnerDomainError("commission_create_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: "stripe_webhook",
    action: "stripe_first_payment_commission",
    entityType: "partner_commission",
    entityId: created.id,
    partnerId: partner.id,
    payload: {
      specialist_id: specialistId,
      source_event_id: invoiceId,
      amount_cents: amount,
    },
  });

  return { commission: created as PartnerCommissionRow, created: true };
}
