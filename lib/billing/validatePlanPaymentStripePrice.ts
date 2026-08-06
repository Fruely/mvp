import type { PaidPlanCode } from "@/lib/billing/plans";
import { PLAN_PAYMENT_GROSS_CENTS, PLAN_PAYMENT_CURRENCY } from "@/lib/billing/planPaymentConstants";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PlanPaymentStripePriceValidationResult =
  | { ok: true }
  | {
      ok: false;
      failureCode: "stripe_price_invalid" | "stripe_price_fetch_failed";
      apiReason: "checkout_configuration_invalid" | "payments_not_ready";
    };

export async function validatePlanPaymentStripePrice(input: {
  stripePriceId: string;
  planCode: PaidPlanCode;
}): Promise<PlanPaymentStripePriceValidationResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      ok: false,
      failureCode: "stripe_price_fetch_failed",
      apiReason: "payments_not_ready",
    };
  }

  const expectedAmount = PLAN_PAYMENT_GROSS_CENTS[input.planCode];

  try {
    const price = await stripe.prices.retrieve(input.stripePriceId);

    if (price.id !== input.stripePriceId) {
      return {
        ok: false,
        failureCode: "stripe_price_invalid",
        apiReason: "checkout_configuration_invalid",
      };
    }
    if (!price.active) {
      return {
        ok: false,
        failureCode: "stripe_price_invalid",
        apiReason: "checkout_configuration_invalid",
      };
    }
    if (price.type !== "one_time") {
      return {
        ok: false,
        failureCode: "stripe_price_invalid",
        apiReason: "checkout_configuration_invalid",
      };
    }
    if (price.currency !== PLAN_PAYMENT_CURRENCY) {
      return {
        ok: false,
        failureCode: "stripe_price_invalid",
        apiReason: "checkout_configuration_invalid",
      };
    }
    if (price.unit_amount !== expectedAmount) {
      return {
        ok: false,
        failureCode: "stripe_price_invalid",
        apiReason: "checkout_configuration_invalid",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      failureCode: "stripe_price_fetch_failed",
      apiReason: "checkout_configuration_invalid",
    };
  }
}
