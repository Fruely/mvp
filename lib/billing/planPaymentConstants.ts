import type { PaidPlanCode } from "@/lib/billing/plans";

export const PLAN_PAYMENT_PURPOSE = "specialist_plan_payment";
export const PLAN_PAYMENT_CURRENCY = "eur";
export const PLAN_PAYMENT_BILLING_INTERVAL = "month";
export const PLAN_PAYMENT_PERIOD_MONTHS = 1;
export const PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS = 1000;
export const STALE_PENDING_RESERVATION_MINUTES = 15;

export const PLAN_PAYMENT_GROSS_CENTS: Record<PaidPlanCode, number> = {
  basic: 2900,
  premium: 5900,
};

export const PLAN_PAYMENT_INSERT_SELECT = "id";

export const PLAN_PAYMENT_CREDIT_RESERVED_STATUSES = [
  "pending",
  "checkout_created",
  "paid",
  "refunded",
  "disputed",
] as const;
