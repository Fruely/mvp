import type { PaidPlanCode } from "@/lib/billing/plans";
import type { SpecialistPlanForUi } from "@/lib/specialists/subscription";

export type PlanPurchasePolicyResult =
  | { allowed: true }
  | { allowed: false; reason: "plan_change_during_active_period_not_allowed" };

function parsePaidPlanCode(value: string): PaidPlanCode | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "basic" || normalized === "premium") return normalized;
  return null;
}

/**
 * Active paid period = expires_at strictly in the future.
 * plan_status and grace_until are ignored for purchase policy (date-only rule).
 */
export function hasActivePaidPeriod(
  plan: Pick<SpecialistPlanForUi, "expires_at">,
  now: Date = new Date(),
): boolean {
  if (!plan.expires_at) return false;
  const expiresAtMs = Date.parse(plan.expires_at);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs > now.getTime();
}

export function evaluatePlanPurchasePolicy(input: {
  currentPlan: SpecialistPlanForUi;
  requestedPlanCode: PaidPlanCode;
  now?: Date;
}): PlanPurchasePolicyResult {
  const now = input.now ?? new Date();

  if (!hasActivePaidPeriod(input.currentPlan, now)) {
    return { allowed: true };
  }

  const currentPaidPlan = parsePaidPlanCode(input.currentPlan.plan_code);
  if (!currentPaidPlan) {
    return { allowed: true };
  }

  if (currentPaidPlan === input.requestedPlanCode) {
    return { allowed: true };
  }

  return { allowed: false, reason: "plan_change_during_active_period_not_allowed" };
}
