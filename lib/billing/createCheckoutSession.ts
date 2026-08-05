import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBillingCheckoutUrls } from "@/lib/billing/billingUrls";
import { paymentsEnabled } from "@/lib/billing/featureFlags";
import { getPaymentProvider } from "@/lib/billing/paymentProvider";
import { parsePaidPlanCode } from "@/lib/billing/plans";
import type { CheckoutSessionResult } from "@/lib/billing/paymentProvider";
import { getStripeCheckoutReadiness } from "@/lib/billing/stripeReadiness";

export { findUntrustedCheckoutBodyKeys } from "@/lib/billing/checkoutBodyValidation";

export type CreateCheckoutInput = {
  supabase: SupabaseClient;
  specialistId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  planCodeRaw: unknown;
  lang: string;
  siteUrl: string;
};

export async function createCheckoutSessionForSpecialist(
  input: CreateCheckoutInput,
): Promise<CheckoutSessionResult> {
  if (!paymentsEnabled) {
    return { ok: false, reason: "payments_disabled" };
  }

  const readiness = getStripeCheckoutReadiness();
  if (!readiness.ready) {
    return { ok: false, reason: "checkout_unavailable" };
  }

  const planCode = parsePaidPlanCode(input.planCodeRaw);
  if (!planCode) {
    return { ok: false, reason: "invalid_plan" };
  }

  const { successUrl, cancelUrl } = buildBillingCheckoutUrls({
    siteUrl: input.siteUrl,
    lang: input.lang,
    planCode,
  });

  const provider = getPaymentProvider({
    supabase: input.supabase,
    specialistId: input.specialistId,
    userId: input.userId,
  });

  return provider.createCheckoutSession({
    specialistId: input.specialistId,
    planCode,
    successUrl,
    cancelUrl,
    userId: input.userId,
    email: input.userEmail,
    name: input.userName,
  });
}
