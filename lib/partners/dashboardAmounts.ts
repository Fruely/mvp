export type DashboardAmountTotals = {
  pending_cents: number;
  approved_unpaid_cents: number;
  paid_cents: number;
  total_earned_cents: number;
  available_for_payout_cents: number;
};

/** Integer-cents balance math from commission rows (no floats). */
export function computeDashboardAmounts(
  commissions: Array<{ amount_cents: number; status: string }>
): DashboardAmountTotals {
  let pending = 0;
  let approvedUnpaid = 0;
  let paid = 0;
  let totalEarned = 0;

  for (const c of commissions) {
    const amount = Number.isInteger(c.amount_cents) ? c.amount_cents : 0;
    if (c.status === "pending") pending += amount;
    if (c.status === "approved") {
      approvedUnpaid += amount;
      totalEarned += amount;
    }
    if (c.status === "paid") {
      paid += amount;
      totalEarned += amount;
    }
  }

  return {
    pending_cents: pending,
    approved_unpaid_cents: approvedUnpaid,
    paid_cents: paid,
    total_earned_cents: totalEarned,
    available_for_payout_cents: approvedUnpaid,
  };
}
