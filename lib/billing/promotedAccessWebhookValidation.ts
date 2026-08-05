import type Stripe from "stripe";
import {
  PROMOTED_ACCESS_AMOUNT_CENTS,
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_ACCESS_PURPOSE,
} from "@/lib/billing/promotedAccessConstants";

export type PromotedPaymentRow = {
  id: string;
  signup_binding_id: string;
  promotion_id: string;
  specialist_id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  paid_at: string | null;
};

export function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) return value.id;
  return null;
}

export function extractPaymentIdFromMetadata(
  metadata: Stripe.Metadata | Record<string, string> | null | undefined,
): string | null {
  if (!metadata) return null;
  if (metadata.purpose !== PROMOTED_ACCESS_PURPOSE) return null;
  const paymentId = metadata.payment_id?.trim();
  return paymentId || null;
}

export function isPromotedPurposeMetadata(
  metadata: Stripe.Metadata | Record<string, string> | null | undefined,
): boolean {
  return metadata?.purpose === PROMOTED_ACCESS_PURPOSE;
}

export function metadataContextMatchesPayment(
  metadata: Stripe.Metadata | Record<string, string> | null | undefined,
  payment: PromotedPaymentRow,
): boolean {
  if (!metadata) return true;
  if (metadata.specialist_id && metadata.specialist_id !== payment.specialist_id) {
    return false;
  }
  if (metadata.promotion_id && metadata.promotion_id !== payment.promotion_id) {
    return false;
  }
  if (metadata.signup_binding_id && metadata.signup_binding_id !== payment.signup_binding_id) {
    return false;
  }
  return true;
}

export type PaidSessionValidationResult =
  | {
      ok: true;
      paymentIntentId: string;
      chargeId: string | null;
      paidAt: string;
    }
  | { ok: false; reason: "validation_failed" | "pending" | "terminal_status" };

const PAID_TRANSITION_STATUSES = new Set(["pending", "failed", "expired", "paid"]);
const TERMINAL_NO_RESTORE = new Set(["refunded", "disputed"]);

export function validateCheckoutSessionForPaidPayment(
  session: Stripe.Checkout.Session,
  payment: PromotedPaymentRow,
): PaidSessionValidationResult {
  if (TERMINAL_NO_RESTORE.has(payment.status)) {
    return { ok: false, reason: "terminal_status" };
  }

  if (session.mode !== "payment") {
    return { ok: false, reason: "validation_failed" };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, reason: "pending" };
  }

  if ((session.currency ?? "").toLowerCase() !== PROMOTED_ACCESS_CURRENCY) {
    return { ok: false, reason: "validation_failed" };
  }

  if (session.amount_total !== PROMOTED_ACCESS_AMOUNT_CENTS) {
    return { ok: false, reason: "validation_failed" };
  }

  if (!session.id || payment.stripe_checkout_session_id !== session.id) {
    return { ok: false, reason: "validation_failed" };
  }

  const paymentId = extractPaymentIdFromMetadata(session.metadata);
  if (!paymentId || paymentId !== payment.id) {
    return { ok: false, reason: "validation_failed" };
  }

  if (!metadataContextMatchesPayment(session.metadata, payment)) {
    return { ok: false, reason: "validation_failed" };
  }

  if (!PAID_TRANSITION_STATUSES.has(payment.status)) {
    return { ok: false, reason: "validation_failed" };
  }

  const paymentIntentId = stripeId(session.payment_intent);
  if (!paymentIntentId) {
    return { ok: false, reason: "validation_failed" };
  }

  const chargeId =
    typeof session.payment_intent === "object" && session.payment_intent
      ? stripeId(session.payment_intent.latest_charge)
      : null;

  const paidAt = new Date().toISOString();

  return { ok: true, paymentIntentId, chargeId, paidAt };
}

export function validatePaymentIntentMetadata(
  paymentIntent: Stripe.PaymentIntent,
  payment: PromotedPaymentRow,
): boolean {
  const paymentId = extractPaymentIdFromMetadata(paymentIntent.metadata);
  if (!paymentId || paymentId !== payment.id) return false;
  return metadataContextMatchesPayment(paymentIntent.metadata, payment);
}
