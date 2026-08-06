import { isManualRenewalEnabled, paymentsEnabled } from "@/lib/billing/featureFlags";
import { getManualPlanPaymentConfig } from "@/lib/billing/planPaymentConfig";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getStripeEnvPresence } from "@/lib/billing/stripeConfig";
import { getPublicSiteUrlPresence } from "@/lib/billing/stripeReadiness";

export type PlanPaymentCheckoutReadiness = {
  ready: boolean;
  blockers: string[];
};

export function getPlanPaymentCheckoutReadiness(
  planCode?: PaidPlanCode,
): PlanPaymentCheckoutReadiness {
  const blockers: string[] = [];

  if (!isManualRenewalEnabled()) blockers.push("manual_renewal_disabled");
  if (!paymentsEnabled) blockers.push("payments_disabled");

  const stripeEnv = getStripeEnvPresence();
  if (stripeEnv.secretKey === "absent") blockers.push("stripe_secret_key_missing");
  if (getPublicSiteUrlPresence() === "absent") blockers.push("site_url_missing");

  if (planCode) {
    if (!getManualPlanPaymentConfig(planCode)) {
      blockers.push("one_time_price_missing");
    }
  }

  return { ready: blockers.length === 0, blockers };
}

export function isPlanPaymentCheckoutReady(planCode?: PaidPlanCode): boolean {
  return getPlanPaymentCheckoutReadiness(planCode).ready;
}
