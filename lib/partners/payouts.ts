import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  normalizeCommissionPublicRef,
  resolveCommissionIdByPublicRef,
  spendableCommissionCents,
} from "@/lib/partners/partnerFinancialAvailability";
import type { CommissionCreditRow } from "@/lib/partners/credit";

const COMMISSION_SELECT =
  "id, partner_id, amount_cents, credited_cents, paid_out_cents, status, currency, payout_id";

type PayoutRow = {
  id: string;
  partner_id: string;
  amount_cents: number;
  requested_amount_cents: number | null;
  currency: string;
  status: string;
  payment_reference: string | null;
  admin_note: string | null;
  paid_at: string | null;
  ready_at: string | null;
  cancelled_at: string | null;
  requested_at: string | null;
};

async function loadPartnerCommissionIds(
  supabase: SupabaseClient,
  partnerId: string
): Promise<Array<{ id: string }>> {
  const { data, error } = await supabase
    .from("partner_commissions")
    .select("id")
    .eq("partner_id", partnerId);
  if (error) throw new PartnerDomainError("commission_list_failed", 500);
  return (data ?? []) as Array<{ id: string }>;
}

async function loadCommissionById(
  supabase: SupabaseClient,
  commissionId: string
): Promise<CommissionCreditRow | null> {
  const { data, error } = await supabase
    .from("partner_commissions")
    .select(COMMISSION_SELECT)
    .eq("id", commissionId)
    .maybeSingle();
  if (error) throw new PartnerDomainError("commission_load_failed", 500);
  return (data as CommissionCreditRow | null) ?? null;
}

async function findCommissionByPublicRef(
  supabase: SupabaseClient,
  partnerId: string,
  commissionRef: string
): Promise<CommissionCreditRow | null> {
  const normalized = normalizeCommissionPublicRef(commissionRef);
  if (!normalized) return null;
  const ids = await loadPartnerCommissionIds(supabase, partnerId);
  const commissionId = resolveCommissionIdByPublicRef(ids, normalized);
  if (!commissionId) return null;
  return loadCommissionById(supabase, commissionId);
}

async function loadPayoutById(
  supabase: SupabaseClient,
  payoutId: string
): Promise<PayoutRow | null> {
  const { data, error } = await supabase
    .from("partner_payouts")
    .select(
      "id, partner_id, amount_cents, requested_amount_cents, currency, status, payment_reference, admin_note, paid_at, ready_at, cancelled_at, requested_at"
    )
    .eq("id", payoutId)
    .maybeSingle();
  if (error) throw new PartnerDomainError("payout_load_failed", 500);
  return (data as PayoutRow | null) ?? null;
}

async function loadLinkedCommissions(
  supabase: SupabaseClient,
  payoutId: string
): Promise<CommissionCreditRow[]> {
  const { data, error } = await supabase
    .from("partner_commissions")
    .select(COMMISSION_SELECT)
    .eq("payout_id", payoutId);
  if (error) throw new PartnerDomainError("commission_load_failed", 500);
  return (data ?? []) as CommissionCreditRow[];
}

function assertPartnerOwnsCommission(commission: CommissionCreditRow, partnerId: string): void {
  if (commission.partner_id !== partnerId) {
    throw new PartnerDomainError("commission_access_denied", 403);
  }
}

function assertCommissionPayoutEligible(commission: CommissionCreditRow): number {
  if (commission.status !== "approved") {
    throw new PartnerDomainError("commission_not_available", 409);
  }
  if (commission.payout_id != null) {
    throw new PartnerDomainError("commission_payout_reserved", 409);
  }
  const available = spendableCommissionCents(commission);
  if (available <= 0) {
    throw new PartnerDomainError("commission_not_available", 409);
  }
  return available;
}

/**
 * MVP: one approved commission per payout request (all-or-nothing, no unsafe multi-row batch).
 */
