import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_REGISTRATION_DEADLINE_HOURS,
} from "@/lib/billing/promotedAccessConstants";

export type PromotedReservationRow = {
  id: string;
  promotion_id: string;
  public_token: string;
  status: string;
  payer_email: string | null;
  paid_at: string | null;
  registration_deadline: string | null;
  registration_completed_at: string | null;
  user_id: string | null;
  specialist_id: string | null;
  signup_binding_id: string | null;
  promoted_payment_id: string | null;
};

export const PROMOTED_RESERVATION_WEBHOOK_SELECT =
  "id, promotion_id, public_token, status, payer_email, paid_at, registration_deadline, registration_completed_at, user_id, specialist_id, signup_binding_id, promoted_payment_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id";

function addHoursIso(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000).toISOString();
}

export async function loadPromotedReservationById(
  supabase: SupabaseClient,
  reservationId: string,
): Promise<PromotedReservationRow | null> {
  const { data, error } = await supabase
    .from("promoted_request_reservations")
    .select(PROMOTED_RESERVATION_WEBHOOK_SELECT)
    .eq("id", reservationId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PromotedReservationRow;
}

export async function fulfillPromotedReservationPaid(
  supabase: SupabaseClient,
  reservation: PromotedReservationRow,
  input: {
    paymentIntentId: string;
    chargeId: string | null;
    payerEmail: string | null;
    paidAt: string;
  },
): Promise<"success" | "retryable_failure" | "ignored"> {
  if (
    reservation.status === "registration_completed" ||
    reservation.status === "expired"
  ) {
    return "ignored";
  }

  if (reservation.status === "paid_pending_registration") {
    const { error } = await supabase
      .from("promoted_request_reservations")
      .update({
        stripe_payment_intent_id: input.paymentIntentId,
        stripe_charge_id: input.chargeId,
        payer_email: input.payerEmail ?? reservation.payer_email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reservation.id);
    return error ? "retryable_failure" : "success";
  }

  const registrationDeadline = addHoursIso(
    input.paidAt,
    PROMOTED_REGISTRATION_DEADLINE_HOURS,
  );

  const { error } = await supabase
    .from("promoted_request_reservations")
    .update({
      status: "paid_pending_registration",
      stripe_payment_intent_id: input.paymentIntentId,
      stripe_charge_id: input.chargeId,
      payer_email: input.payerEmail ?? reservation.payer_email,
      paid_at: input.paidAt,
      registration_deadline: registrationDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reservation.id);

  return error ? "retryable_failure" : "success";
}

export function isPromotedReservationExpired(
  reservation: PromotedReservationRow,
  nowMs: number = Date.now(),
): boolean {
  if (reservation.status === "expired") return true;
  if (reservation.status !== "paid_pending_registration") return false;
  if (!reservation.registration_deadline) return false;
  return new Date(reservation.registration_deadline).getTime() < nowMs;
}
