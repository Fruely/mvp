import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  PLAN_PAYMENT_BILLING_INTERVAL,
  PLAN_PAYMENT_CURRENCY,
  PLAN_PAYMENT_GROSS_CENTS,
  PLAN_PAYMENT_PERIOD_MONTHS,
} from "@/lib/billing/planPaymentConstants";

export type ManualPlanPaymentConfig = {
  planCode: PaidPlanCode;
  grossAmountCents: number;
  periodMonths: typeof PLAN_PAYMENT_PERIOD_MONTHS;
  billingInterval: typeof PLAN_PAYMENT_BILLING_INTERVAL;
  currency: typeof PLAN_PAYMENT_CURRENCY;
  stripePriceId: string;
};

function readOneTimePriceEnv(planCode: PaidPlanCode): string | null {
  const key =
    planCode === "basic"
      ? "STRIPE_PRICE_BASIC_MONTHLY_ONE_TIME"
      : "STRIPE_PRICE_PREMIUM_MONTHLY_ONE_TIME";
  const value = process.env[key]?.trim();
  return value || null;
}

/** Server-side manual plan payment catalog — one-time Stripe Price IDs only (never recurring env vars). */
export function getManualPlanPaymentConfig(
  planCode: PaidPlanCode,
): ManualPlanPaymentConfig | null {
  const stripePriceId = readOneTimePriceEnv(planCode);
  if (!stripePriceId) return null;

  return {
    planCode,
    grossAmountCents: PLAN_PAYMENT_GROSS_CENTS[planCode],
    periodMonths: PLAN_PAYMENT_PERIOD_MONTHS,
    billingInterval: PLAN_PAYMENT_BILLING_INTERVAL,
    currency: PLAN_PAYMENT_CURRENCY,
    stripePriceId,
  };
}
