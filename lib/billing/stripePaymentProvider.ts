import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getPaidPlanBillingConfig } from "@/lib/billing/planConfig";
import {
  buildStripeCheckoutMetadata,
  getOrCreateStripeCustomerForSpecialist,
} from "@/lib/billing/billingCustomers";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { isStripeCheckoutReady } from "@/lib/billing/stripeReadiness";
import { assertNoBlockingStripeSubscription } from "@/lib/billing/stripeSubscriptionGuard";
import type { CheckoutSessionResult, PaymentProvider } from "@/lib/billing/paymentProvider";

export type StripeCheckoutContext = {
  supabase: SupabaseClient;
  specialistId: string;
  userId?: string | null;
  email?: string | null;
  name?: string | null;
};

export class StripePaymentProvider implements PaymentProvider {
  constructor(private readonly context: StripeCheckoutContext) {}

  async createCheckoutSession(input: {
    specialistId: string;
    planCode: PaidPlanCode;
    successUrl: string;
    cancelUrl: string;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
    billingInterval?: "month" | "year";
  }): Promise<CheckoutSessionResult> {
    if (!isStripeCheckoutReady()) {
      return { ok: false, reason: "checkout_unavailable" };
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return { ok: false, reason: "provider_not_configured" };
    }

    const planConfig = getPaidPlanBillingConfig(
      input.planCode,
      input.billingInterval ?? "month",
    );
    if (!planConfig || !planConfig.active) {
      return { ok: false, reason: "invalid_plan" };
    }

    const ctx = this.context;
    if (ctx.specialistId !== input.specialistId) {
      return { ok: false, reason: "forbidden" };
    }

    try {
      const { customerId, reused } = await getOrCreateStripeCustomerForSpecialist(ctx.supabase, {
        specialistId: input.specialistId,
        userId: input.userId ?? ctx.userId,
        email: input.email ?? ctx.email,
        name: input.name ?? ctx.name,
      });

      console.info("[billing/checkout] customer_resolved", {
        specialistId: input.specialistId,
        reused,
      });

      const guard = await assertNoBlockingStripeSubscription(customerId);
      if (!guard.allowed) {
        console.info("[billing/checkout] rejected", {
          specialistId: input.specialistId,
          reason: guard.reason,
        });
        return { ok: false, reason: guard.reason };
      }

      const metadata = buildStripeCheckoutMetadata({
        specialistId: input.specialistId,
        userId: input.userId ?? ctx.userId,
        internalPlan: planConfig.internalPlan,
        billingInterval: planConfig.billingInterval,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata,
        subscription_data: {
          metadata: {
            purpose: "specialist_subscription",
            specialist_id: input.specialistId,
            plan_code: planConfig.internalPlan,
            internal_plan: planConfig.internalPlan,
            billing_interval: planConfig.billingInterval,
          },
        },
        client_reference_id: input.specialistId,
      });

      if (!session.url) {
        return { ok: false, reason: "provider_not_configured" };
      }

      console.info("[billing/checkout] session_created", {
        specialistId: input.specialistId,
        plan: planConfig.internalPlan,
        interval: planConfig.billingInterval,
      });

      return { ok: true, url: session.url };
    } catch (err) {
      console.error(
        "[billing/checkout] session_failed",
        input.specialistId,
        err instanceof Error ? err.message : "unknown",
      );
      return { ok: false, reason: "checkout_error" };
    }
  }
}
