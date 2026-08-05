import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
  PROMOTED_SUBSCRIPTION_CREDIT_DAYS,
  PROMOTED_ACCESS_GRANT_WEBHOOK_SELECT,
  PROMOTED_PAYMENT_WEBHOOK_SELECT,
} from "@/lib/billing/promotedAccessConstants";
import type { PromotedPaymentRow } from "@/lib/billing/promotedAccessWebhookValidation";

export type PromotedFulfillmentResult =
  | "success"
  | "retryable_failure"
  | "conflict_revoked_grant";

function addDaysIso(iso: string, days: number): string {
  const ms = new Date(iso).getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export async function loadPromotedPaymentById(
  supabase: SupabaseClient,
  paymentId: string,
): Promise<PromotedPaymentRow | null> {
  const { data, error } = await supabase
    .from("promoted_request_payments")
    .select(PROMOTED_PAYMENT_WEBHOOK_SELECT)
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PromotedPaymentRow;
}

export async function loadPromotedPaymentByStripeChargeId(
  supabase: SupabaseClient,
  chargeId: string,
): Promise<PromotedPaymentRow | null> {
  const { data, error } = await supabase
    .from("promoted_request_payments")
    .select(PROMOTED_PAYMENT_WEBHOOK_SELECT)
    .eq("stripe_charge_id", chargeId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PromotedPaymentRow;
}

export async function loadPromotedPaymentByStripePaymentIntentId(
  supabase: SupabaseClient,
  paymentIntentId: string,
): Promise<PromotedPaymentRow | null> {
  const { data, error } = await supabase
    .from("promoted_request_payments")
    .select(PROMOTED_PAYMENT_WEBHOOK_SELECT)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PromotedPaymentRow;
}

async function otherPaidPaymentExists(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
): Promise<boolean> {
  const { data } = await supabase
    .from("promoted_request_payments")
    .select("id")
    .eq("specialist_id", payment.specialist_id)
    .eq("promotion_id", payment.promotion_id)
    .eq("status", "paid")
    .neq("id", payment.id)
    .maybeSingle();

  return Boolean(data?.id);
}

async function ensurePaymentPaid(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
  input: {
    paymentIntentId: string;
    chargeId: string | null;
    paidAt: string;
  },
): Promise<"ok" | "duplicate" | "retryable_failure"> {
  if (payment.status === "paid") {
    const { error } = await supabase
      .from("promoted_request_payments")
      .update({
        stripe_payment_intent_id:
          payment.stripe_payment_intent_id ?? input.paymentIntentId,
        stripe_charge_id: payment.stripe_charge_id ?? input.chargeId,
        paid_at: payment.paid_at ?? input.paidAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (error) return "retryable_failure";
    return "ok";
  }

  const { error } = await supabase
    .from("promoted_request_payments")
    .update({
      status: "paid",
      stripe_payment_intent_id: input.paymentIntentId,
      stripe_charge_id: input.chargeId,
      paid_at: input.paidAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (error?.code === "23505") return "duplicate";
  if (error) return "retryable_failure";
  return "ok";
}

async function ensureAccessGrant(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
  grantedAt: string,
): Promise<"ok" | "retryable_failure" | "conflict_revoked_grant" | "skipped"> {
  const { data: existing, error: loadError } = await supabase
    .from("promoted_request_access_grants")
    .select(PROMOTED_ACCESS_GRANT_WEBHOOK_SELECT)
    .eq("specialist_id", payment.specialist_id)
    .eq("promotion_id", payment.promotion_id)
    .maybeSingle();

  if (loadError) return "retryable_failure";

  if (existing) {
    if (existing.revoked_at) return "conflict_revoked_grant";
    if (existing.source_type === "subscription") return "skipped";
    if (existing.source_payment_id === payment.id) return "ok";
    return "ok";
  }

  const ts = new Date().toISOString();
  const { error } = await supabase.from("promoted_request_access_grants").insert({
    specialist_id: payment.specialist_id,
    promotion_id: payment.promotion_id,
    source_type: "payment",
    source_payment_id: payment.id,
    granted_at: grantedAt,
    revoked_at: null,
    revoke_reason: null,
    created_at: ts,
    updated_at: ts,
  });

  if (error?.code === "23505") return "ok";
  if (error) return "retryable_failure";
  return "ok";
}

async function ensureSubscriptionCredit(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
  paidAt: string,
): Promise<"ok" | "retryable_failure"> {
  const { data: byPayment } = await supabase
    .from("promoted_request_subscription_credits")
    .select("id")
    .eq("source_payment_id", payment.id)
    .maybeSingle();

  if (byPayment?.id) return "ok";

  const { data: bySpecialist } = await supabase
    .from("promoted_request_subscription_credits")
    .select("id")
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();

  if (bySpecialist?.id) return "ok";

  const ts = new Date().toISOString();
  const eligibleUntil = addDaysIso(paidAt, PROMOTED_SUBSCRIPTION_CREDIT_DAYS);

  const { error } = await supabase.from("promoted_request_subscription_credits").insert({
    specialist_id: payment.specialist_id,
    source_payment_id: payment.id,
    credit_cents: PROMOTED_SUBSCRIPTION_CREDIT_CENTS,
    currency: PROMOTED_ACCESS_CURRENCY,
    eligible_until: eligibleUntil,
    consumed_at: null,
    consumed_checkout_session_id: null,
    consumed_plan_code: null,
    created_at: ts,
    updated_at: ts,
  });

  if (error?.code === "23505") return "ok";
  if (error) return "retryable_failure";
  return "ok";
}

export async function fulfillPromotedPaymentSuccess(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
  input: {
    paymentIntentId: string;
    chargeId: string | null;
    paidAt: string;
  },
): Promise<PromotedFulfillmentResult> {
  if (await otherPaidPaymentExists(supabase, payment)) {
    console.info("[billing/promoted-access] promoted_fulfillment_duplicate");
    return "success";
  }

  const paidResult = await ensurePaymentPaid(supabase, payment, input);
  if (paidResult === "duplicate") {
    console.info("[billing/promoted-access] promoted_fulfillment_duplicate");
    return "success";
  }
  if (paidResult === "retryable_failure") {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  const grantResult = await ensureAccessGrant(supabase, payment, input.paidAt);
  if (grantResult === "retryable_failure") {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }
  if (grantResult === "conflict_revoked_grant") {
    console.info("[billing/promoted-access] promoted_validation_failed");
    return "conflict_revoked_grant";
  }

  const creditResult = await ensureSubscriptionCredit(supabase, payment, input.paidAt);
  if (creditResult === "retryable_failure") {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  console.info("[billing/promoted-access] promoted_payment_paid");
  return "success";
}

export async function markPromotedPaymentFailed(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
): Promise<"success" | "retryable_failure" | "ignored"> {
  if (payment.status === "failed") {
    return "success";
  }

  if (payment.status !== "pending") {
    return "ignored";
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("promoted_request_payments")
    .update({
      status: "failed",
      failed_at: now,
      updated_at: now,
    })
    .eq("id", payment.id);

  if (error) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  console.info("[billing/promoted-access] promoted_payment_failed");
  return "success";
}

export async function markPromotedPaymentExpired(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
): Promise<"success" | "retryable_failure" | "ignored"> {
  if (payment.status !== "pending") {
    return "ignored";
  }

  const expiredAt = new Date().toISOString();
  const { error } = await supabase
    .from("promoted_request_payments")
    .update({
      status: "expired",
      expired_at: expiredAt,
      updated_at: expiredAt,
    })
    .eq("id", payment.id);

  if (error) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  console.info("[billing/promoted-access] promoted_payment_expired");
  return "success";
}

export async function revokePromotedAccessForPayment(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
  reason: "refund" | "dispute",
): Promise<"success" | "retryable_failure"> {
  const { data: grant, error: loadError } = await supabase
    .from("promoted_request_access_grants")
    .select(PROMOTED_ACCESS_GRANT_WEBHOOK_SELECT)
    .eq("specialist_id", payment.specialist_id)
    .eq("promotion_id", payment.promotion_id)
    .maybeSingle();

  if (loadError) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  if (!grant || grant.source_type !== "payment") {
    return "success";
  }

  if (grant.revoked_at) {
    return "success";
  }

  if (grant.source_payment_id && grant.source_payment_id !== payment.id) {
    return "success";
  }

  const revokedAt = new Date().toISOString();
  const { error } = await supabase
    .from("promoted_request_access_grants")
    .update({
      revoked_at: revokedAt,
      revoke_reason: reason,
      updated_at: revokedAt,
    })
    .eq("id", grant.id as string);

  if (error) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  return "success";
}

export async function markPromotedPaymentRefunded(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
): Promise<"success" | "retryable_failure" | "ignored"> {
  if (payment.status === "refunded") {
    return "success";
  }

  if (payment.status !== "paid") {
    return "ignored";
  }

  const refundedAt = new Date().toISOString();
  const { error } = await supabase
    .from("promoted_request_payments")
    .update({
      status: "refunded",
      refunded_at: refundedAt,
      updated_at: refundedAt,
    })
    .eq("id", payment.id);

  if (error) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  const revokeResult = await revokePromotedAccessForPayment(supabase, payment, "refund");
  if (revokeResult === "retryable_failure") return "retryable_failure";

  console.info("[billing/promoted-access] promoted_payment_refunded");
  return "success";
}

export async function markPromotedPaymentDisputed(
  supabase: SupabaseClient,
  payment: PromotedPaymentRow,
): Promise<"success" | "retryable_failure" | "ignored"> {
  if (payment.status === "disputed") {
    return "success";
  }

  if (payment.status !== "paid") {
    return "ignored";
  }

  const disputedAt = new Date().toISOString();
  const { error } = await supabase
    .from("promoted_request_payments")
    .update({
      status: "disputed",
      disputed_at: disputedAt,
      updated_at: disputedAt,
    })
    .eq("id", payment.id);

  if (error) {
    console.info("[billing/promoted-access] promoted_db_error");
    return "retryable_failure";
  }

  const revokeResult = await revokePromotedAccessForPayment(supabase, payment, "dispute");
  if (revokeResult === "retryable_failure") return "retryable_failure";

  console.info("[billing/promoted-access] promoted_payment_disputed");
  return "success";
}
