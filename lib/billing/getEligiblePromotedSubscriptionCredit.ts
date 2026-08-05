import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isEligiblePromotedSubscriptionSourcePayment,
  isFixedPromotedSubscriptionCreditAmount,
  isPromotedSubscriptionCreditSourceInvalid,
  type PromotedSubscriptionCreditRow,
  type PromotedSubscriptionCreditSourcePayment,
} from "@/lib/billing/subscriptionCreditValidation";

const CREDIT_SELECT =
  "id, specialist_id, source_payment_id, credit_cents, currency, eligible_until, consumed_at";

const SOURCE_PAYMENT_SELECT = "id, specialist_id, amount_cents, currency, status";

export async function getEligiblePromotedSubscriptionCredit(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<PromotedSubscriptionCreditRow | null> {
  const nowIso = new Date().toISOString();

  const { data: credit, error } = await supabase
    .from("promoted_request_subscription_credits")
    .select(CREDIT_SELECT)
    .eq("specialist_id", specialistId)
    .is("consumed_at", null)
    .gt("eligible_until", nowIso)
    .maybeSingle();

  if (error) {
    console.info("[billing/checkout] subscription_credit_not_eligible");
    return null;
  }

  if (!credit?.id) {
    const { data: expiredOrConsumed } = await supabase
      .from("promoted_request_subscription_credits")
      .select("id, consumed_at, eligible_until")
      .eq("specialist_id", specialistId)
      .maybeSingle();

    if (expiredOrConsumed?.consumed_at) {
      console.info("[billing/checkout] subscription_credit_consumed");
    } else if (expiredOrConsumed?.eligible_until) {
      console.info("[billing/checkout] subscription_credit_expired");
    }
    return null;
  }

  const row = credit as PromotedSubscriptionCreditRow;
  if (!isFixedPromotedSubscriptionCreditAmount(row)) {
    console.info("[billing/checkout] subscription_credit_source_invalid");
    return null;
  }

  const { data: sourcePayment, error: sourceError } = await supabase
    .from("promoted_request_payments")
    .select(SOURCE_PAYMENT_SELECT)
    .eq("id", row.source_payment_id)
    .maybeSingle();

  if (sourceError || !sourcePayment) {
    console.info("[billing/checkout] subscription_credit_source_invalid");
    return null;
  }

  const payment = sourcePayment as PromotedSubscriptionCreditSourcePayment;
  if (isPromotedSubscriptionCreditSourceInvalid(payment)) {
    console.info("[billing/checkout] subscription_credit_source_invalid");
    return null;
  }

  if (!isEligiblePromotedSubscriptionSourcePayment(payment, specialistId)) {
    if (payment.status !== "paid") {
      console.info("[billing/checkout] subscription_credit_source_invalid");
    } else {
      console.info("[billing/checkout] subscription_credit_not_eligible");
    }
    return null;
  }

  console.info("[billing/checkout] subscription_credit_applied");
  return row;
}
