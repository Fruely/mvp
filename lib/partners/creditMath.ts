/**
 * Pure integer-cents helpers for partner reward credit accounting.
 * Kept free of path aliases so Node unit tests can import directly.
 */

/**
 * How much confirmed balance to apply toward a Freuly subscription invoice.
 * Remaining available stays cash/credit-eligible; credited cents cannot be paid out.
 */
export function planSubscriptionCreditApplication(
  availableCents: number,
  subscriptionDueCents: number
): {
  creditCents: number;
  remainingDueCents: number;
  remainingAvailableCents: number;
} {
  const available =
    Number.isInteger(availableCents) && availableCents > 0 ? availableCents : 0;
  const due =
    Number.isInteger(subscriptionDueCents) && subscriptionDueCents > 0
      ? subscriptionDueCents
      : 0;
  const creditCents = Math.min(available, due);
  return {
    creditCents,
    remainingDueCents: due - creditCents,
    remainingAvailableCents: available - creditCents,
  };
}

/** Available cash-or-credit cents on an approved commission. */
export function availableCommissionCents(row: {
  amount_cents: number;
  credited_cents?: number | null;
  paid_out_cents?: number | null;
  status: string;
}): number {
  if (row.status !== "approved") return 0;
  const credited = Number.isInteger(row.credited_cents) ? (row.credited_cents as number) : 0;
  const paidOut = Number.isInteger(row.paid_out_cents) ? (row.paid_out_cents as number) : 0;
  return Math.max(0, row.amount_cents - credited - paidOut);
}

export function computeAvailableBalance(
  commissions: Array<{
    amount_cents: number;
    credited_cents?: number | null;
    paid_out_cents?: number | null;
    status: string;
  }>
): {
  available_cents: number;
  credited_cents: number;
  paid_out_cents: number;
} {
  let available = 0;
  let credited = 0;
  let paidOut = 0;
  for (const c of commissions) {
    available += availableCommissionCents(c);
    credited += Number.isInteger(c.credited_cents) ? (c.credited_cents as number) : 0;
    paidOut += Number.isInteger(c.paid_out_cents) ? (c.paid_out_cents as number) : 0;
  }
  return { available_cents: available, credited_cents: credited, paid_out_cents: paidOut };
}
