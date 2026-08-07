import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PLAN_PAYMENT_WEBHOOK_SELECT,
  type PlanPaymentRow,
} from "@/lib/billing/planPaymentWebhookValidation";

export type PlanPaymentFulfillmentRpcOutcome =
  | "applied"
  | "already_applied"
  | "not_found"
  | "invalid_status"
  | "invalid_input";

export type PlanPaymentFulfillmentResult =
  | {
      outcome: "success";
      periodEndAt: string | null;
      paidAt: string | null;
      idempotent: boolean;
    }
  | { outcome: "retryable_failure"; code: string }
  | { outcome: "validation_failed"; code: string };

export type PlanPaymentLifecycleResult = "success" | "noop" | "retryable_failure" | "anomaly";

export async function loadPlanPaymentById(
  supabase: SupabaseClient,
  planPaymentId: string,
): Promise<PlanPaymentRow | null> {
  const { data, error } = await supabase
    .from("plan_payments")
    .select(PLAN_PAYMENT_WEBHOOK_SELECT)
    .eq("id", planPaymentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlanPaymentRow;
}

export async function loadPlanPaymentByStripeChargeId(
  supabase: SupabaseClient,
  chargeId: string,
): Promise<PlanPaymentRow | null> {
  const { data, error } = await supabase
    .from("plan_payments")
    .select(PLAN_PAYMENT_WEBHOOK_SELECT)
    .eq("stripe_charge_id", chargeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlanPaymentRow;
}

export async function loadPlanPaymentByStripePaymentIntentId(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<PlanPaymentRow | null> {
  const { data, error } = await supabase
    .from("plan_payments")
    .select(PLAN_PAYMENT_WEBHOOK_SELECT)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PlanPaymentRow;
}

export async function fulfillPlanPaymentEntitlement(
  supabase: SupabaseClient,
  input: {
    planPaymentId: string;
    paidAt: string;
    paymentIntentId: string;
    chargeId: string | null;
    checkoutSessionId: string;
  },
): Promise<PlanPaymentFulfillmentResult> {
  const { data, error } = await supabase.rpc("fulfill_plan_payment_entitlement", {
    p_plan_payment_id: input.planPaymentId,
    p_paid_at: input.paidAt,
    p_stripe_payment_intent_id: input.paymentIntentId,
    p_stripe_charge_id: input.chargeId,
    p_stripe_checkout_session_id: input.checkoutSessionId,
  });

  if (error) {
    const message = error.message ?? "rpc_failed";
    if (
      message.includes("plan_payment_credit_consumed_other_session") ||
      message.includes("plan_payment_credit_specialist_mismatch") ||
      message.includes("plan_payment_credit_not_found") ||
      message.includes("plan_payment_session_mismatch") ||
      message.includes("plan_payment_intent_mismatch") ||
      message.includes("plan_payment_charge_mismatch")
    ) {
      return { outcome: "validation_failed", code: "plan_payment_fulfillment_failed" };
    }
    return { outcome: "retryable_failure", code: "plan_payment_fulfillment_failed" };
  }

  const payload = (data ?? {}) as {
    outcome?: PlanPaymentFulfillmentRpcOutcome;
    period_end_at?: string | null;
    paid_at?: string | null;
  };

  switch (payload.outcome) {
    case "applied":
      return {
        outcome: "success",
        periodEndAt: payload.period_end_at ?? null,
        paidAt: payload.paid_at ?? null,
        idempotent: false,
      };
    case "already_applied":
      return {
        outcome: "success",
        periodEndAt: payload.period_end_at ?? null,
        paidAt: payload.paid_at ?? null,
        idempotent: true,
      };
    case "not_found":
      return { outcome: "validation_failed", code: "plan_payment_not_found" };
    case "invalid_status":
    case "invalid_input":
      return { outcome: "validation_failed", code: "plan_payment_fulfillment_failed" };
    default:
      return { outcome: "retryable_failure", code: "plan_payment_fulfillment_failed" };
  }
}

const EXPIRABLE_STATUSES = new Set(["pending", "checkout_created"]);
const FAILABLE_STATUSES = new Set(["pending", "checkout_created"]);
const TERMINAL_STATUSES = new Set(["paid", "refunded", "disputed"]);

export async function markPlanPaymentExpired(
  supabase: SupabaseClient,
  payment: PlanPaymentRow,
  expiredAt: string,
): Promise<PlanPaymentLifecycleResult> {
  if (TERMINAL_STATUSES.has(payment.status) || payment.entitlement_applied_at) {
    return "noop";
  }
  if (!EXPIRABLE_STATUSES.has(payment.status)) {
    return "noop";
  }

  const { error } = await supabase
    .from("plan_payments")
    .update({
      status: "expired",
      expired_at: expiredAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .in("status", ["pending", "checkout_created"]);

  if (error) return "retryable_failure";
  return "success";
}

export async function markPlanPaymentRefunded(
  supabase: SupabaseClient,
  payment: PlanPaymentRow,
  refundedAt: string,
): Promise<PlanPaymentLifecycleResult> {
  if (payment.status === "refunded") {
    return "success";
  }

  if (payment.status !== "paid") {
    return "noop";
  }

  const { error } = await supabase
    .from("plan_payments")
    .update({
      status: "refunded",
      refunded_at: refundedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .in("status", ["paid"]);

  if (error) return "retryable_failure";
  return "success";
}

export async function markPlanPaymentAsyncFailed(
  supabase: SupabaseClient,
  payment: PlanPaymentRow,
  failedAt: string,
): Promise<PlanPaymentLifecycleResult> {
  if (payment.entitlement_applied_at || payment.status === "paid") {
    console.info("[billing/plan-payment] plan_payment_async_failed_anomaly", {
      planPaymentId: payment.id,
      status: payment.status,
    });
    return "anomaly";
  }
  if (!FAILABLE_STATUSES.has(payment.status)) {
    return "noop";
  }

  const { error } = await supabase
    .from("plan_payments")
    .update({
      status: "failed",
      failed_at: failedAt,
      failure_code: "async_payment_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .in("status", ["pending", "checkout_created"]);

  if (error) return "retryable_failure";
  return "success";
}

export type UnappliedPlanPaymentRow = Pick<
  PlanPaymentRow,
  "id" | "specialist_id" | "status" | "entitlement_applied_at" | "stripe_checkout_session_id"
>;

/** Server-only helper for future cron/admin repair — selects paid rows without entitlement. */
export async function retryUnappliedPlanPayments(
  supabase: SupabaseClient,
  input?: { limit?: number },
): Promise<UnappliedPlanPaymentRow[]> {
  const limit = input?.limit ?? 50;
  const { data, error } = await supabase
    .from("plan_payments")
    .select("id, specialist_id, status, entitlement_applied_at, stripe_checkout_session_id")
    .eq("status", "paid")
    .is("entitlement_applied_at", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as UnappliedPlanPaymentRow[];
}
