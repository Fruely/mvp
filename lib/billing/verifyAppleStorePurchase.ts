import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AppleTransactionCheck,
  CANONICAL_STORE_PRODUCT_ID,
  createAppleSignedTransactionVerifier,
  readAppleStoreVerificationConfig,
} from "@/lib/billing/appleStoreTransaction";
import {
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
  type SpecialistLeadSession,
} from "@/lib/specialistLeads/session";
import { isCanonicalMatchedServiceRequestOffer } from "@/lib/billing/recordServiceRequestClientConfirmation";
import { isServiceRequestStorePaymentEnabled } from "@/lib/billing/serviceRequestPaymentRail";
import { finalizeServiceRequestConnection } from "@/lib/selection/claimMatch";
import { isServiceRequestPaidClaimEnabled } from "@/lib/selection/reserveMatch";

const ACTIVE_PAYMENT_STATUSES = ["pending", "authorized", "paid"] as const;

export type AppleStorePurchaseVerifier = {
  verify(signedTransaction: string): Promise<AppleTransactionCheck>;
};

export type VerifyAppleStorePurchaseResult =
  | { ok: true; state: "connected"; conversationId: string }
  | { ok: true; state: "settling" }
  | {
      ok: false;
      error:
        | "not_found"
        | "forbidden"
        | "not_claimable"
        | "invariant"
        | "unsupported"
        | "invalid"
        | "wrong_product"
        | "wrong_bundle"
        | "wrong_environment"
        | "revoked"
        | "retryable";
    };

type ClaimRow = {
  id: string;
  status: string;
  specialist_id: string;
  service_request_id: string;
  match_id: string;
  request_offer_id: string;
  client_confirmed_at: string | null;
  client_rejected_at: string | null;
  payment_rail: string | null;
};

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  service_request_claim_id: string;
  status: string;
  provider: string | null;
  provider_transaction_id: string | null;
  provider_environment: string | null;
  stripe_payment_intent_id?: string | null;
};

export function readStoreVerifyBody(body: unknown):
  | { ok: true; signedTransaction: string }
  | { ok: false; error: "invalid" | "unsupported" } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid" };
  const record = body as Record<string, unknown>;
  if (record.platform === "android" || record.store === "google") return { ok: false, error: "unsupported" };
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "signedTransaction") return { ok: false, error: "invalid" };
  const signedTransaction = record.signedTransaction;
  if (typeof signedTransaction !== "string" || signedTransaction.split(".").length !== 3) {
    return { ok: false, error: "invalid" };
  }
  return { ok: true, signedTransaction };
}

