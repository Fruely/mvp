import type { PaidPlanCode } from "@/lib/billing/plans";

export type BillingInterval = "month" | "year";

export type PaidPlanBillingConfig = {
  internalPlan: PaidPlanCode;
  billingInterval: BillingInterval;
  stripePriceId: string;
  currency: "EUR";
  active: boolean;
};

function readEnvPrice(...keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

/** Server-side paid plan → Stripe Price mapping (never trust client Price IDs). */
export function getPaidPlanBillingConfig(
  planCode: PaidPlanCode,
  interval: BillingInterval = "month",
): PaidPlanBillingConfig | null {
  if (interval === "year") {
    const stripePriceId =
      planCode === "basic"
        ? readEnvPrice("STRIPE_PRICE_BASIC_ANNUAL", "STRIPE_PRICE_BASIC_YEAR")
        : readEnvPrice("STRIPE_PRICE_PREMIUM_ANNUAL", "STRIPE_PRICE_PREMIUM_YEAR");
    if (!stripePriceId) return null;
    return {
      internalPlan: planCode,
      billingInterval: "year",
      stripePriceId,
      currency: "EUR",
      active: true,
    };
  }

  const stripePriceId =
    planCode === "basic"
      ? readEnvPrice("STRIPE_PRICE_BASIC", "STRIPE_PRICE_BASIC_MONTHLY")
      : readEnvPrice("STRIPE_PRICE_PREMIUM", "STRIPE_PRICE_PREMIUM_MONTHLY");

  if (!stripePriceId) return null;

  return {
    internalPlan: planCode,
    billingInterval: "month",
    stripePriceId,
    currency: "EUR",
    active: true,
  };
}

export function listConfiguredPaidPlans(): PaidPlanBillingConfig[] {
  const configs: PaidPlanBillingConfig[] = [];
  for (const plan of ["basic", "premium"] as const) {
    const monthly = getPaidPlanBillingConfig(plan, "month");
    if (monthly) configs.push(monthly);
    const annual = getPaidPlanBillingConfig(plan, "year");
    if (annual) configs.push(annual);
  }
  return configs;
}
