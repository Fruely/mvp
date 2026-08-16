import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lang } from "@/lib/i18n";
import {
  PROMOTED_ACCESS_AMOUNT_CENTS,
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_RESERVATION_PURPOSE,
} from "@/lib/billing/promotedAccessConstants";
import { isPromotedAccessCheckoutReady } from "@/lib/billing/promotedAccessReadiness";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { getPublishedPromotionForCapture } from "@/lib/serviceRequests/promotionPublicData";

export type PromotedReservationCheckoutResult =
  | { ok: true; checkoutUrl: string; reservationId: string }
  | {
      ok: false;
      reason:
        | "payments_unavailable"
        | "not_found"
        | "checkout_error"
        | "db_error";
    };

function reservationProductName(lang: Lang): string {
  if (lang === "de") return "Freuly Anfrage-Reservierung";
  if (lang === "ru") return "Резервирование заявки Freuly";
  return "Резервування заявки Freuly";
}

export function buildPromotedReservationStripeMetadata(input: {
  reservationId: string;
  promotionId: string;
  publicToken: string;
}): Record<string, string> {
  return {
    purpose: PROMOTED_RESERVATION_PURPOSE,
    reservation_id: input.reservationId,
    promotion_id: input.promotionId,
    public_token: input.publicToken,
  };
}

export function buildPromotedReservationCheckoutUrls(input: {
  siteUrl: string;
  lang: string;
  publicToken: string;
}): { successUrl: string; cancelUrl: string } {
  const base = input.siteUrl.replace(/\/+$/, "");
  const lang = input.lang.trim() || "ua";
  const token = encodeURIComponent(input.publicToken.trim());
  const acceptPath = `/${lang}/request/${token}/accept`;
  return {
    successUrl: `${base}${acceptPath}?reservation=success`,
    cancelUrl: `${base}${acceptPath}?reservation=cancel`,
  };
}

export async function createPromotedReservationCheckout(input: {
  supabase: SupabaseClient;
  lang: Lang;
  siteUrl: string;
  publicToken: string;
}): Promise<PromotedReservationCheckoutResult> {
  if (!isPromotedAccessCheckoutReady()) {
    return { ok: false, reason: "payments_unavailable" };
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, reason: "payments_unavailable" };
  }

  const promotion = await getPublishedPromotionForCapture(input.publicToken);
  if (!promotion || promotion.locale !== input.lang) {
    return { ok: false, reason: "not_found" };
  }

  const nowIso = new Date().toISOString();
  const { data: reservationRow, error: insertError } = await input.supabase
    .from("promoted_request_reservations")
    .insert({
      promotion_id: promotion.id,
      public_token: input.publicToken.trim(),
      status: "pending_payment",
      amount_cents: PROMOTED_ACCESS_AMOUNT_CENTS,
      currency: PROMOTED_ACCESS_CURRENCY,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (insertError || !reservationRow?.id) {
    return { ok: false, reason: "db_error" };
  }

  const reservationId = reservationRow.id as string;

  try {
    const { successUrl, cancelUrl } = buildPromotedReservationCheckoutUrls({
      siteUrl: input.siteUrl,
      lang: input.lang,
      publicToken: input.publicToken,
    });

    const metadata = buildPromotedReservationStripeMetadata({
      reservationId,
      promotionId: promotion.id,
      publicToken: input.publicToken.trim(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      invoice_creation: { enabled: true },
      customer_creation: "always",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: PROMOTED_ACCESS_CURRENCY,
            unit_amount: PROMOTED_ACCESS_AMOUNT_CENTS,
            product_data: {
              name: reservationProductName(input.lang),
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      payment_intent_data: {
        metadata: {
          purpose: PROMOTED_RESERVATION_PURPOSE,
          reservation_id: reservationId,
        },
      },
      client_reference_id: reservationId,
    });

    if (!session.url || !session.id) {
      throw new Error("stripe_session_incomplete");
    }

    const { error: updateError } = await input.supabase
      .from("promoted_request_reservations")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (updateError) {
      return { ok: false, reason: "db_error" };
    }

    return { ok: true, checkoutUrl: session.url, reservationId };
  } catch {
    return { ok: false, reason: "checkout_error" };
  }
}
