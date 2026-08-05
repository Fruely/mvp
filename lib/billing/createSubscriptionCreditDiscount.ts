import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
} from "@/lib/billing/promotedAccessConstants";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { PROMOTED_SUBSCRIPTION_CREDIT_PURPOSE } from "@/lib/billing/subscriptionCreditValidation";

export type SubscriptionCreditDiscountResult =
  | { ok: true; couponId: string }
  | { ok: false; reason: "provider_not_configured" | "coupon_create_failed" };

export async function createSubscriptionCreditDiscount(input: {
  creditId: string;
  specialistId: string;
  planCode: PaidPlanCode;
}): Promise<SubscriptionCreditDiscountResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, reason: "provider_not_configured" };
  }

  try {
    const coupon = await stripe.coupons.create({
      amount_off: PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
      currency: PROMOTED_ACCESS_CURRENCY,
      duration: "once",
      max_redemptions: 1,
      metadata: {
        purpose: PROMOTED_SUBSCRIPTION_CREDIT_PURPOSE,
        credit_id: input.creditId,
        specialist_id: input.specialistId,
        plan_code: input.planCode,
      },
    });

    if (!coupon?.id) {
      return { ok: false, reason: "coupon_create_failed" };
    }

    return { ok: true, couponId: coupon.id };
  } catch {
    return { ok: false, reason: "coupon_create_failed" };
  }
}
