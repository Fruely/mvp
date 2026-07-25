import type { SupabaseClient } from "@supabase/supabase-js";
import { writePartnerAudit } from "@/lib/partners/audit";
import {
  canApproveCommission,
  type PaymentValidityStatus,
} from "@/lib/partners/commissionValidation";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createCommissionNotification } from "@/lib/partners/notifications";
import {
  computePartnerRewardCents,
  type BillingInterval,
  type PaymentFinancialFacts,
} from "@/lib/partners/rewardCalculation";
import type { PartnerCommissionRow } from "@/lib/partners/types";

const ADMIN_ACTOR = "admin_token";

export type ConfirmFirstPaymentResult = {
  commission: PartnerCommissionRow;
  created: boolean;
};

export type CreateCommissionPaymentInput = {
  specialistId: string;
  externalPaymentReference: string;
  /** First successful payment timestamp — source of truth for 14-day validation. */
  paidAt: string;
  grossAmountCents: number;
  vatAmountCents: number;
  providerFeeCents: number;
  billingInterval: BillingInterval;
  currency?: string;
};

async function createFirstPaymentCommission(
  supabase: SupabaseClient,
  input: CreateCommissionPaymentInput & {
    sourceType: "admin_confirmed_first_payment" | "stripe_invoice_payment_succeeded";
    actorLabel: string;
    auditAction: string;
  }
): Promise<ConfirmFirstPaymentResult> {
  const specialistId = input.specialistId.trim();
  const sourceEventId = input.externalPaymentReference.trim();
  if (!specialistId) throw new PartnerDomainError("specialist_id_required");
  if (!sourceEventId) throw new PartnerDomainError("payment_reference_required");

  const paidAtDate = new Date(input.paidAt);
  if (Number.isNaN(paidAtDate.getTime())) {
    throw new PartnerDomainError("invalid_paid_at");
  }
  const earnedAt = paidAtDate.toISOString();

  const rewardCalc = computePartnerRewardCents({
    grossAmountCents: input.grossAmountCents,
    vatAmountCents: input.vatAmountCents,
    providerFeeCents: input.providerFeeCents,
    billingInterval: input.billingInterval,
  });
  if (!rewardCalc.ok) {
    throw new PartnerDomainError(rewardCalc.code, rewardCalc.status ?? 400);
  }
  const reward = rewardCalc.reward;

  const { data: specialist, error: specErr } = await supabase
    .from("specialists")
    .select("id, user_id, email")
    .eq("id", specialistId)
    .maybeSingle();
  if (specErr) throw new PartnerDomainError("specialist_lookup_failed", 500);
  if (!specialist) throw new PartnerDomainError("specialist_not_found", 404);

  const { data: byEvent } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("source_type", input.sourceType)
    .eq("source_event_id", sourceEventId)
    .maybeSingle();
  if (byEvent) {
    return { commission: byEvent as PartnerCommissionRow, created: false };
  }

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

  // Enforceable self-referral: same auth user or same email identity.
  const specialistUserId = (specialist as { user_id?: string | null }).user_id;
  if (partner.user_id && specialistUserId && partner.user_id === specialistUserId) {
    throw new PartnerDomainError("self_referral", 409);
  }
  const partnerEmail = String(partner.email || "")
    .trim()
    .toLowerCase();
  const specialistEmail = String((specialist as { email?: string | null }).email || "")
    .trim()
    .toLowerCase();
  if (partnerEmail && specialistEmail && partnerEmail === specialistEmail) {
    throw new PartnerDomainError("self_referral", 409);
  }

  const currency = (input.currency || (partner.currency as string) || "EUR")
    .trim()
    .toUpperCase();
  const ts = new Date().toISOString();

  const insertRow: Record<string, unknown> = {
    partner_id: partner.id,
    attribution_id: attribution.id,
    specialist_id: specialistId,
    source_type: input.sourceType,
    source_event_id: sourceEventId,
    amount_cents: reward.amountCents,
    currency,
    status: "pending",
    earned_at: earnedAt,
    approved_at: null,
    credited_cents: 0,
    paid_out_cents: 0,
    created_at: ts,
    updated_at: ts,
  };

  let { data: created, error: insertErr } = await supabase
    .from("partner_commissions")
    .insert(insertRow)
    .select("*")
    .single();

  if (insertErr && /credited_cents|paid_out_cents/i.test(insertErr.message || "")) {
    const legacy = { ...insertRow };
    delete legacy.credited_cents;
    delete legacy.paid_out_cents;
    const retry = await supabase.from("partner_commissions").insert(legacy).select("*").single();
    created = retry.data;
    insertErr = retry.error;
  }

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: again } = await supabase
        .from("partner_commissions")
        .select("*")
        .eq("source_type", input.sourceType)
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
    actorLabel: input.actorLabel,
    action: input.auditAction,
    entityType: "partner_commission",
    entityId: created.id,
    partnerId: partner.id,
    payload: {
      specialist_id: specialistId,
      source_event_id: sourceEventId,
      amount_cents: reward.amountCents,
      gross_amount_cents: reward.grossAmountCents,
      vat_amount_cents: reward.vatAmountCents,
      provider_fee_cents: reward.providerFeeCents,
      billing_interval: reward.billingInterval,
      currency,
      status: "pending",
      earned_at: earnedAt,
      payment_validity: "valid",
      // Explicitly not using partners.commission_amount_cents for reward.
      partner_rate_ignored_cents: partner.commission_amount_cents,
    },
  });

  await createCommissionNotification(supabase, {
    partnerId: partner.id,
    userId: (partner.user_id as string | null) ?? null,
    commissionId: created.id,
    amountCents: reward.amountCents,
    currency,
  });

  return { commission: created as PartnerCommissionRow, created: true };
}

