import type { PaidPlanCode } from "./plans";

export const CHECKOUT_RETURN_TARGETS = ["web", "native"] as const;
export type CheckoutReturnTarget = (typeof CHECKOUT_RETURN_TARGETS)[number];

export const CHECKOUT_RETURN_OUTCOMES = ["success", "cancelled"] as const;
export type CheckoutReturnOutcome = (typeof CHECKOUT_RETURN_OUTCOMES)[number];

/** Registered Native app scheme. Deep links are navigation only — not entitlement. */
export const NATIVE_BILLING_APP_SCHEME = "freuly";
export const NATIVE_BILLING_RETURN_PATH = "specialist/billing";

export function parseCheckoutReturnTarget(value: unknown): CheckoutReturnTarget | null {
  if (value === undefined || value === null) {
    return "web";
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "") {
    return "web";
  }
  if (normalized === "web" || normalized === "native") {
    return normalized;
  }
  return null;
}

export function parseCheckoutReturnOutcome(value: unknown): CheckoutReturnOutcome | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "success" || normalized === "cancelled") {
    return normalized;
  }
  return null;
}

export function buildNativeBillingDeepLink(input: {
  checkout: CheckoutReturnOutcome;
  planCode: PaidPlanCode;
}): string {
  const plan = encodeURIComponent(input.planCode);
  return `${NATIVE_BILLING_APP_SCHEME}://${NATIVE_BILLING_RETURN_PATH}?checkout=${input.checkout}&plan=${plan}`;
}

export function buildNativeCheckoutBouncePath(input: {
  checkout: CheckoutReturnOutcome;
  planCode: PaidPlanCode;
}): string {
  const plan = encodeURIComponent(input.planCode);
  return `/api/billing/checkout-return?checkout=${input.checkout}&plan=${plan}&target=native`;
}

/**
 * Stripe-facing URLs must be HTTPS. Native custom-scheme destinations are applied
 * only by the server-owned bounce route. Return URLs never encode entitlement.
 */
export function buildTrustedPlanPaymentCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  planCode: PaidPlanCode;
  returnTarget: CheckoutReturnTarget;
}): { successUrl: string; cancelUrl: string } {
  const base = input.siteUrl.replace(/\/+$/, "");
  const plan = encodeURIComponent(input.planCode);

  if (input.returnTarget === "native") {
    return {
      successUrl: `${base}${buildNativeCheckoutBouncePath({ checkout: "success", planCode: input.planCode })}`,
      cancelUrl: `${base}${buildNativeCheckoutBouncePath({ checkout: "cancelled", planCode: input.planCode })}`,
    };
  }

  const lang = input.lang.trim() || "ua";
  const billingPath = `/${lang}/specialist/dashboard/billing`;
  return {
    successUrl: `${base}${billingPath}?checkout=success&plan=${plan}`,
    cancelUrl: `${base}${billingPath}?checkout=cancelled&plan=${plan}`,
  };
}

export function buildTrustedLegacyBillingCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  planCode: PaidPlanCode;
  returnTarget: CheckoutReturnTarget;
}): { successUrl: string; cancelUrl: string } {
  if (input.returnTarget === "native") {
    return buildTrustedPlanPaymentCheckoutUrls(input);
  }

  const base = input.siteUrl.replace(/\/+$/, "");
  const lang = input.lang.trim() || "ua";
  const billingPath = `/${lang}/specialist/dashboard/billing`;
  const plan = encodeURIComponent(input.planCode);

  return {
    successUrl: `${base}${billingPath}?checkout=success&plan=${plan}`,
    cancelUrl: `${base}${billingPath}?checkout=cancel&plan=${plan}`,
  };
}
