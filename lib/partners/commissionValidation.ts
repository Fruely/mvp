/**
 * Keep in sync with PARTNER_REWARD_VALIDATION_DAYS in content/partners/agreementMeta.ts.
 * Duplicated here so Node strip-types tests can import this module without path aliases.
 */
export const COMMISSION_VALIDATION_DAYS = 14;

export type PaymentValidityStatus =
  | "valid"
  | "cancelled"
  | "refunded"
  | "reversed"
  | "disputed";

/** Source of truth for validation start: first successful payment timestamp. */
export function getCommissionEligibleAt(firstSuccessfulPaymentAt: string | Date): Date {
  const base =
    firstSuccessfulPaymentAt instanceof Date
      ? new Date(firstSuccessfulPaymentAt.getTime())
      : new Date(firstSuccessfulPaymentAt);
  if (Number.isNaN(base.getTime())) {
    throw new Error("invalid_payment_timestamp");
  }
  base.setUTCDate(base.getUTCDate() + COMMISSION_VALIDATION_DAYS);
  return base;
}

export function isCommissionValidationElapsed(
  firstSuccessfulPaymentAt: string | Date,
  now: Date = new Date()
): boolean {
  return now.getTime() >= getCommissionEligibleAt(firstSuccessfulPaymentAt).getTime();
}

export function isPaymentValidForApproval(status: PaymentValidityStatus): boolean {
  return status === "valid";
}

/**
 * Single gate for pending → approved.
 * Does not perform DB writes — callers must enforce this before any status update.
 */
export function canApproveCommission(input: {
  status: string;
  earnedAt: string;
  paymentValidity: PaymentValidityStatus;
  now?: Date;
}): { ok: true } | { ok: false; reason: string } {
  if (input.status !== "pending") {
    return { ok: false, reason: "not_pending" };
  }
  if (!isPaymentValidForApproval(input.paymentValidity)) {
    return { ok: false, reason: `payment_${input.paymentValidity}` };
  }
  if (!isCommissionValidationElapsed(input.earnedAt, input.now ?? new Date())) {
    return { ok: false, reason: "validation_period_active" };
  }
  return { ok: true };
}

/** Payout may only include approved commissions — never pending. */
export function canIncludeCommissionInPayout(status: string): boolean {
  return status === "approved";
}
