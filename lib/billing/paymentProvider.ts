import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { isStripeCheckoutReady } from "@/lib/billing/stripeReadiness";
import { StripePaymentProvider } from "@/lib/billing/stripePaymentProvider";

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | {
      ok: false;
      reason:
        | "payments_disabled"
        | "provider_not_configured"
        | "checkout_unavailable"
        | "invalid_plan"
        | "subscription_already_active"
        | "subscription_incomplete"
        | "checkout_error"
        | "forbidden";
    };

export type PaymentProvider = {
  createCheckoutSession(input: {
    specialistId: string;
    planCode: PaidPlanCode;
    successUrl: string;
    cancelUrl: string;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
    billingInterval?: "month" | "year";
  }): Promise<CheckoutSessionResult>;
};

/** Non-production placeholder when Stripe checkout is not ready. */
export class StubPaymentProvider implements PaymentProvider {
  async createCheckoutSession(): Promise<CheckoutSessionResult> {
    return { ok: false, reason: "provider_not_configured" };
  }
}

export type PaymentProviderFactoryInput = {
  supabase: SupabaseClient;
  specialistId: string;
  userId?: string | null;
};

export function getPaymentProvider(input: PaymentProviderFactoryInput): PaymentProvider {
  if (isStripeCheckoutReady()) {
    return new StripePaymentProvider({
      supabase: input.supabase,
      specialistId: input.specialistId,
      userId: input.userId,
    });
  }
  return new StubPaymentProvider();
}
