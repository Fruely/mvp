import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PaidPlanCode } from "@/lib/billing/plans";
import {
  creditEligibleForConsumption,
  isEligiblePromotedSubscriptionSourcePayment,
  isFixedPromotedSubscriptionCreditAmount,
  isPromotedSubscriptionCreditSourceInvalid,
  readPromotedCreditIdFromMetadata,
  sessionHasPromotedCreditDiscount,
  type PromotedSubscriptionCreditRow,
  type PromotedSubscriptionCreditSourcePayment,
} from "@/lib/billing/subscriptionCreditValidation";

export type ConsumePromotedSubscriptionCreditOutcome =
  | "no_credit_metadata"
  | "consumed"
  | "idempotent"
  | "source_invalid"
  | "validation_failed"
  | "conflict"
  | "retryable_failure";

export type ConsumePromotedSubscriptionCreditResult = {
  outcome: ConsumePromotedSubscriptionCreditOutcome;
  logCode: string;
};

const CREDIT_SELECT =
  "id, specialist_id, source_payment_id, credit_cents, currency, eligible_until, consumed_at, consumed_checkout_session_id, consumed_plan_code";

const SOURCE_PAYMENT_SELECT = "id, specialist_id, amount_cents, currency, status";

export async function consumePromotedSubscriptionCredit(
  supabase: SupabaseClient,
  input: {
    session: Stripe.Checkout.Session;
    specialistId: string;
    planCode: PaidPlanCode;
    eventCreatedIso: string;
  },
): Promise<ConsumePromotedSubscriptionCreditResult> {
  const creditId = readPromotedCreditIdFromMetadata(input.session.metadata);
  if (!creditId) {
    return { outcome: "no_credit_metadata", logCode: "subscription_credit_not_eligible" };
  }

  const { data: creditRow, error: creditError } = await supabase
    .from("promoted_request_subscription_credits")
    .select(CREDIT_SELECT)
    .eq("id", creditId)
    .maybeSingle();

  if (creditError || !creditRow) {
    console.info("[billing/subscription] subscription_credit_validation_failed");
    return { outcome: "validation_failed", logCode: "subscription_credit_validation_failed" };
  }

  const credit = creditRow as PromotedSubscriptionCreditRow;

  if (credit.specialist_id !== input.specialistId) {
    console.info("[billing/subscription] subscription_credit_conflict");
    return { outcome: "conflict", logCode: "subscription_credit_conflict" };
  }

  if (credit.consumed_at) {
    if (credit.consumed_checkout_session_id === input.session.id) {
      console.info("[billing/subscription] subscription_credit_consumed");
      return { outcome: "idempotent", logCode: "subscription_credit_consumed" };
    }
    console.info("[billing/subscription] subscription_credit_duplicate");
    return { outcome: "conflict", logCode: "subscription_credit_duplicate" };
  }

  if (!isFixedPromotedSubscriptionCreditAmount(credit)) {
    console.info("[billing/subscription] subscription_credit_source_invalid");
    return { outcome: "validation_failed", logCode: "subscription_credit_source_invalid" };
  }

  if (!creditEligibleForConsumption(credit, input.session.metadata, input.eventCreatedIso)) {
    console.info("[billing/subscription] subscription_credit_expired");
    return { outcome: "validation_failed", logCode: "subscription_credit_expired" };
  }

  const { data: sourcePayment, error: sourceError } = await supabase
    .from("promoted_request_payments")
    .select(SOURCE_PAYMENT_SELECT)
    .eq("id", credit.source_payment_id)
    .maybeSingle();

  if (sourceError || !sourcePayment) {
    console.info("[billing/subscription] subscription_credit_source_invalid");
    return { outcome: "retryable_failure", logCode: "subscription_credit_retryable_failure" };
  }

  const payment = sourcePayment as PromotedSubscriptionCreditSourcePayment;
  if (isPromotedSubscriptionCreditSourceInvalid(payment)) {
    console.info("[billing/subscription] subscription_credit_source_invalid");
    return { outcome: "source_invalid", logCode: "subscription_credit_source_invalid" };
  }

  if (!isEligiblePromotedSubscriptionSourcePayment(payment, input.specialistId)) {
    console.info("[billing/subscription] subscription_credit_source_invalid");
    return { outcome: "source_invalid", logCode: "subscription_credit_source_invalid" };
  }

  if (!sessionHasPromotedCreditDiscount(input.session)) {
    console.info("[billing/subscription] subscription_credit_validation_failed");
    return { outcome: "validation_failed", logCode: "subscription_credit_validation_failed" };
  }

  const ts = input.eventCreatedIso;
  const { data: updated, error: updateError } = await supabase
    .from("promoted_request_subscription_credits")
    .update({
      consumed_at: ts,
      consumed_checkout_session_id: input.session.id,
      consumed_plan_code: input.planCode,
      updated_at: ts,
    })
    .eq("id", credit.id)
    .is("consumed_at", null)
    .select("id, consumed_checkout_session_id")
    .maybeSingle();

  if (updateError?.code === "23505") {
    const { data: existing } = await supabase
      .from("promoted_request_subscription_credits")
      .select("consumed_checkout_session_id")
      .eq("id", credit.id)
      .maybeSingle();

    if (existing?.consumed_checkout_session_id === input.session.id) {
      console.info("[billing/subscription] subscription_credit_consumed");
      return { outcome: "idempotent", logCode: "subscription_credit_consumed" };
    }

    console.info("[billing/subscription] subscription_credit_duplicate");
    return { outcome: "conflict", logCode: "subscription_credit_duplicate" };
  }

  if (updateError || !updated?.id) {
    const { data: raced } = await supabase
      .from("promoted_request_subscription_credits")
      .select("consumed_at, consumed_checkout_session_id")
      .eq("id", credit.id)
      .maybeSingle();

    if (raced?.consumed_at && raced.consumed_checkout_session_id === input.session.id) {
      console.info("[billing/subscription] subscription_credit_consumed");
      return { outcome: "idempotent", logCode: "subscription_credit_consumed" };
    }

    console.info("[billing/subscription] subscription_credit_retryable_failure");
    return { outcome: "retryable_failure", logCode: "subscription_credit_retryable_failure" };
  }

  console.info("[billing/subscription] subscription_credit_consumed");
  return { outcome: "consumed", logCode: "subscription_credit_consumed" };
}
