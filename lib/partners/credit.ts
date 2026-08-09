import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import {
  normalizeCommissionPublicRef,
  resolveCommissionIdByPublicRef,
  spendableCommissionCents,
} from "@/lib/partners/partnerFinancialAvailability";
import { PartnerDomainError } from "@/lib/partners/errors";

export {
  availableCommissionCents,
  computeAvailableBalance,
  planSubscriptionCreditApplication,
} from "@/lib/partners/creditMath";

export type CommissionCreditRow = {
  id: string;
  partner_id: string;
  amount_cents: number;
  credited_cents: number;
  paid_out_cents: number;
  status: string;
  currency: string;
  payout_id: string | null;
};

const COMMISSION_SELECT =
  "id, partner_id, amount_cents, credited_cents, paid_out_cents, status, currency, payout_id";

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
  if (error) {
    if (/credited_cents|paid_out_cents|payout_id/i.test(error.message || "")) {
      throw new PartnerDomainError("credit_ledger_not_migrated", 503);
    }
    throw new PartnerDomainError("commission_load_failed", 500);
  }
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

type IdempotentCreditRow = {
  id: string;
  partner_id: string;
  commission_id: string;
  amount_cents: number;
  currency: string;
  status: string;
};

async function loadCreditApplicationByIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<IdempotentCreditRow | null> {
  const { data, error } = await supabase
    .from("partner_credit_applications")
    .select("id, partner_id, commission_id, amount_cents, currency, status")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (error) {
    if (/partner_credit_applications|idempotency_key/i.test(error.message || "")) {
      throw new PartnerDomainError("credit_ledger_not_migrated", 503);
    }
    throw new PartnerDomainError("credit_apply_failed", 500);
  }
  return (data as IdempotentCreditRow | null) ?? null;
}

function assertIdempotentCreditMatch(
  existing: IdempotentCreditRow,
  input: { partnerId: string; commissionId: string; amountCents: number }
): void {
  if (
    existing.partner_id !== input.partnerId ||
    existing.commission_id !== input.commissionId ||
    existing.amount_cents !== input.amountCents
  ) {
    throw new PartnerDomainError("idempotency_key_conflict", 409);
  }
}

function assertCommissionCreditEligible(
  commission: CommissionCreditRow,
  partnerId: string,
  amountCents: number,
  partnerCurrency: string
): void {
  if (commission.partner_id !== partnerId) {
    throw new PartnerDomainError("commission_access_denied", 403);
  }
  if (commission.status !== "approved") {
    throw new PartnerDomainError("commission_not_available", 409);
  }
  if (commission.payout_id != null) {
    throw new PartnerDomainError("commission_payout_reserved", 409);
  }
  const commissionCurrency = (commission.currency || "EUR").toUpperCase();
  const expectedCurrency = (partnerCurrency || "EUR").toUpperCase();
  if (commissionCurrency !== expectedCurrency) {
    throw new PartnerDomainError("commission_currency_mismatch", 409);
  }
  const available = spendableCommissionCents(commission);
  if (available <= 0) {
    throw new PartnerDomainError("commission_not_available", 409);
  }
  if (amountCents > available) {
    throw new PartnerDomainError("insufficient_available_balance", 409);
  }
}

/**
 * Apply approved partner commission balance as Freuly credit (single commission, partial allowed).
 * Ledger records consumption; subscription billing integration is separate.
 */
