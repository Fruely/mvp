import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import { getOrCreateStripeCustomerForSpecialist } from "@/lib/billing/billingCustomers";
import { isRequestOfferCheckoutReady } from "@/lib/billing/requestOfferCheckoutReadiness";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { materializeDirectPplOffer } from "@/lib/leadEngine/materializeDirectPplOffer";

const PURPOSE = "request_offer_access";

type CheckoutFailureReason =
  | "payments_unavailable"
  | "not_eligible"
  | "already_has_access"
  | "subscription_access"
  | "offer_unavailable"
  | "checkout_error"
  | "db_error";

export type RequestOfferCheckoutResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; reason: CheckoutFailureReason };

function productName(lang: Lang): string {
  if (lang === "de") return "Freuly Lead-Zugang";
  if (lang === "ru") return "Доступ к заявке Freuly";
  return "Доступ до заявки Freuly";
}

function buildUrls(input: { siteUrl: string; lang: Lang; offerId: string }) {
  const base = input.siteUrl.replace(/\/$/, "");
  const dashboard = `${base}/${input.lang}/specialist/dashboard/leads`;
  return {
    successUrl: `${dashboard}?payment=success&offer=${encodeURIComponent(input.offerId)}`,
    cancelUrl: `${dashboard}?payment=cancelled&offer=${encodeURIComponent(input.offerId)}`,
  };
}

export async function createRequestOfferCheckout(input: {
  supabase: SupabaseClient;
  specialistId: string;
  userId: string;
  offerId: string;
  lang: Lang;
  siteUrl: string;
}): Promise<RequestOfferCheckoutResult> {
  if (!isRequestOfferCheckoutReady()) {
    return { ok: false, reason: "payments_unavailable" };
  }

  const stripe = getStripeClient();
  if (!stripe) return { ok: false, reason: "payments_unavailable" };

  const { data: offerIdentity, error: offerError } = await input.supabase
    .from("request_offers")
    .select("id, request_kind, specialist_id, status")
    .eq("id", input.offerId)
    .eq("specialist_id", input.specialistId)
    .eq("request_kind", "direct_lead")
    .maybeSingle();

  if (offerError) return { ok: false, reason: "db_error" };
  if (!offerIdentity || offerIdentity.specialist_id !== input.specialistId) {
    return { ok: false, reason: "not_eligible" };
  }
  if (["declined", "expired"].includes(String(offerIdentity.status))) {
    return { ok: false, reason: "offer_unavailable" };
  }

  const { data: grant, error: grantError } = await input.supabase
    .from("request_offer_access_grants")
    .select("id")
    .eq("offer_id", input.offerId)
    .eq("specialist_id", input.specialistId)
    .is("revoked_at", null)
    .maybeSingle();

  if (grantError) return { ok: false, reason: "db_error" };
  if (grant?.id) return { ok: false, reason: "already_has_access" };

  const plan = await getSpecialistPlanForDashboard(input.supabase, input.specialistId);
  const entitlements = resolveSpecialistEntitlements(plan);
  if (entitlements.effectivePaidPlan !== null) {
    return { ok: false, reason: "subscription_access" };
  }

  const materialized = await materializeDirectPplOffer(input.supabase, {
    offerId: input.offerId,
    specialistId: input.specialistId,
  });

  if (!materialized.ok) {
    if (materialized.reason === "db_error") {
      return { ok: false, reason: "db_error" };
    }
    if (materialized.reason === "offer_not_found") {
      return { ok: false, reason: "not_eligible" };
    }
    return { ok: false, reason: "offer_unavailable" };
  }

  const priceCents = materialized.priceCents;
  const currency = materialized.currency;

  const nowIso = new Date().toISOString();
  const { data: payment, error: paymentError } = await input.supabase
    .from("request_offer_payments")
    .insert({
      offer_id: input.offerId,
      specialist_id: input.specialistId,
      user_id: input.userId,
      amount_cents: priceCents,
      currency,
      status: "pending",
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (paymentError || !payment?.id) return { ok: false, reason: "db_error" };
  const paymentId = String(payment.id);

  try {
    const { customerId } = await getOrCreateStripeCustomerForSpecialist(input.supabase, {
      specialistId: input.specialistId,
      userId: input.userId,
    });
    const urls = buildUrls({ siteUrl: input.siteUrl, lang: input.lang, offerId: input.offerId });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: priceCents,
            product_data: { name: productName(input.lang) },
          },
        },
      ],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      metadata: {
        purpose: PURPOSE,
        payment_id: paymentId,
        offer_id: input.offerId,
        specialist_id: input.specialistId,
      },
      payment_intent_data: {
        metadata: {
          purpose: PURPOSE,
          payment_id: paymentId,
        },
      },
      client_reference_id: paymentId,
    });

    if (!session.id || !session.url) throw new Error("stripe_session_incomplete");

    const checkoutCreatedAt = new Date().toISOString();
    const { error: updateError } = await input.supabase
      .from("request_offer_payments")
      .update({
        stripe_checkout_session_id: session.id,
        checkout_created_at: checkoutCreatedAt,
        updated_at: checkoutCreatedAt,
      })
      .eq("id", paymentId);

    if (updateError) return { ok: false, reason: "db_error" };
    return { ok: true, checkoutUrl: session.url };
  } catch {
    const failedAt = new Date().toISOString();
    await input.supabase
      .from("request_offer_payments")
      .update({ status: "failed", failed_at: failedAt, updated_at: failedAt })
      .eq("id", paymentId);
    return { ok: false, reason: "checkout_error" };
  }
}
