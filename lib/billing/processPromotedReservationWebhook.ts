import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { PROMOTED_RESERVATION_PURPOSE } from "@/lib/billing/promotedAccessConstants";
import {
  fulfillPromotedReservationPaid,
  loadPromotedReservationById,
} from "@/lib/billing/promotedReservationFulfillment";
import { stripeId } from "@/lib/billing/promotedAccessWebhookValidation";
import { getStripeClient } from "@/lib/billing/stripeClient";

export type PromotedReservationWebhookResult = {
  outcome: "ignored" | "success" | "validation_failed" | "retryable_failure";
};

const CHECKOUT_SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function extractReservationId(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata || metadata.purpose !== PROMOTED_RESERVATION_PURPOSE) return null;
  const id = metadata.reservation_id?.trim();
  return id || null;
}

export async function processStripeWebhookEventForPromotedReservation(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<PromotedReservationWebhookResult> {
  if (!CHECKOUT_SUCCESS_EVENTS.has(event.type)) {
    return { outcome: "ignored" };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reservationId = extractReservationId(session.metadata);
  if (!reservationId) {
    return { outcome: "ignored" };
  }

  const reservation = await loadPromotedReservationById(supabase, reservationId);
  if (!reservation) {
    return { outcome: "validation_failed" };
  }

  const paymentIntentId = stripeId(session.payment_intent);
  if (!paymentIntentId) {
    return { outcome: "validation_failed" };
  }

  let chargeId: string | null = null;
  const stripe = getStripeClient();
  if (stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      chargeId = stripeId(pi.latest_charge);
    } catch {
      chargeId = null;
    }
  }

  const paidAt = new Date(
    (session.created ?? Math.floor(Date.now() / 1000)) * 1000,
  ).toISOString();

  const payerEmail =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email.trim().toLowerCase()
      : null;

  const result = await fulfillPromotedReservationPaid(supabase, reservation, {
    paymentIntentId,
    chargeId,
    payerEmail,
    paidAt,
  });

  if (result === "retryable_failure") return { outcome: "retryable_failure" };
  if (result === "ignored") return { outcome: "ignored" };
  return { outcome: "success" };
}
