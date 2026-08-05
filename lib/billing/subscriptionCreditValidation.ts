import type Stripe from "stripe";
import {
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
} from "@/lib/billing/promotedAccessConstants";

export const PROMOTED_SUBSCRIPTION_CREDIT_PURPOSE = "promoted_subscription_credit";

export type PromotedSubscriptionCreditRow = {
  id: string;
  specialist_id: string;
  source_payment_id: string;
  credit_cents: number;
  currency: string;
  eligible_until: string;
  consumed_at?: string | null;
  consumed_checkout_session_id?: string | null;
  consumed_plan_code?: string | null;
};

export type PromotedSubscriptionCreditSourcePayment = {
  id: string;
  specialist_id: string;
  amount_cents: number;
  currency: string;
  status: string;
};

const INVALID_SOURCE_STATUSES = new Set(["refunded", "disputed"]);

export function isFixedPromotedSubscriptionCreditAmount(
  credit: Pick<PromotedSubscriptionCreditRow, "credit_cents" | "currency">,
): boolean {
  return (
    credit.credit_cents === PROMOTED_SUBSCRIPTION_CREDIT_CENTS &&
    credit.currency === PROMOTED_ACCESS_CURRENCY
  );
}

export function isEligiblePromotedSubscriptionSourcePayment(
  payment: PromotedSubscriptionCreditSourcePayment,
  specialistId: string,
): boolean {
  if (payment.specialist_id !== specialistId) return false;
  if (payment.status !== "paid") return false;
  if (INVALID_SOURCE_STATUSES.has(payment.status)) return false;
  return (
    payment.amount_cents === PROMOTED_SUBSCRIPTION_CREDIT_CENTS &&
    payment.currency === PROMOTED_ACCESS_CURRENCY
  );
}

export function isPromotedSubscriptionCreditSourceInvalid(
  payment: Pick<PromotedSubscriptionCreditSourcePayment, "status">,
): boolean {
  return INVALID_SOURCE_STATUSES.has(payment.status);
}

export function appendPromotedSubscriptionCreditMetadata(
  metadata: Record<string, string>,
  input: { creditId: string; checkedAtIso: string },
): Record<string, string> {
  return {
    ...metadata,
    promoted_credit_id: input.creditId,
    promoted_credit_cents: String(PROMOTED_SUBSCRIPTION_CREDIT_CENTS),
    promoted_credit_checked_at: input.checkedAtIso,
  };
}

export function readPromotedCreditIdFromMetadata(
  metadata: Stripe.Metadata | Record<string, string> | null | undefined,
): string | null {
  const creditId = metadata?.promoted_credit_id?.trim();
  return creditId || null;
}

export function creditEligibleForConsumption(
  credit: Pick<PromotedSubscriptionCreditRow, "eligible_until">,
  sessionMetadata: Stripe.Metadata | Record<string, string> | null | undefined,
  nowIso: string,
): boolean {
  const checkedAt = sessionMetadata?.promoted_credit_checked_at?.trim();
  if (checkedAt) {
    const checkedMs = Date.parse(checkedAt);
    const eligibleMs = Date.parse(credit.eligible_until);
    if (!Number.isNaN(checkedMs) && !Number.isNaN(eligibleMs) && checkedMs <= eligibleMs) {
      return true;
    }
  }

  const eligibleMs = Date.parse(credit.eligible_until);
  const nowMs = Date.parse(nowIso);
  if (Number.isNaN(eligibleMs) || Number.isNaN(nowMs)) return false;
  return eligibleMs > nowMs;
}

export function sessionHasPromotedCreditDiscount(
  session: Pick<
    Stripe.Checkout.Session,
    "metadata" | "total_details" | "amount_subtotal" | "amount_total"
  >,
  expectedCents: number = PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
): boolean {
  const metaCents = Number.parseInt(session.metadata?.promoted_credit_cents ?? "", 10);
  if (metaCents !== expectedCents) return false;

  const amountDiscount = session.total_details?.amount_discount ?? 0;
  if (amountDiscount >= expectedCents) return true;

  if (
    session.amount_subtotal != null &&
    session.amount_total != null &&
    session.amount_subtotal - session.amount_total >= expectedCents
  ) {
    return true;
  }

  return false;
}

export function approvedPromotedCreditMetadataKeys(): string[] {
  return ["promoted_credit_id", "promoted_credit_cents", "promoted_credit_checked_at"];
}
