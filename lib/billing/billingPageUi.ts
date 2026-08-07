import type { PaidPlanCode, PlanCode } from "@/lib/billing/plans";

const PAID_ACTIVE_STATUSES = new Set(["active"]);

/**
 * Whether a paid plan card should show the "CURRENT" badge.
 * Only true when there is a genuine active paid entitlement matching this card.
 * Grace/inactive/early_access → never CURRENT.
 */
export function isPlanCardCurrent(
  cardCode: PaidPlanCode,
  currentPlanCode: PlanCode,
  planStatus: string,
): boolean {
  if (!PAID_ACTIVE_STATUSES.has(planStatus)) return false;
  return currentPlanCode === cardCode;
}
