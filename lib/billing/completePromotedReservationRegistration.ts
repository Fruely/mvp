import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fulfillPromotedPaymentSuccess } from "@/lib/billing/promotedAccessFulfillment";
import {
  PROMOTED_ACCESS_AMOUNT_CENTS,
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_PAYMENT_WEBHOOK_SELECT,
} from "@/lib/billing/promotedAccessConstants";
import {
  isPromotedReservationExpired,
  loadPromotedReservationById,
  type PromotedReservationRow,
} from "@/lib/billing/promotedReservationFulfillment";

export const PROMOTED_RESERVATION_COOKIE_NAME = "freuly_promoted_reservation_id";

export type CompletePromotedReservationResult =
  | { ok: true; completed: boolean; reason?: "expired" | "already_completed" | "no_binding" }
  | { ok: false; reason: "db_error" };

async function findPendingReservation(
  supabase: SupabaseClient,
  input: { reservationId?: string | null; email?: string | null },
): Promise<PromotedReservationRow | null> {
  if (input.reservationId) {
    const row = await loadPromotedReservationById(supabase, input.reservationId);
    if (row && row.status === "paid_pending_registration") return row;
  }

  const email = input.email?.trim().toLowerCase();
  if (!email) return null;

  const { data } = await supabase
    .from("promoted_request_reservations")
    .select("*")
    .eq("status", "paid_pending_registration")
    .ilike("payer_email", email)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as PromotedReservationRow | null) ?? null;
}

export async function completePromotedReservationRegistration(input: {
  supabase: SupabaseClient;
  userId: string;
  specialistId: string;
  email: string | null;
  reservationCookieId?: string | null;
}): Promise<CompletePromotedReservationResult> {
  const reservation = await findPendingReservation(input.supabase, {
    reservationId: input.reservationCookieId,
    email: input.email,
  });

  if (!reservation) {
    return { ok: true, completed: false };
  }

  if (reservation.status === "registration_completed") {
    return { ok: true, completed: false, reason: "already_completed" };
  }

  if (isPromotedReservationExpired(reservation)) {
    await input.supabase
      .from("promoted_request_reservations")
      .update({
        status: "expired",
        expired_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation.id);
    return { ok: true, completed: false, reason: "expired" };
  }

  const { data: binding } = await input.supabase
    .from("service_request_promotion_signup_bindings")
    .select("id, promotion_id")
    .eq("specialist_id", input.specialistId)
    .eq("promotion_id", reservation.promotion_id)
    .maybeSingle();

  if (!binding?.id) {
    return { ok: true, completed: false, reason: "no_binding" };
  }

  const nowIso = new Date().toISOString();
  const paidAt = reservation.paid_at ?? nowIso;

  const { data: existingPayment } = await input.supabase
    .from("promoted_request_payments")
    .select("id")
    .eq("specialist_id", input.specialistId)
    .eq("promotion_id", reservation.promotion_id)
    .eq("status", "paid")
    .maybeSingle();

  if (existingPayment?.id) {
    await input.supabase
      .from("promoted_request_reservations")
      .update({
        status: "registration_completed",
        registration_completed_at: nowIso,
        user_id: input.userId,
        specialist_id: input.specialistId,
        signup_binding_id: binding.id,
        promoted_payment_id: existingPayment.id,
        updated_at: nowIso,
      })
      .eq("id", reservation.id);
    return { ok: true, completed: true, reason: "already_completed" };
  }

  const stripeSessionId = (
    reservation as PromotedReservationRow & { stripe_checkout_session_id?: string | null }
  ).stripe_checkout_session_id;
  const stripeIntentId = (
    reservation as PromotedReservationRow & { stripe_payment_intent_id?: string | null }
  ).stripe_payment_intent_id;

  if (!stripeSessionId || !stripeIntentId) {
    return { ok: false, reason: "db_error" };
  }

  const { data: paymentRow, error: paymentError } = await input.supabase
    .from("promoted_request_payments")
    .insert({
      signup_binding_id: binding.id,
      promotion_id: reservation.promotion_id,
      specialist_id: input.specialistId,
      user_id: input.userId,
      amount_cents: PROMOTED_ACCESS_AMOUNT_CENTS,
      currency: PROMOTED_ACCESS_CURRENCY,
      status: "paid",
      stripe_checkout_session_id: stripeSessionId,
      stripe_payment_intent_id: stripeIntentId,
      stripe_charge_id:
        (reservation as PromotedReservationRow & { stripe_charge_id?: string | null })
          .stripe_charge_id ?? null,
      paid_at: paidAt,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(PROMOTED_PAYMENT_WEBHOOK_SELECT)
    .single();

  if (paymentError) {
    return { ok: false, reason: "db_error" };
  }

  const fulfillment = await fulfillPromotedPaymentSuccess(input.supabase, paymentRow, {
    paymentIntentId: stripeIntentId,
    chargeId: paymentRow.stripe_charge_id ?? null,
    paidAt,
  });

  if (fulfillment === "retryable_failure") {
    return { ok: false, reason: "db_error" };
  }

  await input.supabase
    .from("promoted_request_reservations")
    .update({
      status: "registration_completed",
      registration_completed_at: nowIso,
      user_id: input.userId,
      specialist_id: input.specialistId,
      signup_binding_id: binding.id,
      promoted_payment_id: paymentRow.id,
      updated_at: nowIso,
    })
    .eq("id", reservation.id);

  return { ok: true, completed: true };
}
