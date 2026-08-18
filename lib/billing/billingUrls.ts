import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  buildTrustedLegacyBillingCheckoutUrls,
  type CheckoutReturnTarget,
} from "@/lib/billing/checkoutReturnTarget";

/** Build trusted internal billing URLs — no client-provided hosts. */
export function buildBillingCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  planCode: PaidPlanCode;
  returnTarget?: CheckoutReturnTarget;
}): { successUrl: string; cancelUrl: string } {
  return buildTrustedLegacyBillingCheckoutUrls({
    siteUrl: input.siteUrl,
    lang: input.lang,
    planCode: input.planCode,
    returnTarget: input.returnTarget ?? "web",
  });
}
