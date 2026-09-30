import type { SupabaseClient } from "@supabase/supabase-js";
import { stripePaymentIntentAttribution } from "@/lib/billing/requestOfferPaymentProvider";
import { finalizeServiceRequestConnection } from "@/lib/selection/claimMatch";

/**
 * Webhook fulfillment after a confirmed service-request capture.
 * Direct-lead Checkout keeps its own grant writer. This module is the
 * service-request owner of payment → grant → offer paid → connection.
 */
export type ServiceRequestFulfillmentOutcome = "success" | "validation_failed" | "retryable_failure";

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
};

type ClaimRow = {
  id: string;
  specialist_id: string;
  service_request_id: string;
  match_id: string | null;
  request_offer_id: string | null;
  status: string;
  client_confirmed_at: string | null;
};

const PAYMENT_COLUMNS =
  "id, offer_id, specialist_id, amount_cents, currency, status, stripe_payment_intent_id";

async function loadPayment(supabase: SupabaseClient, paymentId: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw error;
  return (data as PaymentRow | null) ?? null;
}

async function loadClaim(supabase: SupabaseClient, claimId: string): Promise<ClaimRow | null> {
  const { data, error } = await supabase
    .from("service_request_claims")
    .select("id, specialist_id, service_request_id, match_id, request_offer_id, status, client_confirmed_at")
    .eq("id", claimId)
    .maybeSingle();
  if (error) throw error;
  return (data as ClaimRow | null) ?? null;
}

async function ensurePaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paymentIntentId: string,
  paidAt: string,
): Promise<"ok" | "retryable_failure" | "validation_failed"> {
  if (payment.status === "paid") {
    if (payment.stripe_payment_intent_id && payment.stripe_payment_intent_id !== paymentIntentId) {
      return "validation_failed";
    }
    return "ok";
  }
  const { error } = await supabase
    .from("request_offer_payments")
    .update({
      status: "paid",
      paid_at: paidAt,
      stripe_payment_intent_id: paymentIntentId,
      ...stripePaymentIntentAttribution(paymentIntentId),
      updated_at: paidAt,
    })
    .eq("id", payment.id)
    .in("status", ["pending", "authorized"]);
  if (error) return "retryable_failure";
  const again = await loadPayment(supabase, payment.id);
  if (!again || again.status !== "paid") return "retryable_failure";
  if (again.stripe_payment_intent_id !== paymentIntentId) return "validation_failed";
  return "ok";
}

async function ensureGrant(
  supabase: SupabaseClient,
  payment: PaymentRow,
  grantedAt: string,
): Promise<"ok" | "retryable_failure" | "validation_failed"> {
  const existing = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at")
    .eq("offer_id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();
  if (existing.error) return "retryable_failure";
  if (existing.data?.id) {
    if (existing.data.source_payment_id === payment.id && existing.data.revoked_at == null) return "ok";
    return "validation_failed";
  }

  const nowIso = new Date().toISOString();
  const inserted = await supabase.from("request_offer_access_grants").insert({
    offer_id: payment.offer_id,
    specialist_id: payment.specialist_id,
    source_payment_id: payment.id,
    granted_at: grantedAt,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (!inserted.error) return "ok";
  if (inserted.error.code !== "23505") return "retryable_failure";

  const raced = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at")
    .eq("offer_id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();
  if (raced.error) return "retryable_failure";
  if (raced.data?.source_payment_id === payment.id && raced.data.revoked_at == null) return "ok";
  return "validation_failed";
}

async function ensureOfferPaid(
  supabase: SupabaseClient,
  payment: PaymentRow,
  paidAt: string,
): Promise<"ok" | "retryable_failure"> {
  const nowIso = new Date().toISOString();
  const updated = await supabase
    .from("request_offers")
    .update({ status: "paid", paid_at: paidAt, updated_at: nowIso })
    .eq("id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .select("id, status")
    .maybeSingle();
  if (updated.error) return "retryable_failure";
  if (updated.data?.id) return "ok";
  const again = await supabase
    .from("request_offers")
    .select("id, status, specialist_id")
    .eq("id", payment.offer_id)
    .maybeSingle();
  if (again.error) return "retryable_failure";
  if (again.data?.status === "paid" && again.data.specialist_id === payment.specialist_id) return "ok";
  return "retryable_failure";
}

async function completeClaim(
  supabase: SupabaseClient,
  claim: ClaimRow,
): Promise<"ok" | "retryable_failure" | "validation_failed"> {
  const nowIso = new Date().toISOString();
  const updated = await supabase
    .from("service_request_claims")
    .update({ status: "completed", completed_at: nowIso, updated_at: nowIso })
    .eq("id", claim.id)
    .eq("status", "reserved")
    .not("client_confirmed_at", "is", null);
  if (updated.error) return "retryable_failure";
  const again = await loadClaim(supabase, claim.id);
  if (!again) return "retryable_failure";
  if (again.status === "completed") return "ok";
  if (again.status === "reserved") return "retryable_failure";
  return "validation_failed";
}

export async function fulfillConfirmedServiceRequestCapture(
  supabase: SupabaseClient,
  input: { payment: PaymentRow; claim: ClaimRow; paymentIntentId: string },
): Promise<ServiceRequestFulfillmentOutcome> {
  if (!input.claim.client_confirmed_at || !input.claim.match_id) return "validation_failed";
  const paidAt = new Date().toISOString();
  const paid = await ensurePaid(supabase, input.payment, input.paymentIntentId, paidAt);
  if (paid !== "ok") return paid;

  const grant = await ensureGrant(supabase, input.payment, paidAt);
  if (grant !== "ok") return grant;

  const offer = await ensureOfferPaid(supabase, input.payment, paidAt);
  if (offer !== "ok") return offer;

  let connection: Awaited<ReturnType<typeof finalizeServiceRequestConnection>>;
  try {
    connection = await finalizeServiceRequestConnection(supabase, {
      matchId: input.claim.match_id,
      specialistId: input.claim.specialist_id,
    });
  } catch {
    return "retryable_failure";
  }
  if (!connection.ok) {
    return connection.error === "invariant" ? "retryable_failure" : "validation_failed";
  }

  const current = await loadClaim(supabase, input.claim.id);
  if (!current) return "retryable_failure";
  if (current.status === "completed") return "success";
  if (current.status !== "reserved" || !current.client_confirmed_at) return "validation_failed";
  const completed = await completeClaim(supabase, current);
  return completed === "ok" ? "success" : completed;
}
