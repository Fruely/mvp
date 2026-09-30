import type { SupabaseClient } from "@supabase/supabase-js";
import { isCanonicalMatchedServiceRequestOffer } from "@/lib/billing/recordServiceRequestClientConfirmation";
import {
  bindServiceRequestPaymentRail,
  isServiceRequestStorePaymentEnabled,
} from "@/lib/billing/serviceRequestPaymentRail";
import {
  activeUserIdsWithNativeCapability,
  PAID_REQUEST_STORE_PURCHASE_CAPABILITY,
} from "@/lib/nativeInstallations/capabilities";
import { notifyClientConfirmationRequired } from "@/lib/selection/interest";
import { isServiceRequestPaidClaimEnabled } from "@/lib/selection/reserveMatch";

const ACTIVE_PAYMENT_STATUSES = ["pending", "authorized", "paid"] as const;

export type PrepareServiceRequestStorePaymentResult =
  | { ok: true; state: "awaiting_client_confirmation" | "payment_required" }
  | {
      ok: false;
      error: "not_found" | "forbidden" | "not_claimable" | "already_claimed" | "invariant" | "retryable";
    };

type ClaimRow = {
  id?: string;
  status?: string;
  specialist_id?: string;
  service_request_id?: string;
  match_id?: string;
  request_offer_id?: string | null;
  client_confirmed_at?: string | null;
  payment_rail?: string | null;
};

/**
 * Binds a reserved claim to the store sequence and asks the client to confirm.
 * It does not create a payment, a purchase, a grant, or a conversation.
 */
export async function prepareServiceRequestStorePayment(input: {
  supabase: SupabaseClient;
  claimId: string;
  specialistId: string;
  env?: NodeJS.ProcessEnv;
}): Promise<PrepareServiceRequestStorePaymentResult> {
  const env = input.env ?? process.env;
  if (!isServiceRequestPaidClaimEnabled(env) || !isServiceRequestStorePaymentEnabled(env)) {
    return { ok: false, error: "not_found" };
  }

  const claimResult = await input.supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, payment_rail")
    .eq("id", input.claimId)
    .maybeSingle();
  if (claimResult.error) return { ok: false, error: "retryable" };
  const claim = claimResult.data as ClaimRow | null;
  if (!claim?.id) return { ok: false, error: "not_found" };
  if (claim.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };
  if (claim.status !== "reserved" || !claim.service_request_id || !claim.match_id || !claim.request_offer_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (claim.payment_rail === "stripe") return { ok: false, error: "not_claimable" };

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id")
    .eq("id", claim.service_request_id)
    .maybeSingle();
  if (requestResult.error) return { ok: false, error: "retryable" };
  if (!requestResult.data?.id) return { ok: false, error: "not_found" };
  if (
    requestResult.data.selected_specialist_id &&
    requestResult.data.selected_specialist_id !== claim.specialist_id
  ) {
    return { ok: false, error: "already_claimed" };
  }

  const offerResult = await input.supabase
    .from("request_offers")
    .select("id, request_kind, offer_reason, service_request_id, specialist_id, billing_model, price_cents, currency, idempotency_key")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offerResult.error) return { ok: false, error: "retryable" };
  const offer = offerResult.data as {
    request_kind?: string;
    offer_reason?: string;
    service_request_id?: string | null;
    specialist_id?: string;
    billing_model?: string;
    price_cents?: number | null;
    currency?: string;
    idempotency_key?: string;
  } | null;
  if (!offer || offer.request_kind !== "service_request") return { ok: false, error: "not_claimable" };
  if (!isCanonicalMatchedServiceRequestOffer(offer, claim.service_request_id, claim.specialist_id)) {
    return { ok: false, error: "invariant" };
  }

  const matchResult = await input.supabase
    .from("service_request_matches")
    .select("id, service_request_id, specialist_id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (matchResult.error) return { ok: false, error: "retryable" };
  const match = matchResult.data as {
    service_request_id?: string;
    specialist_id?: string;
    status?: string;
  } | null;
  if (
    !match ||
    match.service_request_id !== claim.service_request_id ||
    match.specialist_id !== claim.specialist_id ||
    match.status !== "active"
  ) {
    return { ok: false, error: "not_claimable" };
  }

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select("id, status, provider, stripe_payment_intent_id")
    .eq("service_request_claim_id", claim.id)
    .in("status", [...ACTIVE_PAYMENT_STATUSES]);
  if (paymentResult.error) return { ok: false, error: "retryable" };
  if ((paymentResult.data ?? []).length > 0) return { ok: false, error: "not_claimable" };

  const grantResult = await input.supabase
    .from("request_offer_access_grants")
    .select("id")
    .eq("offer_id", claim.request_offer_id)
    .eq("specialist_id", claim.specialist_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (grantResult.error) return { ok: false, error: "retryable" };
  if (grantResult.data?.id) return { ok: false, error: "not_claimable" };

  const ready = await specialistHasStorePurchaseCapability(input.supabase, claim.specialist_id);
  if (ready === "retryable") return { ok: false, error: "retryable" };
  if (!ready) return { ok: false, error: "not_found" };

  const bound = await bindServiceRequestPaymentRail({
    supabase: input.supabase,
    claimId: claim.id,
    specialistId: claim.specialist_id,
    rail: "store",
  });
  if (!bound.ok) return { ok: false, error: bound.error === "forbidden" ? "forbidden" : bound.error };

  if (typeof claim.client_confirmed_at === "string" && claim.client_confirmed_at) {
    return { ok: true, state: "payment_required" };
  }
  await notifyClientConfirmationRequired(input.supabase, claim.id);
  return { ok: true, state: "awaiting_client_confirmation" };
}

export async function specialistHasStorePurchaseCapability(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<boolean | "retryable"> {
  const specialist = await supabase.from("specialists").select("user_id").eq("id", specialistId).maybeSingle();
  if (specialist.error) return "retryable";
  const userId = specialist.data && typeof specialist.data.user_id === "string" ? specialist.data.user_id : "";
  if (!userId) return false;
  const capable = await activeUserIdsWithNativeCapability(
    supabase,
    [userId],
    PAID_REQUEST_STORE_PURCHASE_CAPABILITY,
  );
  if ("error" in capable) return "retryable";
  return capable.has(userId);
}