/**
 * Admin-confirmed first monthly payment with Agreement v1.0 financial facts.
 * Creates pending commission; approval only after 14-day validation.
 */
export async function confirmFirstPaymentCommission(
  supabase: SupabaseClient,
  input: CreateCommissionPaymentInput
): Promise<ConfirmFirstPaymentResult> {
  return createFirstPaymentCommission(supabase, {
    ...input,
    sourceType: "admin_confirmed_first_payment",
    actorLabel: ADMIN_ACTOR,
    auditAction: "admin_confirm_first_payment",
  });
}

/**
 * Stripe first-payment path. Requires actual fee/VAT facts — do not invent estimates.
 * If fee is not yet known, caller must wait (no commission row until facts exist).
 */
export async function createCommissionFromStripeInvoice(
  supabase: SupabaseClient,
  input: CreateCommissionPaymentInput
): Promise<ConfirmFirstPaymentResult> {
  return createFirstPaymentCommission(supabase, {
    ...input,
    sourceType: "stripe_invoice_payment_succeeded",
    actorLabel: "stripe_webhook",
    auditAction: "stripe_first_payment_commission",
  });
}

export type ApproveCommissionResult =
  | { ok: true; commission: PartnerCommissionRow; changed: boolean }
  | { ok: false; reason: string; commission?: PartnerCommissionRow };

/**
 * Sole path for pending → approved. Enforces 14-day validation + payment validity.
 */
