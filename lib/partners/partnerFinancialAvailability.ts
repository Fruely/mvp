import { publicCommissionRef } from "./publicRef";

export type CommissionFinancialRow = {
  amount_cents: number;
  credited_cents?: number | null;
  paid_out_cents?: number | null;
  status: string;
  payout_id?: string | null;
};

function intCents(value: unknown): number {
  return Number.isInteger(value) ? (value as number) : 0;
}

/** Normalize public commission ref for comparison (case-insensitive). */
export function normalizeCommissionPublicRef(ref: string): string {
  return ref.trim().toUpperCase();
}

/**
 * Spendable cents on an approved commission (credit or new payout).
 * Payout-reserved commissions (payout_id set) are excluded entirely.
 */
export function spendableCommissionCents(row: CommissionFinancialRow): number {
  if (row.status !== "approved") return 0;
  if (row.payout_id != null && String(row.payout_id).trim() !== "") return 0;
  const credited = intCents(row.credited_cents);
  const paidOut = intCents(row.paid_out_cents);
  return Math.max(0, row.amount_cents - credited - paidOut);
}

/** @deprecated alias — prefer spendableCommissionCents */
export function availableCommissionCents(row: CommissionFinancialRow): number {
  return spendableCommissionCents(row);
}

export function resolveCommissionIdByPublicRef(
  commissions: Array<{ id: string }>,
  publicRef: string
): string | null {
  const target = normalizeCommissionPublicRef(publicRef);
  if (!target) return null;
  for (const row of commissions) {
    if (publicCommissionRef(row.id) === target) return row.id;
  }
  return null;
}

export function assertPositiveIntegerCents(
  amountCents: unknown,
  errorCode = "invalid_amount"
): number {
  if (!Number.isInteger(amountCents) || (amountCents as number) <= 0) {
    throw new Error(errorCode);
  }
  return amountCents as number;
}
