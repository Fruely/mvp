import type { CheckoutSessionResult } from "@/lib/billing/paymentProvider";

export function checkoutFailureToApi(
  result: Extract<CheckoutSessionResult, { ok: false }>,
): { error: string; status: number } {
  switch (result.reason) {
    case "payments_disabled":
      return { error: "payments_disabled", status: 503 };
    case "checkout_unavailable":
      return { error: "checkout_unavailable", status: 503 };
    case "invalid_plan":
      return { error: "invalid_plan", status: 400 };
    case "provider_not_configured":
      return { error: "provider_not_configured", status: 501 };
    case "subscription_already_active":
      return { error: "subscription_already_active", status: 409 };
    case "subscription_incomplete":
      return { error: "subscription_incomplete", status: 409 };
    case "forbidden":
      return { error: "forbidden", status: 403 };
    case "checkout_error":
      return { error: "checkout_error", status: 502 };
    default:
      return { error: "checkout_error", status: 502 };
  }
}
