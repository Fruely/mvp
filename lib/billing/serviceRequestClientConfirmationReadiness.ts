import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isServiceRequestCaptureEnabled,
  isServiceRequestPaymentAuthEnabled,
} from "@/lib/billing/createServiceRequestAuthorization";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { isCanonicalMatchedServiceRequestOffer } from "@/lib/billing/recordServiceRequestClientConfirmation";
import { specialistHasStorePurchaseCapability } from "@/lib/billing/prepareServiceRequestStorePayment";
import { isConfirmationDeadlineOpen } from "@/lib/billing/serviceRequestConfirmationDeadline";
import {
  isServiceRequestStorePaymentEnabled,
  paymentProvesStripeRail,
} from "@/lib/billing/serviceRequestPaymentRail";

const ACTIVE_PAYMENT_STATUSES = ["pending", "authorized", "paid"] as const;

/**
 * Side-effect-free recovery read for the client request detail.
 * True only when client confirmation can succeed for the current rail.
 */
export async function isServiceRequestClientConfirmationRequired(input: {
  supabase: SupabaseClient;
  requestId: string;
  env?: NodeJS.ProcessEnv;
  stripeConfigured?: boolean;
}): Promise<boolean> {
  const env = input.env ?? process.env;
  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id")
    .eq("id", input.requestId)
    .maybeSingle();
  if (requestResult.error || !requestResult.data?.id) return false;

  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail, confirmation_expires_at")
    .eq("service_request_id", input.requestId)
    .eq("status", "reserved")
    .maybeSingle();
  if (claimResult.error || !claimResult.data?.id) return false;
  const claim = claimResult.data as {
    id: string;
    specialist_id?: string;
    service_request_id?: string;
    match_id?: string;
    request_offer_id?: string | null;
    client_confirmed_at?: string | null;
    client_rejected_at?: string | null;
    payment_rail?: string | null;
    confirmation_expires_at?: unknown;
  };
  if (typeof claim.client_rejected_at === "string" && claim.client_rejected_at) return false;
  if (typeof claim.client_confirmed_at === "string" && claim.client_confirmed_at) return false;
  if (!claim.specialist_id || !claim.request_offer_id || !claim.match_id) return false;
  if (claim.service_request_id !== input.requestId) return false;
  if (requestResult.data.selected_specialist_id) return false;
  if (claim.payment_rail !== "stripe" && claim.payment_rail !== "store") return false;

  const offerResult = await input.supabase
    .from("request_offers")
    .select("request_kind, offer_reason, service_request_id, specialist_id, billing_model, price_cents, currency, idempotency_key")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offerResult.error || !offerResult.data) return false;
  if (!isCanonicalMatchedServiceRequestOffer(offerResult.data, input.requestId, claim.specialist_id)) return false;

  const matchResult = await input.supabase
    .from("service_request_matches")
    .select("service_request_id, specialist_id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (
    matchResult.error ||
    !matchResult.data ||
    matchResult.data.service_request_id !== input.requestId ||
    matchResult.data.specialist_id !== claim.specialist_id ||
    matchResult.data.status !== "active"
  ) {
    return false;
  }

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select("id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id, provider")
    .eq("service_request_claim_id", claim.id)
    .in("status", [...ACTIVE_PAYMENT_STATUSES]);
  if (paymentResult.error) return false;
  const payments = paymentResult.data ?? [];

  const grantResult = await input.supabase
    .from("request_offer_access_grants")
    .select("id")
    .eq("offer_id", claim.request_offer_id)
    .eq("specialist_id", claim.specialist_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (grantResult.error || grantResult.data?.id) return false;

  if (claim.payment_rail === "store") {
    if (payments.length > 0) return false;
    if (!isServiceRequestStorePaymentEnabled(env)) return false;
    const ready = await specialistHasStorePurchaseCapability(input.supabase, claim.specialist_id);
    return ready === true;
  }

  if (!isServiceRequestPaymentAuthEnabled(env) || !isServiceRequestCaptureEnabled(env)) return false;
  if (!isConfirmationDeadlineOpen(claim.confirmation_expires_at)) return false;
  const stripeConfigured = input.stripeConfigured ?? Boolean(getStripeClient());
  if (!stripeConfigured) return false;
  const offerPrice = offerResult.data.price_cents;
  return payments.some(
    (payment) =>
      payment.status === "authorized" &&
      payment.service_request_claim_id === claim.id &&
      payment.offer_id === claim.request_offer_id &&
      payment.specialist_id === claim.specialist_id &&
      payment.currency === "eur" &&
      payment.amount_cents === offerPrice &&
      paymentProvesStripeRail(payment),
  );
}

/** Store rail after the client confirmed and before authoritative settlement. */
export async function isServiceRequestStorePaymentRequired(input: {
  supabase: SupabaseClient;
  requestId: string;
}): Promise<boolean> {
  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail")
    .eq("service_request_id", input.requestId)
    .eq("status", "reserved")
    .maybeSingle();
  if (claimResult.error || !claimResult.data?.id) return false;
  const claim = claimResult.data;
  if (claim.payment_rail !== "store") return false;
  if (typeof claim.client_confirmed_at !== "string" || !claim.client_confirmed_at) return false;
  if (typeof claim.client_rejected_at === "string" && claim.client_rejected_at) return false;
  if (!claim.request_offer_id || !claim.specialist_id) return false;

  const grantResult = await input.supabase
    .from("request_offer_access_grants")
    .select("id")
    .eq("offer_id", claim.request_offer_id)
    .eq("specialist_id", claim.specialist_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (grantResult.error || grantResult.data?.id) return false;

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select("id, status")
    .eq("service_request_claim_id", claim.id)
    .eq("status", "paid");
  if (paymentResult.error || (paymentResult.data ?? []).length > 0) return false;
  return true;
}
