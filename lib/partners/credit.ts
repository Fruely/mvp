import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import {
  availableCommissionCents,
  planSubscriptionCreditApplication,
} from "@/lib/partners/creditMath";
import { PartnerDomainError } from "@/lib/partners/errors";

export type CommissionAllocationRow = {
  id: string;
  amount_cents: number;
  credited_cents: number;
  paid_out_cents: number;
  status: string;
  currency: string;
};

export {
  availableCommissionCents,
  computeAvailableBalance,
  planSubscriptionCreditApplication,
} from "@/lib/partners/creditMath";

/**
 * Allocate confirmed reward balance to Freuly subscription credit (FIFO).
 * Same cents cannot later be cash-withdrawn.
 * Billing checkout may later consume `reserved` applications — ledger is source of truth now.
 */
export async function applyPartnerSubscriptionCredit(
  supabase: SupabaseClient,
  input: {
    partnerId: string;
    userId: string;
    amountCents?: number | null;
    /** If set (and amount omitted/invalid), credit = min(available, due). */
    subscriptionDueCents?: number | null;
    note?: string | null;
  }
): Promise<{
  applicationId: string;
  amountCents: number;
  currency: string;
  remainingDueHintCents: number | null;
  remainingAvailableCents: number;
}> {
  const partnerId = input.partnerId.trim();
  const userId = input.userId.trim();

  if (!partnerId || !userId) throw new PartnerDomainError("invalid_credit_input");

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, user_id, currency")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerErr || !partner) throw new PartnerDomainError("partner_not_found", 404);
  if (partner.user_id !== userId) throw new PartnerDomainError("partner_access_denied", 403);

  const { data: specialist } = await supabase
    .from("specialists")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "blocked")
    .maybeSingle();

  const { data: rows, error: listErr } = await supabase
    .from("partner_commissions")
    .select("id, amount_cents, credited_cents, paid_out_cents, status, currency, earned_at")
    .eq("partner_id", partnerId)
    .eq("status", "approved")
    .order("earned_at", { ascending: true });

  if (listErr) {
    // Columns may be missing before phase4 migration.
    if (/credited_cents|paid_out_cents/i.test(listErr.message || "")) {
      throw new PartnerDomainError("credit_ledger_not_migrated", 503);
    }
    throw new PartnerDomainError("commission_list_failed", 500);
  }

  const commissions = (rows ?? []) as CommissionAllocationRow[];
  const availableTotal = commissions.reduce((sum, c) => sum + availableCommissionCents(c), 0);

  let amountCents = input.amountCents;
  let remainingDueHintCents: number | null = null;
  if (
    input.subscriptionDueCents != null &&
    Number.isInteger(input.subscriptionDueCents) &&
    input.subscriptionDueCents > 0
  ) {
    const plan = planSubscriptionCreditApplication(availableTotal, input.subscriptionDueCents);
    remainingDueHintCents = plan.remainingDueCents;
    if (!Number.isInteger(amountCents) || (amountCents as number) <= 0) {
      amountCents = plan.creditCents;
    } else {
      amountCents = Math.min(amountCents as number, plan.creditCents || (amountCents as number));
    }
  }

  const applyAmount = Number.isInteger(amountCents) ? (amountCents as number) : NaN;
  if (!Number.isInteger(applyAmount) || applyAmount <= 0) {
    throw new PartnerDomainError("invalid_credit_amount");
  }
  if (applyAmount > availableTotal) {
    throw new PartnerDomainError("insufficient_available_balance", 409);
  }

  let remaining = applyAmount;
  const allocations: Array<{ commissionId: string; amount: number }> = [];
  for (const c of commissions) {
    if (remaining <= 0) break;
    const avail = availableCommissionCents(c);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    allocations.push({ commissionId: c.id, amount: take });
    remaining -= take;
  }
  if (remaining !== 0 || allocations.length === 0) {
    throw new PartnerDomainError("insufficient_available_balance", 409);
  }

  const currency = (partner.currency as string) || "EUR";
  const ts = new Date().toISOString();

  const { data: application, error: appErr } = await supabase
    .from("partner_credit_applications")
    .insert({
      partner_id: partnerId,
      specialist_id: specialist?.id ?? null,
      amount_cents: applyAmount,
      currency,
      status: "reserved",
      note: input.note?.trim() || "subscription_credit",
      created_at: ts,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (appErr || !application) {
    if (/partner_credit_applications/i.test(appErr?.message || "")) {
      throw new PartnerDomainError("credit_ledger_not_migrated", 503);
    }
    throw new PartnerDomainError("credit_apply_failed", 500);
  }

  for (const a of allocations) {
    const row = commissions.find((c) => c.id === a.commissionId);
    if (!row) throw new PartnerDomainError("credit_apply_failed", 500);
    const nextCredited = (row.credited_cents || 0) + a.amount;

    const { error: updErr } = await supabase
      .from("partner_commissions")
      .update({
        credited_cents: nextCredited,
        updated_at: ts,
      })
      .eq("id", a.commissionId)
      .eq("status", "approved");

    if (updErr) {
      throw new PartnerDomainError("credit_apply_failed", 500);
    }
    row.credited_cents = nextCredited;

    const { error: lineErr } = await supabase.from("partner_credit_application_lines").insert({
      application_id: application.id,
      commission_id: a.commissionId,
      amount_cents: a.amount,
    });
    if (lineErr) {
      throw new PartnerDomainError("credit_apply_failed", 500);
    }
  }

  await writePartnerAudit(supabase, {
    actorLabel: `user:${userId}`,
    action: "partner_subscription_credit_applied",
    entityType: "partner_credit_application",
    entityId: application.id,
    partnerId,
    payload: {
      amount_cents: applyAmount,
      currency,
      specialist_id: specialist?.id ?? null,
      lines: allocations,
    },
  });

  if (remainingDueHintCents == null && input.subscriptionDueCents != null) {
    remainingDueHintCents = Math.max(0, input.subscriptionDueCents - applyAmount);
  }

  return {
    applicationId: application.id,
    amountCents: applyAmount,
    currency,
    remainingDueHintCents,
    remainingAvailableCents: availableTotal - applyAmount,
  };
}
