import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import { getOrCreateStripeCustomerForSpecialist } from "@/lib/billing/billingCustomers";
import {
  PROMOTED_ACCESS_AMOUNT_CENTS,
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_ACCESS_PURPOSE,
  PROMOTED_PAYMENT_INSERT_SELECT,
} from "@/lib/billing/promotedAccessConstants";
import {
  getSignupBindingForCheckout,
  hasActivePromotedAccessGrant,
  promotionExistsForCheckout,
} from "@/lib/billing/promotedAccessData";
import { isPromotedAccessCheckoutReady } from "@/lib/billing/promotedAccessReadiness";
import { buildPromotedAccessCheckoutUrls } from "@/lib/billing/promotedAccessUrls";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";

export type PromotedAccessCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | {
      ok: false;
      reason:
        | "payments_unavailable"
        | "not_eligible"
        | "already_has_access"
        | "subscription_access"
        | "checkout_error"
        | "db_error";
    };

function promotedAccessProductName(lang: Lang): string {
  if (lang === "de") return "Freuly Anfrage-Zugang";
  if (lang === "ru") return "Доступ к запросу Freuly";
  return "Доступ до запиту Freuly";
}

export function buildPromotedAccessStripeMetadata(input: {
  paymentId: string;
  specialistId: string;
  promotionId: string;
  signupBindingId: string;
}): Record<string, string> {
  return {
    purpose: PROMOTED_ACCESS_PURPOSE,
    payment_id: input.paymentId,
    specialist_id: input.specialistId,
    promotion_id: input.promotionId,
    signup_binding_id: input.signupBindingId,
  };
}

export function buildPromotedAccessPaymentIntentMetadata(input: {
  paymentId: string;
}): Record<string, string> {
  return {
    purpose: PROMOTED_ACCESS_PURPOSE,
    payment_id: input.paymentId,
  };
}

export async function createPromotedAccessCheckout(input: {
  supabase: SupabaseClient;
  specialistId: string;
  userId: string;
  lang: Lang;
  siteUrl: string;
}): Promise<PromotedAccessCheckoutResult> {
  if (!isPromotedAccessCheckoutReady()) {
    console.info("[billing/promoted-access] payments_unavailable");
    return { ok: false, reason: "payments_unavailable" };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    console.info("[billing/promoted-access] payments_unavailable");
    return { ok: false, reason: "payments_unavailable" };
  }

  let binding;
  try {
    binding = await getSignupBindingForCheckout(input.supabase, input.specialistId);
  } catch {
    console.info("[billing/promoted-access] db_error");
    return { ok: false, reason: "db_error" };
  }

  if (
    !binding ||
    binding.specialist_id !== input.specialistId ||
    binding.user_id !== input.userId
  ) {
    console.info("[billing/promoted-access] no_binding");
    return { ok: false, reason: "not_eligible" };
  }

  try {
    const promotionOk = await promotionExistsForCheckout(
      input.supabase,
      binding.promotion_id,
    );
    if (!promotionOk) {
      console.info("[billing/promoted-access] no_binding");
      return { ok: false, reason: "not_eligible" };
    }
  } catch {
    console.info("[billing/promoted-access] db_error");
    return { ok: false, reason: "db_error" };
  }

  try {
    const hasGrant = await hasActivePromotedAccessGrant(input.supabase, {
      specialistId: input.specialistId,
      promotionId: binding.promotion_id,
    });
    if (hasGrant) {
      console.info("[billing/promoted-access] already_has_access");
      return { ok: false, reason: "already_has_access" };
    }
  } catch {
    console.info("[billing/promoted-access] db_error");
    return { ok: false, reason: "db_error" };
  }

  const plan = await getSpecialistPlanForDashboard(input.supabase, input.specialistId);
  const entitlements = resolveSpecialistEntitlements(plan);
  if (entitlements.effectivePaidPlan !== null) {
    console.info("[billing/promoted-access] subscription_access");
    return { ok: false, reason: "subscription_access" };
  }

  const nowIso = new Date().toISOString();
  const { data: paymentRow, error: insertError } = await input.supabase
    .from("promoted_request_payments")
    .insert({
      signup_binding_id: binding.id,
      promotion_id: binding.promotion_id,
      specialist_id: binding.specialist_id,
      user_id: binding.user_id,
      amount_cents: PROMOTED_ACCESS_AMOUNT_CENTS,
      currency: PROMOTED_ACCESS_CURRENCY,
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(PROMOTED_PAYMENT_INSERT_SELECT)
    .single();

  if (insertError || !paymentRow?.id) {
    console.info("[billing/promoted-access] db_error");
    return { ok: false, reason: "db_error" };
  }

  const paymentId = paymentRow.id as string;

  try {
    const { customerId } = await getOrCreateStripeCustomerForSpecialist(input.supabase, {
      specialistId: input.specialistId,
      userId: input.userId,
    });

    const { successUrl, cancelUrl } = buildPromotedAccessCheckoutUrls({
      siteUrl: input.siteUrl,
      lang: input.lang,
    });

    const metadata = buildPromotedAccessStripeMetadata({
      paymentId,
      specialistId: input.specialistId,
      promotionId: binding.promotion_id,
      signupBindingId: binding.id,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PROMOTED_ACCESS_CURRENCY,
            unit_amount: PROMOTED_ACCESS_AMOUNT_CENTS,
            product_data: {
              name: promotedAccessProductName(input.lang),
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: {
        metadata: buildPromotedAccessPaymentIntentMetadata({ paymentId }),
      },
      client_reference_id: paymentId,
    });

    if (!session.url || !session.id) {
      throw new Error("stripe_session_incomplete");
    }

    const checkoutCreatedAt = new Date().toISOString();
    const { error: updateError } = await input.supabase
      .from("promoted_request_payments")
      .update({
        stripe_checkout_session_id: session.id,
        checkout_created_at: checkoutCreatedAt,
        updated_at: checkoutCreatedAt,
      })
      .eq("id", paymentId);

    if (updateError) {
      console.info("[billing/promoted-access] db_error");
      return { ok: false, reason: "db_error" };
    }

    console.info("[billing/promoted-access] checkout_created");
    return { ok: true, checkoutUrl: session.url };
  } catch (err) {
    console.info("[billing/promoted-access] stripe_error");
    const failedAt = new Date().toISOString();
    try {
      await input.supabase
        .from("promoted_request_payments")
        .update({
          status: "failed",
          failed_at: failedAt,
          updated_at: failedAt,
        })
        .eq("id", paymentId);
    } catch {
      // best-effort cleanup after Stripe failure
    }

    return { ok: false, reason: "checkout_error" };
  }
}
