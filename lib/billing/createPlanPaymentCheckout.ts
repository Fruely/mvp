import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { getOrCreateStripeCustomerForSpecialist } from "@/lib/billing/billingCustomers";
import { createPlanPaymentCreditDiscount } from "@/lib/billing/createPlanPaymentCreditDiscount";
import { expireStalePendingPlanPaymentReservations } from "@/lib/billing/expireStalePlanPaymentReservations";
import { getEligiblePromotedSubscriptionCredit } from "@/lib/billing/getEligiblePromotedSubscriptionCredit";
import { computePlanPaymentAmounts } from "@/lib/billing/planPaymentAmounts";
import {
  PLAN_PAYMENT_BILLING_INTERVAL,
  PLAN_PAYMENT_CURRENCY,
  PLAN_PAYMENT_INSERT_SELECT,
  PLAN_PAYMENT_PERIOD_MONTHS,
  PLAN_PAYMENT_PURPOSE,
} from "@/lib/billing/planPaymentConstants";
import { getManualPlanPaymentConfig } from "@/lib/billing/planPaymentConfig";
import { evaluatePlanPurchasePolicy } from "@/lib/billing/planPaymentPolicy";
import { isPlanPaymentCheckoutReady } from "@/lib/billing/planPaymentReadiness";
import { buildPlanPaymentCheckoutUrls } from "@/lib/billing/planPaymentUrls";
import { validatePlanPaymentStripePrice } from "@/lib/billing/validatePlanPaymentStripePrice";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";

export type PlanPaymentCheckoutResult =
  | { ok: true; checkoutUrl: string; provider: "stripe"; mode: "payment" }
  | {
      ok: false;
      reason:
        | "payments_not_ready"
        | "checkout_configuration_invalid"
        | "invalid_plan"
        | "specialist_not_found"
        | "plan_change_during_active_period_not_allowed"
        | "promoted_credit_already_reserved"
        | "checkout_creation_failed";
    };

