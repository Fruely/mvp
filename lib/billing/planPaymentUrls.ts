import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  buildTrustedPlanPaymentCheckoutUrls,
  type CheckoutReturnTarget,
} from "@/lib/billing/checkoutReturnTarget";

export function buildPlanPaymentCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  planCode: PaidPlanCode;
  returnTarget?: CheckoutReturnTarget;
}): { successUrl: string; cancelUrl: string } {
  return buildTrustedPlanPaymentCheckoutUrls({
    siteUrl: input.siteUrl,
    lang: input.lang,
    planCode: input.planCode,
    returnTarget: input.returnTarget ?? "web",
  });
}