export async function applyPartnerCommissionCredit(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    userId: string;
    commissionRef: string;
    amountCents: number;
    idempotencyKey: string;
  }
): Promise<{
  applicationId: string;
  commissionId: string;
  amountCents: number;
  currency: string;
  status: "applied";
}> {
  const partnerId = input.partnerId.trim();
  const userId = input.userId.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  const commissionRef = input.commissionRef.trim();

  if (!partnerId || !userId || !idempotencyKey || !commissionRef) {
    throw new PartnerDomainError("invalid_credit_input");
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PartnerDomainError("invalid_credit_amount");
  }

  const existing = await loadCreditApplicationByIdempotencyKey(supabase, idempotencyKey);
  if (existing) {
    if (existing.status === "applied") {
      assertIdempotentCreditMatch(existing, {
        partnerId,
        commissionId: existing.commission_id,
        amountCents: input.amountCents,
      });
      return {
        applicationId: existing.id,
        commissionId: existing.commission_id,
        amountCents: existing.amount_cents,
        currency: existing.currency,
        status: "applied",
      };
    }
    assertIdempotentCreditMatch(existing, {
      partnerId,
      commissionId: existing.commission_id,
      amountCents: input.amountCents,
    });
    throw new PartnerDomainError("credit_apply_in_progress", 409);
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, user_id, currency")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerErr || !partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.user_id !== userId) throw new PartnerDomainError("partner_access_denied", 403);

  const commission = await findCommissionByPublicRef(supabase, partnerId, commissionRef);
  if (!commission) throw new PartnerDomainError("commission_not_found", 404);

  assertCommissionCreditEligible(
    commission,
    partnerId,
    input.amountCents,
    (partner.currency as string) || "EUR"
  );

  const currency = (commission.currency || partner.currency || "EUR").toUpperCase();
  const ts = new Date().toISOString();

  const { data: application, error: appErr } = await supabase
    .from("partner_credit_applications")
    .insert({
      partner_id: partnerId,
      commission_id: commission.id,
      specialist_id: null,
      amount_cents: input.amountCents,
      currency,
      status: "pending",
      idempotency_key: idempotencyKey,
      created_by_user_id: userId,
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (appErr || !application) {
    if (/duplicate key|unique/i.test(appErr?.message || "")) {
      const raced = await loadCreditApplicationByIdempotencyKey(supabase, idempotencyKey);
      if (raced?.status === "applied") {
        assertIdempotentCreditMatch(raced, {
          partnerId,
          commissionId: commission.id,
          amountCents: input.amountCents,
        });
        return {
          applicationId: raced.id,
          commissionId: raced.commission_id,
          amountCents: raced.amount_cents,
          currency: raced.currency,
          status: "applied",
        };
      }
      throw new PartnerDomainError("idempotency_key_conflict", 409);
    }
    if (/partner_credit_applications/i.test(appErr?.message || "")) {
      throw new PartnerDomainError("credit_ledger_not_migrated", 503);
    }
    throw new PartnerDomainError("credit_apply_failed", 500);
  }

  const priorCredited = commission.credited_cents || 0;
  const priorPaidOut = commission.paid_out_cents || 0;
  const nextCredited = priorCredited + input.amountCents;

  const { data: updatedCommission, error: updErr } = await supabase
    .from("partner_commissions")
    .update({
      credited_cents: nextCredited,
      updated_at: ts,
    })
    .eq("id", commission.id)
    .eq("partner_id", partnerId)
    .eq("status", "approved")
    .is("payout_id", null)
    .eq("credited_cents", priorCredited)
    .eq("paid_out_cents", priorPaidOut)
    .select("id, amount_cents, credited_cents, paid_out_cents")
    .maybeSingle();

  if (updErr || !updatedCommission) {
    await supabase
      .from("partner_credit_applications")
      .update({
        status: "rejected",
        rejected_at: ts,
        rejection_reason: "commission_update_conflict",
        updated_at: ts,
      })
      .eq("id", application.id)
      .eq("status", "pending");
    throw new PartnerDomainError("credit_apply_conflict", 409);
  }

  const row = updatedCommission as {
    amount_cents: number;
    credited_cents: number;
    paid_out_cents: number;
  };
  if (row.credited_cents + row.paid_out_cents > row.amount_cents) {
    throw new PartnerDomainError("credit_apply_failed", 500);
  }

  const { error: appliedErr } = await supabase
    .from("partner_credit_applications")
    .update({
      status: "applied",
      applied_at: ts,
      updated_at: ts,
    })
    .eq("id", application.id)
    .eq("status", "pending");

  if (appliedErr) {
    throw new PartnerDomainError("credit_apply_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: `user:${userId}`,
    action: "credit_applied",
    entityType: "partner_credit_application",
    entityId: application.id,
    partnerId,
    payload: {
      commission_id: commission.id,
      amount_cents: input.amountCents,
      currency,
      idempotency_key: idempotencyKey,
    },
  });

  return {
    applicationId: application.id,
    commissionId: commission.id,
    amountCents: input.amountCents,
    currency,
    status: "applied",
  };
}

/** @deprecated Use applyPartnerCommissionCredit — kept for transitional imports. */
export const applyPartnerSubscriptionCredit = applyPartnerCommissionCredit;
