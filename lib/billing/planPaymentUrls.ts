import type { PaidPlanCode } from "@/lib/billing/plans";

export function buildPlanPaymentCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  planCode: PaidPlanCode;
}): { successUrl: string; cancelUrl: string } {
  const base = input.siteUrl.replace(/\/+$/, "");
  const lang = input.lang.trim() || "ua";
  const billingPath = `/${lang}/specialist/dashboard/billing`;
  const plan = encodeURIComponent(input.planCode);

  return {
    successUrl: `${base}${billingPath}?checkout=success&plan=${plan}`,
    cancelUrl: `${base}${billingPath}?checkout=cancelled&plan=${plan}`,
  };
}
