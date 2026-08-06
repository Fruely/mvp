import type { SupabaseClient } from "@supabase/supabase-js";
import { isManualRenewalEnabled, paymentsEnabled } from "@/lib/billing/featureFlags";
import {
  createPlanPaymentCheckout,
  type PlanPaymentCheckoutResult,
} from "@/lib/billing/createPlanPaymentCheckout";
import { buildBillingCheckoutUrls } from "@/lib/billing/billingUrls";
import { getPaymentProvider } from "@/lib/billing/paymentProvider";
import { parsePaidPlanCode } from "@/lib/billing/plans";
import type { CheckoutSessionResult } from "@/lib/billing/paymentProvider";
import { getStripeCheckoutReadiness } from "@/lib/billing/stripeReadiness";
import type { Lang } from "@/lib/i18n";

export { findUntrustedCheckoutBodyKeys } from "@/lib/billing/checkoutBodyValidation";

export type CreateCheckoutInput = {
  supabase: SupabaseClient;
  specialistId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  planCodeRaw: unknown;
  lang: Lang;
  siteUrl: string;
};

export type CreateCheckoutSuccess = {
  ok: true;
  url: string;
  checkoutUrl?: string;
  provider?: "stripe";
  mode?: "subscription" | "payment";
};

export type CreateCheckoutFailure =
  | Extract<CheckoutSessionResult, { ok: false }>
  | Extract<PlanPaymentCheckoutResult, { ok: false }>;

export type CreateCheckoutResult = CreateCheckoutSuccess | CreateCheckoutFailure;

export async function createCheckoutSessionForSpecialist(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const planCode = parsePaidPlanCode(input.planCodeRaw);
  if (!planCode) {
    return { ok: false, reason: "invalid_plan" };
  }

  if (isManualRenewalEnabled()) {
    const manual = await createPlanPaymentCheckout({
      supabase: input.supabase,
      specialistId: input.specialistId,
      userId: input.userId,
      planCode,
      lang: input.lang,
      siteUrl: input.siteUrl,
    });
    if (!manual.ok) return manual;
    return {
      ok: true,
      url: manual.checkoutUrl,
      checkoutUrl: manual.checkoutUrl,
      provider: manual.provider,
      mode: manual.mode,
    };
  }

  if (!paymentsEnabled) {
    return { ok: false, reason: "payments_disabled" };
  }

  const readiness = getStripeCheckoutReadiness();
  if (!readiness.ready) {
    return { ok: false, reason: "checkout_unavailable" };
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

  const legacy = await provider.createCheckoutSession({
    specialistId: input.specialistId,
    planCode,
    successUrl,
    cancelUrl,
    userId: input.userId,
    email: input.userEmail,
    name: input.userName,
  });

  if (!legacy.ok) {
    return legacy;
  }

  return {
    ok: true,
    url: legacy.url,
    provider: "stripe",
    mode: "subscription",
  };
}
