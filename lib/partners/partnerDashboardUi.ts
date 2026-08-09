/**
 * Pure partner dashboard UI rules — no React, testable from Node.
 */

export type PartnerCommissionUiRow = {
  public_ref: string;
  amount_cents: number;
  currency: string;
  status: string;
  earned_at: string;
  credited_cents: number;
  paid_out_cents: number;
  available_cents: number;
  payout_reserved: boolean;
};

export type PartnerPayoutUiRow = {
  amount_cents: number;
  currency: string;
  status: string;
  requested_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  payment_reference: string | null;
};

export function canUseFinancialActions(accessMode?: string | null): boolean {
  return !accessMode || accessMode === "full";
}

export function canApplyCreditToCommission(
  row: PartnerCommissionUiRow,
  accessMode?: string | null
): boolean {
  if (!canUseFinancialActions(accessMode)) return false;
  if (row.status !== "approved") return false;
  if (row.payout_reserved) return false;
  return row.available_cents > 0;
}

export function canRequestPayoutForCommission(
  row: PartnerCommissionUiRow,
  accessMode?: string | null
): boolean {
  return canApplyCreditToCommission(row, accessMode);
}

/** Parse EUR decimal input to integer cents (half-up). */
export function euroInputToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  const euros = Number(normalized);
  if (!Number.isFinite(euros) || euros <= 0) return null;
  const cents = Math.round(euros * 100);
  if (!Number.isInteger(cents) || cents <= 0) return null;
  return cents;
}

export function centsToEuroInput(cents: number): string {
  if (!Number.isInteger(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(2);
}

export function validateCreditAmountCents(
  amountCents: number,
  availableCents: number
): "ok" | "invalid" | "exceeds" {
  if (!Number.isInteger(amountCents) || amountCents <= 0) return "invalid";
  if (amountCents > availableCents) return "exceeds";
  return "ok";
}

const CREDIT_ERROR_KEYS: Record<string, string> = {
  not_authenticated: "partner.dashboard.errors.unauthorized",
  partner_not_bound: "partner.dashboard.errors.unauthorized",
  partner_access_denied: "partner.dashboard.errors.unauthorized",
  commission_not_found: "partner.dashboard.errors.commissionUnavailable",
  commission_not_available: "partner.dashboard.errors.commissionUnavailable",
  commission_payout_reserved: "partner.dashboard.errors.payoutReserved",
  insufficient_available_balance: "partner.dashboard.errors.amountExceedsAvailable",
  invalid_credit_amount: "partner.dashboard.errors.amountExceedsAvailable",
  idempotency_key_conflict: "partner.dashboard.errors.idempotencyConflict",
  credit_apply_conflict: "partner.dashboard.errors.commissionUnavailable",
};

const PAYOUT_ERROR_KEYS: Record<string, string> = {
  not_authenticated: "partner.dashboard.errors.unauthorized",
  partner_not_bound: "partner.dashboard.errors.unauthorized",
  commission_not_found: "partner.dashboard.errors.commissionUnavailable",
  commission_not_available: "partner.dashboard.errors.commissionUnavailable",
  commission_payout_reserved: "partner.dashboard.errors.payoutReserved",
  payout_commission_unavailable: "partner.dashboard.errors.commissionUnavailable",
  payout_single_commission_required: "partner.dashboard.errors.generic",
};

export function creditErrorLocaleKey(code: string): string {
  return CREDIT_ERROR_KEYS[code] ?? "partner.dashboard.errors.generic";
}

export function payoutErrorLocaleKey(code: string): string {
  return PAYOUT_ERROR_KEYS[code] ?? "partner.dashboard.errors.generic";
}

export function payoutStatusLocaleKey(status: string): string {
  return `partner.dashboard.payoutStatus.${status}`;
}

export function buildCreditApplyBody(input: {
  commissionRef: string;
  amountCents: number;
  idempotencyKey: string;
}): {
  commission_ref: string;
  amount_cents: number;
  idempotency_key: string;
} {
  return {
    commission_ref: input.commissionRef,
    amount_cents: input.amountCents,
    idempotency_key: input.idempotencyKey,
  };
}

export function buildPayoutRequestBody(commissionRef: string): {
  commission_refs: string[];
} {
  return { commission_refs: [commissionRef] };
}

export function buildAdminMarkPaidBody(input: {
  paymentReference?: string | null;
  adminNote?: string | null;
}): { payment_reference?: string; admin_note?: string } {
  const body: { payment_reference?: string; admin_note?: string } = {};
  const ref = input.paymentReference?.trim();
  const note = input.adminNote?.trim();
  if (ref) body.payment_reference = ref;
  if (note) body.admin_note = note;
  return body;
}
