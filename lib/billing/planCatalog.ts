import { PLAN_PUBLIC_NAMES } from "./planEntitlements";
import {
  PLAN_PAYMENT_BILLING_INTERVAL,
  PLAN_PAYMENT_CURRENCY,
  PLAN_PAYMENT_GROSS_CENTS,
  PLAN_PAYMENT_PERIOD_MONTHS,
} from "./planPaymentConstants";
import {
  PUBLIC_COMMERCIAL_PLAN_CATALOG,
  type PaidPlanCode,
} from "./plans";

export type PublicCommercialPlanItem = {
  plan_code: PaidPlanCode;
  public_name: string;
  amount_cents: number;
  currency: typeof PLAN_PAYMENT_CURRENCY;
  period_months: typeof PLAN_PAYMENT_PERIOD_MONTHS;
  billing_interval: typeof PLAN_PAYMENT_BILLING_INTERVAL;
};

export function listPublicCommercialPlans(): PublicCommercialPlanItem[] {
  return PUBLIC_COMMERCIAL_PLAN_CATALOG.map((plan) => ({
    plan_code: plan.code,
    public_name: PLAN_PUBLIC_NAMES[plan.code],
    amount_cents: PLAN_PAYMENT_GROSS_CENTS[plan.code],
    currency: PLAN_PAYMENT_CURRENCY,
    period_months: PLAN_PAYMENT_PERIOD_MONTHS,
    billing_interval: PLAN_PAYMENT_BILLING_INTERVAL,
  }));
}

export function isPurchasablePlanCode(value: string): value is PaidPlanCode {
  return PUBLIC_COMMERCIAL_PLAN_CATALOG.some((plan) => plan.code === value);
}
