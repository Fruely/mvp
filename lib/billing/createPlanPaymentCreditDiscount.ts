import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  PLAN_PAYMENT_CURRENCY,
  PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS,
  PLAN_PAYMENT_PURPOSE,
} from "@/lib/billing/planPaymentConstants";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PlanPaymentCreditDiscountResult =
  | { ok: true; couponId: string }
  | { ok: false; reason: "provider_not_configured" | "coupon_create_failed" };

export async function createPlanPaymentCreditDiscount(input: {
  creditId: string;
  specialistId: string;
  planCode: PaidPlanCode;
  planPaymentId: string;
}): Promise<PlanPaymentCreditDiscountResult> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, reason: "provider_not_configured" };
  }

  try {
    const coupon = await stripe.coupons.create({
      amount_off: PLAN_PAYMENT_PROMOTED_DISCOUNT_CENTS,
      currency: PLAN_PAYMENT_CURRENCY,
      duration: "once",
      max_redemptions: 1,
      metadata: {
        purpose: `${PLAN_PAYMENT_PURPOSE}_credit`,
        credit_id: input.creditId,
        specialist_id: input.specialistId,
        plan_code: input.planCode,
        plan_payment_id: input.planPaymentId,
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