function isPromotedCreditReservationConflict(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export function buildPlanPaymentStripeMetadata(input: {
  planPaymentId: string;
  specialistId: string;
  userId: string;
  planCode: PaidPlanCode;
}): Record<string, string> {
  return {
    purpose: PLAN_PAYMENT_PURPOSE,
    plan_payment_id: input.planPaymentId,
    specialist_id: input.specialistId,
    user_id: input.userId,
    plan_code: input.planCode,
    billing_interval: PLAN_PAYMENT_BILLING_INTERVAL,
  };
}

async function markPlanPaymentFailed(
  supabase: SupabaseClient,
  planPaymentId: string,
  failureCode: string,
): Promise<void> {
  const failedAt = new Date().toISOString();
  try {
    await supabase
      .from("plan_payments")
      .update({
        status: "failed",
        failed_at: failedAt,
        failure_code: failureCode,
        updated_at: failedAt,
      })
      .eq("id", planPaymentId);
  } catch {
    // best-effort — failed status releases promoted_credit reservation
  }
}

async function expireStripeCheckoutSession(sessionId: string): Promise<void> {
  const stripe = getStripeClient();
  if (!stripe) return;
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch {
    console.info("[billing/plan-payment] stripe_session_expire_failed", {
      sessionId,
    });
  }
}

export async function createPlanPaymentCheckout(input: {
  supabase: SupabaseClient;
  specialistId: string;
  userId: string;
  planCode: PaidPlanCode;
  lang: Lang;
  siteUrl: string;
}): Promise<PlanPaymentCheckoutResult> {
  if (!isPlanPaymentCheckoutReady(input.planCode)) {
    console.info("[billing/plan-payment] payments_not_ready", {
      specialistId: input.specialistId,
    });
    return { ok: false, reason: "payments_not_ready" };
  }

  const planConfig = getManualPlanPaymentConfig(input.planCode);
  if (!planConfig) {
    return { ok: false, reason: "payments_not_ready" };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, reason: "payments_not_ready" };
  }

  const currentPlan = await getSpecialistPlanForDashboard(input.supabase, input.specialistId);
  const policy = evaluatePlanPurchasePolicy({
    currentPlan,
    requestedPlanCode: input.planCode,
  });
  if (!policy.allowed) {
    console.info("[billing/plan-payment] plan_change_blocked", {
      specialistId: input.specialistId,
      planCode: input.planCode,
    });
    return { ok: false, reason: policy.reason };
  }

  const eligibleCredit = await getEligiblePromotedSubscriptionCredit(
    input.supabase,
    input.specialistId,
  );

  if (eligibleCredit?.id) {
    await expireStalePendingPlanPaymentReservations(input.supabase, eligibleCredit.id);
  }

  const amounts = computePlanPaymentAmounts({
    planCode: input.planCode,
    applyPromotedCredit: eligibleCredit !== null,
  });

  const nowIso = new Date().toISOString();
  const insertPayload: Record<string, unknown> = {
    specialist_id: input.specialistId,
    user_id: input.userId,
    provider: "stripe",
    status: "pending",
    plan_code: input.planCode,
    billing_interval: PLAN_PAYMENT_BILLING_INTERVAL,
    currency: PLAN_PAYMENT_CURRENCY,
    gross_amount_cents: amounts.grossAmountCents,
    discount_amount_cents: amounts.discountAmountCents,
    net_amount_cents: amounts.netAmountCents,
    period_months: PLAN_PAYMENT_PERIOD_MONTHS,
    promoted_credit_id: eligibleCredit?.id ?? null,
    metadata: {
      checkout_lang: input.lang,
    },
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data: paymentRow, error: insertError } = await input.supabase
    .from("plan_payments")
    .insert(insertPayload)
    .select(PLAN_PAYMENT_INSERT_SELECT)
    .single();

  if (insertError || !paymentRow?.id) {
    if (eligibleCredit && isPromotedCreditReservationConflict(insertError)) {
      console.info("[billing/plan-payment] promoted_credit_already_reserved", {
        specialistId: input.specialistId,
        creditId: eligibleCredit.id,
      });
      return { ok: false, reason: "promoted_credit_already_reserved" };
    }

    console.info("[billing/plan-payment] insert_failed", {
      specialistId: input.specialistId,
    });
    return { ok: false, reason: "checkout_creation_failed" };
  }

  const planPaymentId = paymentRow.id as string;

  let customerId: string;
  try {
    ({ customerId } = await getOrCreateStripeCustomerForSpecialist(input.supabase, {
      specialistId: input.specialistId,
      userId: input.userId,
    }));
  } catch {
    console.info("[billing/plan-payment] stripe_customer_failed", {
      specialistId: input.specialistId,
      planPaymentId,
    });
    await markPlanPaymentFailed(input.supabase, planPaymentId, "stripe_customer_failed");
    return { ok: false, reason: "checkout_creation_failed" };
  }

  const priceValidation = await validatePlanPaymentStripePrice({
    stripePriceId: planConfig.stripePriceId,
    planCode: input.planCode,
  });
  if (!priceValidation.ok) {
    console.info("[billing/plan-payment] stripe_price_invalid", {
      specialistId: input.specialistId,
      planPaymentId,
      planCode: input.planCode,
    });
    await markPlanPaymentFailed(
      input.supabase,
      planPaymentId,
      priceValidation.failureCode,
    );
    return { ok: false, reason: priceValidation.apiReason };
  }

  const { successUrl, cancelUrl } = buildPlanPaymentCheckoutUrls({
    siteUrl: input.siteUrl,
    lang: input.lang,
    planCode: input.planCode,
  });

  const metadata = buildPlanPaymentStripeMetadata({
    planPaymentId,
    specialistId: input.specialistId,
    userId: input.userId,
    planCode: input.planCode,
  });

  let discounts: Array<{ coupon: string }> | undefined;
  if (eligibleCredit) {
    const discount = await createPlanPaymentCreditDiscount({
      creditId: eligibleCredit.id,
      specialistId: input.specialistId,
      planCode: input.planCode,
      planPaymentId,
    });

    if (!discount.ok) {
      console.info("[billing/plan-payment] stripe_coupon_failed", {
        specialistId: input.specialistId,
        planPaymentId,
      });
      await markPlanPaymentFailed(input.supabase, planPaymentId, "stripe_coupon_failed");
      return { ok: false, reason: "checkout_creation_failed" };
    }

    discounts = [{ coupon: discount.couponId }];
  }

  let session: { id: string; url: string | null };
  try {
    const created = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: {
        metadata,
      },
      ...(discounts ? { discounts } : {}),
      client_reference_id: planPaymentId,
    });

    if (!created.url || !created.id) {
      await markPlanPaymentFailed(input.supabase, planPaymentId, "stripe_session_incomplete");
      return { ok: false, reason: "checkout_creation_failed" };
    }

    session = { id: created.id, url: created.url };
  } catch {
    console.info("[billing/plan-payment] stripe_session_failed", {
      specialistId: input.specialistId,
      planPaymentId,
    });
    await markPlanPaymentFailed(input.supabase, planPaymentId, "stripe_session_failed");
    return { ok: false, reason: "checkout_creation_failed" };
  }

  const checkoutCreatedAt = new Date().toISOString();
  const { error: updateError } = await input.supabase
    .from("plan_payments")
    .update({
      status: "checkout_created",
      stripe_checkout_session_id: session.id,
      provider_customer_id: customerId,
      provider_price_id: planConfig.stripePriceId,
      checkout_created_at: checkoutCreatedAt,
      updated_at: checkoutCreatedAt,
    })
    .eq("id", planPaymentId);

  if (updateError) {
    console.info("[billing/plan-payment] db_update_after_stripe_failed", {
      specialistId: input.specialistId,
      planPaymentId,
    });
    await expireStripeCheckoutSession(session.id);
    await markPlanPaymentFailed(input.supabase, planPaymentId, "db_update_failed");
    return { ok: false, reason: "checkout_creation_failed" };
  }

  console.info("[billing/plan-payment] checkout_created", {
    specialistId: input.specialistId,
    planPaymentId,
    planCode: input.planCode,
  });

  return {
    ok: true,
    checkoutUrl: session.url as string,
    provider: "stripe",
    mode: "payment",
  };
}