export async function requestPartnerPayout(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    userId: string;
    commissionRefs: string[];
  }
): Promise<{
  payoutId: string;
  commissionId: string;
  amountCents: number;
  currency: string;
  status: "draft";
}> {
  const partnerId = input.partnerId.trim();
  const userId = input.userId.trim();
  const refs = input.commissionRefs.map((r) => r.trim()).filter(Boolean);

  if (!partnerId || !userId) throw new PartnerDomainError("invalid_payout_input");
  if (refs.length !== 1) {
    throw new PartnerDomainError("payout_single_commission_required", 400);
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, user_id, currency")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerErr || !partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.user_id !== userId) throw new PartnerDomainError("partner_access_denied", 403);

  const commission = await findCommissionByPublicRef(supabase, partnerId, refs[0]);
  if (!commission) throw new PartnerDomainError("commission_not_found", 404);
  assertPartnerOwnsCommission(commission, partnerId);
  const amountCents = assertCommissionPayoutEligible(commission);

  const currency = ((partner.currency as string) || commission.currency || "EUR").toUpperCase();
  const ts = new Date().toISOString();

  const { data: payout, error: payoutErr } = await supabase
    .from("partner_payouts")
    .insert({
      partner_id: partnerId,
      amount_cents: amountCents,
      requested_amount_cents: amountCents,
      currency,
      status: "draft",
      requested_at: ts,
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (payoutErr || !payout) {
    throw new PartnerDomainError("payout_request_failed", 500);
  }

  const { data: linked, error: linkErr } = await supabase
    .from("partner_commissions")
    .update({
      payout_id: payout.id,
      updated_at: ts,
    })
    .eq("id", commission.id)
    .eq("partner_id", partnerId)
    .eq("status", "approved")
    .is("payout_id", null)
    .select("id")
    .maybeSingle();

  if (linkErr || !linked) {
    await supabase.from("partner_payouts").delete().eq("id", payout.id);
    throw new PartnerDomainError("payout_commission_unavailable", 409);
  }

  await writePartnerAudit(supabase, {
    actorLabel: `user:${userId}`,
    action: "payout_requested",
    entityType: "partner_payout",
    entityId: payout.id,
    partnerId,
    payload: {
      commission_id: commission.id,
      amount_cents: amountCents,
      currency,
    },
  });

  return {
    payoutId: payout.id,
    commissionId: commission.id,
    amountCents,
    currency,
    status: "draft",
  };
}

export async function markPartnerPayoutReady(
  supabase: SupabaseClient,
  input: { payoutId: string; actorLabel?: string }
): Promise<{ payoutId: string; status: "ready" }> {
  const payout = await loadPayoutById(supabase, input.payoutId.trim());
  if (!payout) throw new PartnerDomainError("payout_not_found", 404);
  if (payout.status === "ready") {
    return { payoutId: payout.id, status: "ready" };
  }
  if (payout.status !== "draft") {
    throw new PartnerDomainError("payout_invalid_transition", 409);
  }

  const ts = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("partner_payouts")
    .update({
      status: "ready",
      ready_at: ts,
      updated_at: ts,
    })
    .eq("id", payout.id)
    .eq("status", "draft")
    .select("id, status")
    .maybeSingle();

  if (error || !updated) throw new PartnerDomainError("payout_ready_failed", 500);

  await writePartnerAudit(supabase, {
    actorLabel: input.actorLabel || "admin_token",
    action: "payout_ready",
    entityType: "partner_payout",
    entityId: payout.id,
    partnerId: payout.partner_id,
    payload: { previous_status: "draft" },
  });

  return { payoutId: payout.id, status: "ready" };
}

export async function markPartnerPayoutPaid(
  supabase: SupabaseClient,
  input: {
    payoutId: string;
    paymentReference?: string | null;
    adminNote?: string | null;
    actorLabel?: string;
  }
): Promise<{ payoutId: string; status: "paid" }> {
  const payout = await loadPayoutById(supabase, input.payoutId.trim());
  if (!payout) throw new PartnerDomainError("payout_not_found", 404);
  if (payout.status === "paid") {
    return { payoutId: payout.id, status: "paid" };
  }
  if (payout.status !== "ready") {
    throw new PartnerDomainError("payout_not_ready", 409);
  }

  const commissions = await loadLinkedCommissions(supabase, payout.id);
  if (commissions.length === 0) {
    throw new PartnerDomainError("payout_no_commissions", 409);
  }

  for (const c of commissions) {
    if (c.partner_id !== payout.partner_id) {
      throw new PartnerDomainError("payout_partner_mismatch", 409);
    }
    if (c.status === "reversed") {
      throw new PartnerDomainError("commission_reversed", 409);
    }
    if (c.status !== "approved") {
      throw new PartnerDomainError("commission_not_available", 409);
    }
  }

  const ts = new Date().toISOString();

  for (const commission of commissions) {
    const priorPaidOut = commission.paid_out_cents || 0;
    const priorCredited = commission.credited_cents || 0;
    const payAmount = Math.max(
      0,
      commission.amount_cents - priorCredited - priorPaidOut
    );
    if (payAmount <= 0) {
      throw new PartnerDomainError("payout_amount_invalid", 409);
    }

    const nextPaidOut = priorPaidOut + payAmount;
    const fullyConsumed = nextPaidOut + priorCredited >= commission.amount_cents;
    const nextStatus = fullyConsumed ? "paid" : "approved";

    const { data: updated, error: updErr } = await supabase
      .from("partner_commissions")
      .update({
        paid_out_cents: nextPaidOut,
        status: nextStatus,
        updated_at: ts,
      })
      .eq("id", commission.id)
      .eq("partner_id", payout.partner_id)
      .eq("payout_id", payout.id)
      .eq("paid_out_cents", priorPaidOut)
      .eq("credited_cents", priorCredited)
      .select("id")
      .maybeSingle();

    if (updErr || !updated) {
      throw new PartnerDomainError("payout_paid_failed", 500);
    }
  }

  const paymentReference = input.paymentReference?.trim() || null;
  const adminNote = input.adminNote?.trim() || null;

  const { data: paidPayout, error: payoutErr } = await supabase
    .from("partner_payouts")
    .update({
      status: "paid",
      paid_at: ts,
      payment_reference: paymentReference,
      admin_note: adminNote,
      updated_at: ts,
    })
    .eq("id", payout.id)
    .eq("status", "ready")
    .select("id")
    .maybeSingle();

  if (payoutErr || !paidPayout) {
    throw new PartnerDomainError("payout_paid_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: input.actorLabel || "admin_token",
    action: "payout_paid",
    entityType: "partner_payout",
    entityId: payout.id,
    partnerId: payout.partner_id,
    payload: {
      amount_cents: payout.amount_cents,
      currency: payout.currency,
      payment_reference: paymentReference,
    },
  });

  return { payoutId: payout.id, status: "paid" };
}

export async function cancelPartnerPayout(
  supabase: SupabaseClient,
  input: { payoutId: string; actorLabel?: string }
): Promise<{ payoutId: string; status: "cancelled" }> {
  const payout = await loadPayoutById(supabase, input.payoutId.trim());
  if (!payout) throw new PartnerDomainError("payout_not_found", 404);
  if (payout.status === "paid") {
    throw new PartnerDomainError("payout_already_paid", 409);
  }
  if (payout.status === "cancelled") {
    return { payoutId: payout.id, status: "cancelled" };
  }
  if (payout.status !== "draft" && payout.status !== "ready") {
    throw new PartnerDomainError("payout_invalid_transition", 409);
  }

  const ts = new Date().toISOString();

  const { error: releaseErr } = await supabase
    .from("partner_commissions")
    .update({
      payout_id: null,
      updated_at: ts,
    })
    .eq("payout_id", payout.id);

  if (releaseErr) throw new PartnerDomainError("payout_cancel_failed", 500);

  const { data: cancelled, error } = await supabase
    .from("partner_payouts")
    .update({
      status: "cancelled",
      cancelled_at: ts,
      updated_at: ts,
    })
    .eq("id", payout.id)
    .in("status", ["draft", "ready"])
    .select("id")
    .maybeSingle();

  if (error || !cancelled) throw new PartnerDomainError("payout_cancel_failed", 500);

  await writePartnerAudit(supabase, {
    actorLabel: input.actorLabel || "admin_token",
    action: "payout_cancelled",
    entityType: "partner_payout",
    entityId: payout.id,
    partnerId: payout.partner_id,
    payload: { previous_status: payout.status },
  });

  return { payoutId: payout.id, status: "cancelled" };
}
