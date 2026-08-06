import type { PlanPaymentCheckoutResult } from "@/lib/billing/createPlanPaymentCheckout";

export function planPaymentFailureToApi(
  result: Extract<PlanPaymentCheckoutResult, { ok: false }>,
): { error: string; status: number } {
  switch (result.reason) {
    case "payments_not_ready":
      return { error: "payments_not_ready", status: 503 };
    case "checkout_configuration_invalid":
      return { error: "checkout_configuration_invalid", status: 503 };
    case "invalid_plan":
      return { error: "invalid_plan", status: 400 };
    case "specialist_not_found":
      return { error: "specialist_not_found", status: 403 };
    case "plan_change_during_active_period_not_allowed":
      return { error: "plan_change_during_active_period_not_allowed", status: 409 };
    case "promoted_credit_already_reserved":
      return { error: "promoted_credit_already_reserved", status: 409 };
    case "checkout_creation_failed":
      return { error: "checkout_creation_failed", status: 502 };
    default:
      return { error: "checkout_creation_failed", status: 502 };
  }
}
