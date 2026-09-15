import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type RequestOfferWebhookOutcome =
  | "ignored"
  | "pending"
  | "success"
  | "validation_failed"
  | "retryable_failure";

export type RequestOfferWebhookResult = {
  outcome: RequestOfferWebhookOutcome;
};

const PURPOSE = "request_offer_access";
const SUCCESS_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);
const REFUND_EVENT = "charge.refunded";
const DISPUTE_EVENT = "charge.dispute.created";

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id?: string | null;
};

function metadataPaymentId(metadata: Stripe.Metadata | null | undefined): string | null {
  if (!metadata || metadata.purpose !== PURPOSE) return null;
  const value = metadata.payment_id?.trim();
  return value || null;
}

function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value.id === "string") return value.id;
  return null;
}

const PAYMENT_SELECT =
  "id, offer_id, specialist_id, amount_cents, currency, status, stripe_checkout_session_id, stripe_payment_intent_id, stripe_charge_id";

async function loadPayment(
  supabase: SupabaseClient,
  paymentId: string,
): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_SELECT)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentRow | null) ?? null;
}

async function loadPaymentByStripeRefs(
  supabase: SupabaseClient,
  input: { paymentIntentId?: string | null; chargeId?: string | null },
): Promise<PaymentRow | null> {
  if (input.paymentIntentId) {
    const { data, error } = await supabase
      .from("request_offer_payments")
      .select(PAYMENT_SELECT)
      .eq("stripe_payment_intent_id", input.paymentIntentId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PaymentRow;
  }
  if (input.chargeId) {
    const { data, error } = await supabase
      .from("request_offer_payments")
      .select(PAYMENT_SELECT)
      .eq("stripe_charge_id", input.chargeId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as PaymentRow;
  }
  return null;
}

async function markOfferPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paidAt: string,
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("request_offers")
    .update({ status: "paid", paid_at: paidAt, updated_at: nowIso })
    .eq("id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .select("id")
    .maybeSingle();
  return !error && Boolean(data?.id);
}

async function grantAccess(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paidAt: string,
): Promise<RequestOfferWebhookResult> {
  const { data: existingGrant, error: grantLoadError } = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at")
    .eq("offer_id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();
  if (grantLoadError) return { outcome: "retryable_failure" };

  if (existingGrant?.id) {
    if (existingGrant.source_payment_id === payment.id && existingGrant.revoked_at == null) {
      return (await markOfferPaid(supabase, payment, paidAt))
        ? { outcome: "success" }
        : { outcome: "retryable_failure" };
    }
    return { outcome: "validation_failed" };
  }

  const nowIso = new Date().toISOString();
  const { error: grantInsertError } = await supabase
    .from("request_offer_access_grants")
    .insert({
      offer_id: payment.offer_id,
      specialist_id: payment.specialist_id,
      source_payment_id: payment.id,
      granted_at: paidAt,
      created_at: nowIso,
      updated_at: nowIso,
    });

  if (grantInsertError) {
    if (grantInsertError.code === "23505") {
      const { data: racedGrant, error: racedError } = await supabase
        .from("request_offer_access_grants")
        .select("id, source_payment_id, revoked_at")
        .eq("offer_id", payment.offer_id)
        .eq("specialist_id", payment.specialist_id)
        .maybeSingle();
      if (!racedError && racedGrant?.source_payment_id === payment.id && racedGrant.revoked_at == null) {
        return (await markOfferPaid(supabase, payment, paidAt))
          ? { outcome: "success" }
          : { outcome: "retryable_failure" };
      }
    }
    return { outcome: "retryable_failure" };
  }

  return (await markOfferPaid(supabase, payment, paidAt))
    ? { outcome: "success" }
    : { outcome: "retryable_failure" };
}

async function handleSuccess(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<RequestOfferWebhookResult> {
  const paymentId = metadataPaymentId(session.metadata);
  if (!paymentId) return { outcome: "ignored" };

  let payment: PaymentRow | null;
  try {
    payment = await loadPayment(supabase, paymentId);
  } catch {
    return { outcome: "retryable_failure" };
  }
  if (!payment) return { outcome: "validation_failed" };
  if (!payment.stripe_checkout_session_id || payment.stripe_checkout_session_id !== session.id) {
    return { outcome: "validation_failed" };
  }
  if (session.payment_status !== "paid") return { outcome: "pending" };

  const amountTotal = session.amount_total;
  const currency = session.currency?.toLowerCase() ?? null;
  const paymentIntentId = stripeId(session.payment_intent as Stripe.PaymentIntent | string | null);
  if (amountTotal !== payment.amount_cents || currency !== payment.currency.toLowerCase() || !paymentIntentId) {
    return { outcome: "validation_failed" };
  }

  const paidAt = new Date(session.created * 1000).toISOString();
  if (payment.status === "paid") {
    if (payment.stripe_payment_intent_id && payment.stripe_payment_intent_id !== paymentIntentId) {
      return { outcome: "validation_failed" };
    }
    return grantAccess(supabase, payment, paidAt);
  }
  if (payment.status !== "pending") return { outcome: "validation_failed" };

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("request_offer_payments")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: paidAt,
      updated_at: nowIso,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select(PAYMENT_SELECT)
    .maybeSingle();
  if (updateError) return { outcome: "retryable_failure" };

  let paidPayment: PaymentRow | null = updated as PaymentRow | null;
  if (!paidPayment) {
    try {
      paidPayment = await loadPayment(supabase, payment.id);
    } catch {
      return { outcome: "retryable_failure" };
    }
  }
  if (!paidPayment || paidPayment.status !== "paid") return { outcome: "retryable_failure" };
  if (paidPayment.stripe_payment_intent_id !== paymentIntentId) return { outcome: "validation_failed" };
  return grantAccess(supabase, paidPayment, paidAt);
}

async function revokeAccessForPayment(
  supabase: SupabaseClient,
  payment: PaymentRow,
  kind: "refund" | "dispute",
  chargeId: string | null,
): Promise<RequestOfferWebhookResult> {
  if (!['paid', 'refunded', 'disputed'].includes(payment.status)) {
    return { outcome: "validation_failed" };
  }

  const targetStatus = kind === "refund" ? "refunded" : "disputed";
  const timestampColumn = kind === "refund" ? "refunded_at" : "disputed_at";
  const revokeReason = kind === "refund" ? "payment_refunded" : "payment_disputed";
  const nowIso = new Date().toISOString();

  if (payment.status !== targetStatus) {
    const patch: Record<string, unknown> = {
      status: targetStatus,
      [timestampColumn]: nowIso,
      updated_at: nowIso,
    };
    if (chargeId) patch.stripe_charge_id = chargeId;

    const { error: paymentError } = await supabase
      .from("request_offer_payments")
      .update(patch)
      .eq("id", payment.id);
    if (paymentError) return { outcome: "retryable_failure" };
  }

  const { data: grant, error: grantLoadError } = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at, revoke_reason")
    .eq("offer_id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();
  if (grantLoadError) return { outcome: "retryable_failure" };
  if (!grant?.id) return { outcome: "success" };
  if (grant.source_payment_id !== payment.id) return { outcome: "validation_failed" };
  if (grant.revoked_at) return { outcome: "success" };

  const { error: revokeError } = await supabase
    .from("request_offer_access_grants")
    .update({ revoked_at: nowIso, revoke_reason: revokeReason, updated_at: nowIso })
    .eq("id", grant.id)
    .is("revoked_at", null);
  return revokeError ? { outcome: "retryable_failure" } : { outcome: "success" };
}

async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
): Promise<RequestOfferWebhookResult> {
  const paymentIntentId = stripeId(charge.payment_intent as Stripe.PaymentIntent | string | null);
  const chargeId = stripeId(charge.id) ?? charge.id;
  let payment: PaymentRow | null;
  try {
    payment = await loadPaymentByStripeRefs(supabase, { paymentIntentId, chargeId });
  } catch {
    return { outcome: "retryable_failure" };
  }
  if (!payment) return { outcome: "ignored" };
  return revokeAccessForPayment(supabase, payment, "refund", chargeId);
}

async function handleDispute(
  supabase: SupabaseClient,
  dispute: Stripe.Dispute,
): Promise<RequestOfferWebhookResult> {
  const chargeId = stripeId(dispute.charge as Stripe.Charge | string | null);
  let payment: PaymentRow | null;
  try {
    payment = await loadPaymentByStripeRefs(supabase, { chargeId });
  } catch {
    return { outcome: "retryable_failure" };
  }
  if (!payment) return { outcome: "ignored" };
  return revokeAccessForPayment(supabase, payment, "dispute", chargeId);
}

export async function processStripeWebhookEventForRequestOffers(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<RequestOfferWebhookResult> {
  if (SUCCESS_EVENTS.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (!metadataPaymentId(session.metadata)) return { outcome: "ignored" };
    return handleSuccess(supabase, session);
  }
  if (event.type === REFUND_EVENT) {
    return handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
  }
  if (event.type === DISPUTE_EVENT) {
    return handleDispute(supabase, event.data.object as Stripe.Dispute);
  }
  return { outcome: "ignored" };
}