export async function storeVerifyHttp(input: {
  session: SpecialistLeadSession;
  claimId: string;
  body: unknown;
  supabase: SupabaseClient;
  env?: NodeJS.ProcessEnv;
  verifier?: AppleStorePurchaseVerifier;
  finalizeConnection?: typeof finalizeServiceRequestConnection;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  if (input.session.kind !== "ok") {
    return {
      status: specialistLeadSessionErrorStatus(input.session),
      body: { error: specialistLeadSessionErrorCode(input.session) },
    };
  }
  if (!CLAIM_ID.test(input.claimId)) return { status: 404, body: { error: "not_found" } };
  const parsed = readStoreVerifyBody(input.body);
  if (!parsed.ok) {
    return { status: parsed.error === "unsupported" ? 409 : 422, body: { error: parsed.error } };
  }
  const verifier = input.verifier ?? verifierFromEnv(input.env ?? process.env);
  if (!verifier) return { status: 503, body: { error: "retryable" } };
  const result = await verifyAppleStorePurchase({
    supabase: input.supabase,
    claimId: input.claimId,
    specialistId: input.session.specialistId,
    userId: input.session.userId,
    signedTransaction: parsed.signedTransaction,
    env: input.env,
    verifier,
    finalizeConnection: input.finalizeConnection,
  });
  if (result.ok && result.state === "connected") {
    return { status: 200, body: { ok: true, state: "connected", conversationId: result.conversationId } };
  }
  if (result.ok) return { status: 200, body: { ok: true, state: "settling" } };
  return { status: verifyErrorStatus(result.error), body: { error: publicVerifyError(result.error) } };
}

const CLAIM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function verifierFromEnv(env: NodeJS.ProcessEnv): AppleStorePurchaseVerifier | null {
  const config = readAppleStoreVerificationConfig(env);
  if (!config.ok) return null;
  return createAppleSignedTransactionVerifier(config.config);
}

function verifyErrorStatus(error: Exclude<VerifyAppleStorePurchaseResult, { ok: true }>["error"]): number {
  if (error === "forbidden") return 403;
  if (error === "not_found") return 404;
  if (error === "retryable") return 503;
  if (
    error === "invalid" ||
    error === "wrong_product" ||
    error === "wrong_bundle" ||
    error === "wrong_environment" ||
    error === "revoked"
  ) {
    return 422;
  }
  return 409;
}

function publicVerifyError(error: Exclude<VerifyAppleStorePurchaseResult, { ok: true }>["error"]): string {
  if (
    error === "invalid" ||
    error === "wrong_product" ||
    error === "wrong_bundle" ||
    error === "wrong_environment" ||
    error === "revoked"
  ) {
    return "invalid";
  }
  return error;
}

/**
 * Verifies an Apple-signed transaction for the authenticated claim and settles
 * the existing request-offer payment. The client cannot choose the price,
 * offer, specialist, or conversation.
 */
export async function verifyAppleStorePurchase(input: {
  supabase: SupabaseClient;
  claimId: string;
  specialistId: string;
  userId: string;
  signedTransaction: string;
  env?: NodeJS.ProcessEnv;
  verifier: AppleStorePurchaseVerifier;
  finalizeConnection?: typeof finalizeServiceRequestConnection;
}): Promise<VerifyAppleStorePurchaseResult> {
  const env = input.env ?? process.env;
  if (!isServiceRequestPaidClaimEnabled(env) || !isServiceRequestStorePaymentEnabled(env)) {
    return { ok: false, error: "not_found" };
  }
  if (!input.signedTransaction.trim()) return { ok: false, error: "invalid" };

  const checked = await input.verifier.verify(input.signedTransaction);
  if (!checked.ok) return checked;
  const sessionUserId = input.userId.trim().toLowerCase();
  const accountToken = checked.transaction.appAccountToken?.trim().toLowerCase() ?? "";
  if (!accountToken || accountToken !== sessionUserId) {
    return { ok: false, error: "invalid" };
  }

  const claim = await loadClaim(input.supabase, input.claimId);
  if (claim === "retryable") return { ok: false, error: "retryable" };
  if (!claim) return { ok: false, error: "not_found" };
  if (claim.specialist_id !== input.specialistId) return { ok: false, error: "forbidden" };

  const transaction = checked.transaction;
  const existing = await loadPaymentByTransaction(input.supabase, transaction.transactionId, transaction.environment);
  if (existing === "retryable") return { ok: false, error: "retryable" };
  if (existing && !sameCommercialIdentity(existing, claim)) return { ok: false, error: "invariant" };

  if (!existing) {
    const ready = await assertFreshStoreClaim(input.supabase, claim);
    if (!ready.ok) return ready;
    const inserted = await insertVerifiedPayment(input.supabase, {
      claim,
      userId: input.userId,
      transactionId: transaction.transactionId,
      environment: transaction.environment,
    });
    if (!inserted.ok) return inserted;
    return settleVerifiedPayment(input.supabase, {
      claim,
      payment: inserted.payment,
      finalizeConnection: input.finalizeConnection,
    });
  }

  return settleVerifiedPayment(input.supabase, {
    claim,
    payment: existing,
    finalizeConnection: input.finalizeConnection,
  });
}

async function assertFreshStoreClaim(
  supabase: SupabaseClient,
  claim: ClaimRow,
): Promise<{ ok: true } | Extract<VerifyAppleStorePurchaseResult, { ok: false }>> {
  if (claim.status !== "reserved") return { ok: false, error: "not_claimable" };
  if (claim.payment_rail !== "store") return { ok: false, error: "not_claimable" };
  if (!claim.client_confirmed_at) return { ok: false, error: "not_claimable" };
  if (claim.client_rejected_at) return { ok: false, error: "not_claimable" };

  const request = await supabase
    .from("service_requests")
    .select("id, selected_specialist_id")
    .eq("id", claim.service_request_id)
    .maybeSingle();
  if (request.error) return { ok: false, error: "retryable" };
  if (!request.data?.id) return { ok: false, error: "not_found" };
  if (request.data.selected_specialist_id && request.data.selected_specialist_id !== claim.specialist_id) {
    return { ok: false, error: "invariant" };
  }

  const offer = await supabase
    .from("request_offers")
    .select("id, request_kind, offer_reason, service_request_id, specialist_id, billing_model, price_cents, currency, idempotency_key")
    .eq("id", claim.request_offer_id)
    .maybeSingle();
  if (offer.error) return { ok: false, error: "retryable" };
  if (!offer.data || !isCanonicalMatchedServiceRequestOffer(offer.data, claim.service_request_id, claim.specialist_id)) {
    return { ok: false, error: "invariant" };
  }
  if (offer.data.price_cents !== 2500 || offer.data.currency !== "eur") {
    return { ok: false, error: "invariant" };
  }

  const match = await supabase
    .from("service_request_matches")
    .select("id, service_request_id, specialist_id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (match.error) return { ok: false, error: "retryable" };
  if (
    !match.data ||
    match.data.service_request_id !== claim.service_request_id ||
    match.data.specialist_id !== claim.specialist_id ||
    match.data.status !== "active"
  ) {
    return { ok: false, error: "not_claimable" };
  }

  const active = await supabase
    .from("request_offer_payments")
    .select("id, provider, provider_transaction_id, status")
    .eq("service_request_claim_id", claim.id)
    .in("status", [...ACTIVE_PAYMENT_STATUSES]);
  if (active.error) return { ok: false, error: "retryable" };
  if ((active.data ?? []).length > 0) return { ok: false, error: "invariant" };

  const grant = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at")
    .eq("offer_id", claim.request_offer_id)
    .eq("specialist_id", claim.specialist_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (grant.error) return { ok: false, error: "retryable" };
  if (grant.data?.id) return { ok: false, error: "invariant" };
  return { ok: true };
}

async function insertVerifiedPayment(
  supabase: SupabaseClient,
  input: { claim: ClaimRow; userId: string; transactionId: string; environment: "production" | "sandbox" },
): Promise<{ ok: true; payment: PaymentRow } | { ok: false; error: "retryable" }> {
  const now = new Date().toISOString();
  const inserted = await supabase
    .from("request_offer_payments")
    .insert({
      offer_id: input.claim.request_offer_id,
      specialist_id: input.claim.specialist_id,
      user_id: input.userId,
      service_request_claim_id: input.claim.id,
      amount_cents: 2500,
      currency: "eur",
      status: "paid",
      provider: "apple",
      provider_transaction_id: input.transactionId,
      provider_product_id: CANONICAL_STORE_PRODUCT_ID,
      provider_verification_status: "verified",
      provider_environment: input.environment,
      paid_at: now,
      created_at: now,
      updated_at: now,
    })
    .select("id, offer_id, specialist_id, service_request_claim_id, status, provider, provider_transaction_id, provider_environment, stripe_payment_intent_id")
    .maybeSingle();
  if (inserted.error || !inserted.data?.id) return { ok: false, error: "retryable" };
  return { ok: true, payment: inserted.data as PaymentRow };
}

async function settleVerifiedPayment(
  supabase: SupabaseClient,
  input: {
    claim: ClaimRow;
    payment: PaymentRow;
    finalizeConnection?: typeof finalizeServiceRequestConnection;
  },
): Promise<VerifyAppleStorePurchaseResult> {
  const granted = await ensureGrant(supabase, input.payment);
  if (granted === "conflict") return { ok: false, error: "invariant" };
  if (granted !== "ok") return { ok: true, state: "settling" };

  const offer = await ensureOfferPaid(supabase, input.payment);
  if (!offer) return { ok: true, state: "settling" };

  const finalize = input.finalizeConnection ?? finalizeServiceRequestConnection;
  let connection: Awaited<ReturnType<typeof finalizeServiceRequestConnection>>;
  try {
    connection = await finalize(supabase, {
      matchId: input.claim.match_id,
      specialistId: input.claim.specialist_id,
    });
  } catch {
    return { ok: true, state: "settling" };
  }
  if (!connection.ok || !connection.conversationId) return { ok: true, state: "settling" };

  const completed = await completeClaim(supabase, input.claim.id);
  if (!completed) return { ok: true, state: "settling" };
  return { ok: true, state: "connected", conversationId: connection.conversationId };
}

async function ensureGrant(
  supabase: SupabaseClient,
  payment: PaymentRow,
): Promise<"ok" | "conflict" | "retryable"> {
  const existing = await supabase
    .from("request_offer_access_grants")
    .select("id, source_payment_id, revoked_at")
    .eq("offer_id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id)
    .maybeSingle();
  if (existing.error) return "retryable";
  if (existing.data?.id) {
    if (existing.data.source_payment_id === payment.id && existing.data.revoked_at == null) return "ok";
    return "conflict";
  }
  const now = new Date().toISOString();
  const inserted = await supabase.from("request_offer_access_grants").insert({
    offer_id: payment.offer_id,
    specialist_id: payment.specialist_id,
    source_payment_id: payment.id,
    granted_at: now,
    created_at: now,
    updated_at: now,
  });
  if (inserted.error) return "retryable";
  return "ok";
}

async function ensureOfferPaid(supabase: SupabaseClient, payment: PaymentRow): Promise<boolean> {
  const now = new Date().toISOString();
  const updated = await supabase
    .from("request_offers")
    .update({ status: "paid", paid_at: now, updated_at: now })
    .eq("id", payment.offer_id)
    .eq("specialist_id", payment.specialist_id);
  if (updated.error) return false;
  const again = await supabase.from("request_offers").select("id, status").eq("id", payment.offer_id).maybeSingle();
  return again.data?.status === "paid";
}

async function completeClaim(supabase: SupabaseClient, claimId: string): Promise<boolean> {
  const current = await loadClaim(supabase, claimId);
  if (current === "retryable" || !current) return false;
  if (current.status === "completed") return true;
  if (current.status !== "reserved" || !current.client_confirmed_at) return false;
  const now = new Date().toISOString();
  const updated = await supabase
    .from("service_request_claims")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", claimId)
    .eq("status", "reserved");
  if (updated.error) return false;
  const again = await loadClaim(supabase, claimId);
  return again !== "retryable" && again?.status === "completed";
}

function sameCommercialIdentity(payment: PaymentRow, claim: ClaimRow): boolean {
  return (
    payment.service_request_claim_id === claim.id &&
    payment.offer_id === claim.request_offer_id &&
    payment.specialist_id === claim.specialist_id &&
    payment.provider === "apple"
  );
}

async function loadClaim(supabase: SupabaseClient, claimId: string): Promise<ClaimRow | null | "retryable"> {
  const result = await supabase
    .from("service_request_claims")
    .select("id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail")
    .eq("id", claimId)
    .maybeSingle();
  if (result.error) return "retryable";
  const row = result.data;
  if (!row?.id || !row.service_request_id || !row.match_id || !row.request_offer_id || !row.specialist_id) return null;
  return {
    id: String(row.id),
    status: String(row.status ?? ""),
    specialist_id: String(row.specialist_id),
    service_request_id: String(row.service_request_id),
    match_id: String(row.match_id),
    request_offer_id: String(row.request_offer_id),
    client_confirmed_at: typeof row.client_confirmed_at === "string" ? row.client_confirmed_at : null,
    client_rejected_at: typeof row.client_rejected_at === "string" ? row.client_rejected_at : null,
    payment_rail: typeof row.payment_rail === "string" ? row.payment_rail : null,
  };
}

async function loadPaymentByTransaction(
  supabase: SupabaseClient,
  transactionId: string,
  environment: string,
): Promise<PaymentRow | null | "retryable"> {
  const result = await supabase
    .from("request_offer_payments")
    .select("id, offer_id, specialist_id, service_request_claim_id, status, provider, provider_transaction_id, provider_environment, stripe_payment_intent_id")
    .eq("provider", "apple")
    .eq("provider_transaction_id", transactionId)
    .eq("provider_environment", environment)
    .maybeSingle();
  if (result.error) return "retryable";
  if (!result.data?.id) return null;
  return result.data as PaymentRow;
}
