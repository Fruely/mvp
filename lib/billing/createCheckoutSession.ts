import { paymentsEnabled } from "@/lib/billing/featureFlags";
import { getPaymentProvider } from "@/lib/billing/paymentProvider";
import { parsePaidPlanCode } from "@/lib/billing/plans";
import type { CheckoutSessionResult } from "@/lib/billing/paymentProvider";

export type CreateCheckoutInput = {
  specialistId: string;
  planCodeRaw: unknown;
  lang: string;
  siteUrl: string;
};

export async function createCheckoutSessionForSpecialist(
  input: CreateCheckoutInput,
): Promise<CheckoutSessionResult> {
  if (!paymentsEnabled) {
    return { ok: false, reason: "payments_disabled" };
  }

  const planCode = parsePaidPlanCode(input.planCodeRaw);
  if (!planCode) {
    return { ok: false, reason: "invalid_plan" };
  }

  const lang = input.lang.trim() || "ua";
  const base = input.siteUrl.replace(/\/$/, "");
  const billingPath = `/${lang}/specialist/dashboard/billing`;

  return getPaymentProvider().createCheckoutSession({
    specialistId: input.specialistId,
    planCode,
    successUrl: `${base}${billingPath}?checkout=success&plan=${planCode}`,
    cancelUrl: `${base}${billingPath}?checkout=cancel&plan=${planCode}`,
  });
}
