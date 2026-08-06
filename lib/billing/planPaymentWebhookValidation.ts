import type Stripe from "stripe";
import {
  PLAN_PAYMENT_BILLING_INTERVAL,
  PLAN_PAYMENT_CURRENCY,
  PLAN_PAYMENT_PURPOSE,
} from "@/lib/billing/planPaymentConstants";
import { stripeId } from "@/lib/billing/stripeInvoiceEligibility";

export type PlanPaymentRow = {
  id: string;
  specialist_id: string;
  user_id: string;
  status: string;
  plan_code: string;
  billing_interval: string;
  currency: string;
  gross_amount_cents: number;
  discount_amount_cents: number;
  net_amount_cents: number;
  provider_customer_id: string | null;
  provider_price_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  promoted_credit_id: string | null;
  entitlement_applied_at: string | null;
  prior_expires_at: string | null;
  period_end_at: string | null;
  paid_at: string | null;
};

export type PlanPaymentValidationFailureCode =
  | "plan_payment_not_found"
  | "plan_payment_session_mismatch"
  | "plan_payment_metadata_mismatch"
  | "plan_payment_amount_mismatch"
  | "plan_payment_currency_mismatch"
  | "plan_payment_price_mismatch"
  | "plan_payment_customer_mismatch"
  | "plan_payment_not_paid"
  | "plan_payment_stripe_unavailable";

export type PlanPaymentPaidValidationResult =
  | {
      ok: true;
      paymentIntentId: string;
      chargeId: string | null;
      paidAt: string;
      lineItemPriceId: string;
    }
  | { ok: false; code: PlanPaymentValidationFailureCode; retryable: boolean };

export const PLAN_PAYMENT_WEBHOOK_SELECT =
  "id, specialist_id, user_id, status, plan_code, billing_interval, currency, gross_amount_cents, discount_amount_cents, net_amount_cents, provider_customer_id, provider_price_id, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id, promoted_credit_id, entitlement_applied_at, prior_expires_at, period_end_at, paid_at";

const PERMANENT_VALIDATION_FAILURES = new Set<PlanPaymentValidationFailureCode>([
  "plan_payment_not_found",
  "plan_payment_session_mismatch",
  "plan_payment_metadata_mismatch",
  "plan_payment_amount_mismatch",
  "plan_payment_currency_mismatch",
  "plan_payment_price_mismatch",
  "plan_payment_customer_mismatch",
]);

export function isPermanentPlanPaymentValidationFailure(
  code: PlanPaymentValidationFailureCode,
): boolean {
  return PERMANENT_VALIDATION_FAILURES.has(code);
}

export function isPlanPaymentPurpose(metadata: Stripe.Metadata | null | undefined): boolean {
  return metadata?.purpose === PLAN_PAYMENT_PURPOSE;
}

export function extractPlanPaymentIdFromMetadata(
  metadata: Stripe.Metadata | null | undefined,
): string | null {
  if (!isPlanPaymentPurpose(metadata)) return null;
  const id = metadata?.plan_payment_id?.trim();
  return id || null;
}

export function extractPlanPaymentIdFromSession(session: Stripe.Checkout.Session): string | null {
  const fromMetadata = extractPlanPaymentIdFromMetadata(session.metadata);
  if (fromMetadata) return fromMetadata;
  const ref = session.client_reference_id?.trim();
  if (ref && isPlanPaymentPurpose(session.metadata)) return ref;
  return null;
}

/**
 * Authoritative paid_at:
 * 1) latest Charge.created when available
 * 2) Stripe event.created fallback (stable per event redelivery)
 * Never payment_intent.created or now().
 */
export function resolvePlanPaymentPaidAt(input: {
  charge?: Pick<Stripe.Charge, "created"> | null;
  eventCreated?: number;
}): string | null {
  if (input.charge?.created) {
    return new Date(input.charge.created * 1000).toISOString();
  }
  if (input.eventCreated) {
    return new Date(input.eventCreated * 1000).toISOString();
  }
  return null;
}

function metadataMatchesPayment(
  session: Stripe.Checkout.Session,
  payment: PlanPaymentRow,
): boolean {
  const metadata = session.metadata ?? {};
  return (
    metadata.purpose === PLAN_PAYMENT_PURPOSE &&
    metadata.plan_payment_id === payment.id &&
    metadata.specialist_id === payment.specialist_id &&
    metadata.user_id === payment.user_id &&
    metadata.plan_code === payment.plan_code &&
    metadata.billing_interval === PLAN_PAYMENT_BILLING_INTERVAL
  );
}

function clientReferenceMatches(session: Stripe.Checkout.Session, payment: PlanPaymentRow): boolean {
  if (!session.client_reference_id) return true;
  return session.client_reference_id === payment.id;
}

export function validatePlanPaymentCheckoutSession(
  session: Stripe.Checkout.Session,
  payment: PlanPaymentRow,
  input: {
    paymentIntentId: string;
    chargeId: string | null;
    paidAt: string;
    lineItemPriceId: string;
  },
): PlanPaymentPaidValidationResult {
  if (session.mode !== "payment") {
    return { ok: false, code: "plan_payment_session_mismatch", retryable: true };
  }
  if (session.payment_status !== "paid") {
    return { ok: false, code: "plan_payment_not_paid", retryable: true };
  }
  if (!metadataMatchesPayment(session, payment)) {
    return { ok: false, code: "plan_payment_metadata_mismatch", retryable: false };
  }
  if (!clientReferenceMatches(session, payment)) {
    return { ok: false, code: "plan_payment_metadata_mismatch", retryable: false };
  }
  if (session.id !== payment.stripe_checkout_session_id) {
    return { ok: false, code: "plan_payment_session_mismatch", retryable: false };
  }
  const sessionCustomerId = stripeId(session.customer);
  if (
    sessionCustomerId &&
    payment.provider_customer_id &&
    sessionCustomerId !== payment.provider_customer_id
  ) {
    return { ok: false, code: "plan_payment_customer_mismatch", retryable: false };
  }
  if ((session.currency ?? "").toLowerCase() !== PLAN_PAYMENT_CURRENCY) {
    return { ok: false, code: "plan_payment_currency_mismatch", retryable: false };
  }
  if (input.lineItemPriceId !== payment.provider_price_id) {
    return { ok: false, code: "plan_payment_price_mismatch", retryable: false };
  }
  const amountSubtotal = session.amount_subtotal ?? null;
  const amountTotal = session.amount_total ?? null;
  if (amountSubtotal !== payment.gross_amount_cents || amountTotal !== payment.net_amount_cents) {
    return { ok: false, code: "plan_payment_amount_mismatch", retryable: false };
  }
  if (input.paymentIntentId !== stripeId(session.payment_intent)) {
    return { ok: false, code: "plan_payment_session_mismatch", retryable: false };
  }
  return {
    ok: true,
    paymentIntentId: input.paymentIntentId,
    chargeId: input.chargeId,
    paidAt: input.paidAt,
    lineItemPriceId: input.lineItemPriceId,
  };
}

export function validateUnpaidCompletedPlanPaymentSession(
  session: Stripe.Checkout.Session,
  payment: PlanPaymentRow,
): boolean {
  return (
    session.mode === "payment" &&
    session.payment_status === "unpaid" &&
    metadataMatchesPayment(session, payment) &&
    clientReferenceMatches(session, payment)
  );
}
