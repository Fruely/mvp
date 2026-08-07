import { isManualRenewalEnabled } from "@/lib/billing/featureFlags";
import { getPlanPaymentCheckoutReadiness } from "@/lib/billing/planPaymentReadiness";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getStripeCheckoutReadiness } from "@/lib/billing/stripeReadiness";

/** Per-plan checkout button visibility on the specialist billing page. */
export function isBillingPagePlanCheckoutEnabled(planCode: PaidPlanCode): boolean {
  if (isManualRenewalEnabled()) {
    return getPlanPaymentCheckoutReadiness(planCode).ready;
  }
  return getStripeCheckoutReadiness().ready;
}

/** Global disabled banner on the billing page (legacy: all-or-nothing; manual: neither plan ready). */
export function isBillingPageCheckoutDisabledBannerVisible(): boolean {
  if (isManualRenewalEnabled()) {
    return (
      !getPlanPaymentCheckoutReadiness("basic").ready &&
      !getPlanPaymentCheckoutReadiness("premium").ready
    );
  }
  return !getStripeCheckoutReadiness().ready;
}