export async function approveCommissionIfEligible(
  supabase: SupabaseClient,
  input: {
    commissionId: string;
    paymentValidity: PaymentValidityStatus;
    actorLabel?: string;
    now?: Date;
  }
): Promise<ApproveCommissionResult> {
  const { data: row, error } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("id", input.commissionId)
    .maybeSingle();

  if (error || !row) {
    throw new PartnerDomainError("commission_not_found", 404);
  }

  const commission = row as PartnerCommissionRow;
  if (commission.status === "approved" || commission.status === "paid") {
    return { ok: true, commission, changed: false };
  }

  const gate = canApproveCommission({
    status: commission.status,
    earnedAt: commission.earned_at,
    paymentValidity: input.paymentValidity,
    now: input.now,
  });

  if (!gate.ok) {
    if (
      input.paymentValidity !== "valid" &&
      commission.status === "pending"
    ) {
      // Invalid payment during/after validation → do not approve; reverse instead.
      const reversed = await reverseCommissionForInvalidPayment(supabase, {
        commissionId: commission.id,
        paymentStatus: input.paymentValidity,
        actorLabel: input.actorLabel || "system",
      });
      return { ok: false, reason: gate.reason, commission: reversed };
    }
    return { ok: false, reason: gate.reason, commission };
  }

  const ts = new Date().toISOString();
  const { data: updated, error: updErr } = await supabase
    .from("partner_commissions")
    .update({
      status: "approved",
      approved_at: ts,
      updated_at: ts,
    })
    .eq("id", commission.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (updErr || !updated) {
    throw new PartnerDomainError("commission_approve_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: input.actorLabel || "system",
    action: "commission_approved",
    entityType: "partner_commission",
    entityId: commission.id,
    partnerId: commission.partner_id,
    payload: {
      earned_at: commission.earned_at,
      approved_at: ts,
      payment_validity: input.paymentValidity,
      amount_cents: commission.amount_cents,
    },
  });

  return { ok: true, commission: updated as PartnerCommissionRow, changed: true };
}

/**
 * Mark commission reversed when payment is cancelled/refunded/reversed/disputed
 * before (or instead of) approval. Does not claw back paid commissions in this task.
 */
export async function reverseCommissionForInvalidPayment(
  supabase: SupabaseClient,
  input: {
    commissionId: string;
    paymentStatus: Exclude<PaymentValidityStatus, "valid">;
    actorLabel?: string;
    reason?: string;
  }
): Promise<PartnerCommissionRow> {
  const { data: row, error } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("id", input.commissionId)
    .maybeSingle();

  if (error || !row) throw new PartnerDomainError("commission_not_found", 404);
  const commission = row as PartnerCommissionRow;

  if (commission.status === "paid") {
    throw new PartnerDomainError("commission_already_paid", 409);
  }
  if (commission.status === "reversed") {
    return commission;
  }

  const ts = new Date().toISOString();
  const reason =
    input.reason || `payment_${input.paymentStatus}_before_or_at_validation`;

  const { data: updated, error: updErr } = await supabase
    .from("partner_commissions")
    .update({
      status: "reversed",
      reversed_at: ts,
      reversal_reason: reason,
      updated_at: ts,
    })
    .eq("id", commission.id)
    .in("status", ["pending", "approved"])
    .select("*")
    .maybeSingle();

  if (updErr || !updated) {
    throw new PartnerDomainError("commission_reverse_failed", 500);
  }

  await writePartnerAudit(supabase, {
    actorLabel: input.actorLabel || "system",
    action: "commission_reversed_payment_invalid",
    entityType: "partner_commission",
    entityId: commission.id,
    partnerId: commission.partner_id,
    payload: {
      payment_status: input.paymentStatus,
      reason,
      previous_status: commission.status,
    },
  });

  return updated as PartnerCommissionRow;
}

/**
 * Approve all pending commissions whose validation period has elapsed
 * and whose payment is still reported valid.
 */
export async function approveEligiblePendingCommissions(
  supabase: SupabaseClient,
  input?: {
    paymentValidityByCommissionId?: Record<string, PaymentValidityStatus>;
    defaultPaymentValidity?: PaymentValidityStatus;
    actorLabel?: string;
    now?: Date;
    limit?: number;
  }
): Promise<{ approved: number; skipped: number; reversed: number }> {
  const now = input?.now ?? new Date();
  const limit = input?.limit ?? 100;
  const defaultValidity = input?.defaultPaymentValidity ?? "valid";

  const { data: rows, error } = await supabase
    .from("partner_commissions")
    .select("*")
    .eq("status", "pending")
    .order("earned_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[partners/commissions] list pending failed", error.message);
    throw new PartnerDomainError("commission_list_failed", 500);
  }

  let approved = 0;
  let skipped = 0;
  let reversed = 0;

  for (const row of rows ?? []) {
    const commission = row as PartnerCommissionRow;
    const validity =
      input?.paymentValidityByCommissionId?.[commission.id] ?? defaultValidity;

    const result = await approveCommissionIfEligible(supabase, {
      commissionId: commission.id,
      paymentValidity: validity,
      actorLabel: input?.actorLabel || "cron:partner-commissions-approve",
      now,
    });

    if (result.ok && result.changed) approved += 1;
    else if (!result.ok && result.reason.startsWith("payment_")) reversed += 1;
    else skipped += 1;
  }

  return { approved, skipped, reversed };
}

/** Parse billing interval from admin/API input. */
export function parseBillingInterval(value: unknown): BillingInterval {
  if (value === "month" || value === "monthly") return "month";
  if (value === "year" || value === "annual" || value === "yearly") return "year";
  throw new PartnerDomainError("invalid_billing_interval");
}

export function parsePaymentFinancialFacts(body: Record<string, unknown>): PaymentFinancialFacts & {
  paidAt: string;
} {
  const paidAt =
    typeof body.paidAt === "string"
      ? body.paidAt
      : typeof body.paid_at === "string"
        ? body.paid_at
        : "";
  if (!paidAt) throw new PartnerDomainError("paid_at_required");

  const gross =
    typeof body.grossAmountCents === "number"
      ? body.grossAmountCents
      : typeof body.gross_amount_cents === "number"
        ? body.gross_amount_cents
        : NaN;
  const vat =
    typeof body.vatAmountCents === "number"
      ? body.vatAmountCents
      : typeof body.vat_amount_cents === "number"
        ? body.vat_amount_cents
        : NaN;
  const fee =
    typeof body.providerFeeCents === "number"
      ? body.providerFeeCents
      : typeof body.provider_fee_cents === "number"
        ? body.provider_fee_cents
        : NaN;

  if (!Number.isInteger(gross)) throw new PartnerDomainError("gross_amount_required");
  if (!Number.isInteger(vat)) throw new PartnerDomainError("vat_amount_required");
  if (!Number.isInteger(fee)) throw new PartnerDomainError("provider_fee_required");

  const intervalRaw = body.billingInterval ?? body.billing_interval;
  const billingInterval = parseBillingInterval(intervalRaw);

  return {
    paidAt,
    grossAmountCents: gross,
    vatAmountCents: vat,
    providerFeeCents: fee,
    billingInterval,
  };
}
