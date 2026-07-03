import type { PaidPlanCode } from "@/lib/billing/plans";

export type CheckoutSessionResult =
  | { ok: true; url: string }
  | { ok: false; reason: "payments_disabled" | "provider_not_configured" | "invalid_plan" };

export type PaymentProvider = {
  createCheckoutSession(input: {
    specialistId: string;
    planCode: PaidPlanCode;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSessionResult>;
};

/** Placeholder until Stripe is wired — no SDK, no secrets in code. */
export class StubPaymentProvider implements PaymentProvider {
  async createCheckoutSession(): Promise<CheckoutSessionResult> {
    const hasStripeSecret = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    if (!hasStripeSecret) {
      return { ok: false, reason: "provider_not_configured" };
    }
    return { ok: false, reason: "provider_not_configured" };
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new StubPaymentProvider();
}
