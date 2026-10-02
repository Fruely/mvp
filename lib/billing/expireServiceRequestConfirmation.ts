import type { SupabaseClient } from "@supabase/supabase-js";
import { SERVICE_REQUEST_AUTHORIZATION_PURPOSE } from "@/lib/billing/createServiceRequestAuthorization";
import { stripePaymentIntentAttribution } from "@/lib/billing/requestOfferPaymentProvider";
import { paymentProvesStripeRail } from "@/lib/billing/serviceRequestPaymentRail";
import {
  isConfirmationDeadlineOpen,
  storedConfirmationDeadline,
} from "@/lib/billing/serviceRequestConfirmationDeadline";
import { CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS } from "@/lib/leadEngine/serviceRequestAccessPricing";
import { connectionConfirmationInboxKey } from "@/lib/selection/policy";

/**
 * Confirmation-window expiry for one reserved Stripe authorization.
 * The persisted confirmation_expires_at is the deadline. This does not read
 * the duration configuration, capture, refund, or reserve another specialist.
 */
export const CONFIRMATION_EXPIRED_RELEASE_REASON = "confirmation_expired";
export const CONFIRMATION_EXPIRY_BATCH_LIMIT = 25;

export function serviceRequestExpiryIdempotencyKey(paymentId: string): string {
  return `service-request-expiry:${paymentId}`;
}

const CANCELABLE_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
]);

type ReleaseIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
};

export type ServiceRequestExpiryStripe = {
  paymentIntents: {
    retrieve: (id: string) => Promise<ReleaseIntent>;
    cancel: (
      id: string,
      params: { cancellation_reason: "abandoned" },
      options: { idempotencyKey: string },
    ) => Promise<ReleaseIntent>;
  };
};

type ClaimRow = {
  id: string;
  status: string;
  specialist_id: string;
  service_request_id: string;
  match_id: string | null;
  request_offer_id: string | null;
  client_confirmed_at: string | null;
  client_rejected_at: string | null;
  payment_rail?: string | null;
  release_reason?: string | null;
  released_at?: string | null;
  expired_at?: string | null;
  confirmation_expires_at?: unknown;
};

type PaymentRow = {
  id: string;
  offer_id: string;
  specialist_id: string;
  service_request_claim_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  provider?: string | null;
};

const CLAIM_COLUMNS =
  "id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail, release_reason, released_at, expired_at, confirmation_expires_at";

const PAYMENT_COLUMNS =
  "id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id, provider";

export type ConfirmationExpiryResult = "expired" | "skipped" | "retryable" | "invariant";

export type ConfirmationExpiryBatch = {
  examined: number;
  expired: number;
  skipped: number;
  retryable: number;
  invariant: number;
};

type DecisionResult =
  | { ok: true; at: string }
  | { ok: false; error: "not_claimable" | "confirmation_expired" | "retryable" };

export async function applyServiceRequestClientDecision(
  supabase: SupabaseClient,
  claimId: string,
  decision: "confirm" | "reject",
): Promise<DecisionResult> {
  const saved = await supabase.rpc("apply_service_request_client_decision", {
    p_claim_id: claimId,
    p_decision: decision,
  });
  if (saved.error || !saved.data || typeof saved.data !== "object") return { ok: false, error: "retryable" };
  const body = saved.data as { ok?: boolean; at?: string; error?: string };
  if (body.ok === true && typeof body.at === "string" && body.at) return { ok: true, at: body.at };
  if (body.error === "confirmation_expired" || body.error === "not_claimable") {
    return { ok: false, error: body.error };
  }
  return { ok: false, error: "retryable" };
}

function canonicalAmount(value: unknown): boolean {
  return value === CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS;
}

/**
 * True only for a canonical Stripe confirmation-expiry attempt.
 * `service_request_matches.status = expired` is a generic state. It counts
 * only together with the due deadline, the Stripe rail, and the unpaid €25
 * relation. `begin_service_request_confirmation_expiry` is the only writer
 * that stores that match status, and only for `payment_rail = stripe`.
 */
export function expiryDecisionIsDurable(input: {
  matchStatus?: string | null;
  clientConfirmedAt?: string | null;
  clientRejectedAt?: string | null;
  confirmationExpiresAt?: unknown;
  claimStatus?: string | null;
  releaseReason?: string | null;
  paymentRail?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  paymentStatus?: string | null;
  requestUnselected?: boolean;
  now?: Date;
}): boolean {
  if (input.clientConfirmedAt || input.clientRejectedAt) return false;
  if (input.paymentStatus === "paid" || input.claimStatus === "completed") return false;
  if (input.requestUnselected !== true) return false;
  if (input.paymentRail !== "stripe") return false;
  if (input.amountCents !== CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS) return false;
  if (input.currency !== "eur") return false;
  const deadline = storedConfirmationDeadline(input.confirmationExpiresAt);
  if (!deadline || isConfirmationDeadlineOpen(deadline, input.now)) return false;
  const reserved = input.claimStatus === "reserved";
  const alreadyExpired = input.claimStatus === "expired" && input.releaseReason === CONFIRMATION_EXPIRED_RELEASE_REASON;
  if (!reserved && !alreadyExpired) return false;
  return input.matchStatus === "expired";
}

export async function expireServiceRequestConfirmation(input: {
  supabase: SupabaseClient;
  claimId: string;
  stripe?: ServiceRequestExpiryStripe | null;
  now?: Date;
}): Promise<ConfirmationExpiryResult> {
  const now = input.now ?? new Date();
  const claimResult = await input.supabase
    .from("service_request_claims")
    .select(CLAIM_COLUMNS)
    .eq("id", input.claimId)
    .maybeSingle();
  if (claimResult.error) return "retryable";
  const claim = claimResult.data as ClaimRow | null;
  if (!claim?.id) return "skipped";
  if (claim.client_confirmed_at || claim.status === "completed") return "skipped";
  if (claim.client_rejected_at) return "skipped";
  if (claim.status === "expired") {
    if (claim.release_reason !== CONFIRMATION_EXPIRED_RELEASE_REASON) return "invariant";
    const notices = await cancelConfirmationNotices(input.supabase, claim.id);
    return notices ? "expired" : "retryable";
  }
  if (claim.status !== "reserved") return "skipped";
  if (!storedConfirmationDeadline(claim.confirmation_expires_at)) return "skipped";
  if (isConfirmationDeadlineOpen(claim.confirmation_expires_at, now)) return "skipped";
  if (claim.payment_rail !== "stripe" || !claim.match_id || !claim.request_offer_id) return "skipped";

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id")
    .eq("id", claim.service_request_id)
    .maybeSingle();
  if (requestResult.error) return "retryable";
  if (!requestResult.data?.id) return "skipped";
  if (requestResult.data.selected_specialist_id) return "skipped";

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("service_request_claim_id", claim.id)
    .in("status", ["pending", "authorized", "paid", "released"]);
  if (paymentResult.error) return "retryable";
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  if (payments.some((row) => row.status === "paid")) return "invariant";
  const payment = payments.find((row) => row.status === "released")
    ?? payments.find((row) => row.status === "authorized")
    ?? payments.find((row) => row.status === "pending")
    ?? null;
  if (
    !payment ||
    payment.service_request_claim_id !== claim.id ||
    payment.offer_id !== claim.request_offer_id ||
    payment.specialist_id !== claim.specialist_id ||
    payment.currency !== "eur" ||
    !canonicalAmount(payment.amount_cents) ||
    !paymentProvesStripeRail(payment)
  ) {
    return "invariant";
  }

  if (payment.status !== "released") {
    if (!input.stripe) return "retryable";
    const inspected = await inspectUncapturedAuthorization(input.stripe, payment, claim);
    if (!inspected.ok) return inspected.error === "invariant" ? "invariant" : "retryable";
  }

  const begun = await input.supabase.rpc("begin_service_request_confirmation_expiry", {
    p_claim_id: claim.id,
  });
  if (begun.error || !begun.data || typeof begun.data !== "object") return "retryable";
  const started = begun.data as { ok?: boolean; state?: string };
  if (started.ok !== true || started.state !== "started") return "skipped";

  if (payment.status !== "released") {
    if (!input.stripe) return "retryable";
    const canceled = await cancelUncapturedAuthorization(input.stripe, payment, claim);
    if (!canceled.ok) return canceled.error === "invariant" ? "invariant" : "retryable";
  }

  return finalizeConfirmationExpiry(input.supabase, claim.id);
}

export async function finalizeConfirmationExpiry(
  supabase: SupabaseClient,
  claimId: string,
): Promise<ConfirmationExpiryResult> {
  const claimResult = await supabase.from("service_request_claims").select(CLAIM_COLUMNS).eq("id", claimId).maybeSingle();
  if (claimResult.error || !claimResult.data?.id) return "retryable";
  const claim = claimResult.data as ClaimRow;
  if (claim.client_confirmed_at || claim.client_rejected_at || claim.status === "completed") return "skipped";
  if (claim.status === "expired") {
    if (claim.release_reason !== CONFIRMATION_EXPIRED_RELEASE_REASON) return "invariant";
    const notices = await cancelConfirmationNotices(supabase, claim.id);
    return notices ? "expired" : "retryable";
  }
  if (claim.status !== "reserved" || !claim.match_id) return "retryable";

  const matchResult = await supabase
    .from("service_request_matches")
    .select("id, status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (matchResult.error || matchResult.data?.status !== "expired") return "retryable";

  const paymentResult = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("service_request_claim_id", claim.id)
    .in("status", ["pending", "authorized", "paid", "released"]);
  if (paymentResult.error) return "retryable";
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  if (payments.some((row) => row.status === "paid")) return "invariant";
  const payment = payments.find((row) => row.status === "released")
    ?? payments.find((row) => row.status === "authorized")
    ?? payments.find((row) => row.status === "pending")
    ?? null;
  if (!payment || !canonicalAmount(payment.amount_cents) || payment.currency !== "eur") return "invariant";

  if (payment.status !== "released") {
    const releasedAt = new Date().toISOString();
    const transactionId = payment.stripe_payment_intent_id;
    const released = await supabase
      .from("request_offer_payments")
      .update({
        status: "released",
        released_at: releasedAt,
        ...(transactionId
          ? { stripe_payment_intent_id: transactionId, ...stripePaymentIntentAttribution(transactionId) }
          : {}),
        updated_at: releasedAt,
      })
      .eq("id", payment.id)
      .in("status", ["pending", "authorized"]);
    if (released.error) return "retryable";
  }

  const expiredAt = new Date().toISOString();
  const saved = await supabase
    .from("service_request_claims")
    .update({
      status: "expired",
      expired_at: expiredAt,
      release_reason: CONFIRMATION_EXPIRED_RELEASE_REASON,
      updated_at: expiredAt,
    })
    .eq("id", claim.id)
    .eq("status", "reserved")
    .is("client_confirmed_at", null)
    .is("client_rejected_at", null);
  if (saved.error) return "retryable";

  const current = await supabase.from("service_request_claims").select(CLAIM_COLUMNS).eq("id", claim.id).maybeSingle();
  if (current.error || !current.data) return "retryable";
  const after = current.data as ClaimRow;
  if (
    after.status !== "expired" ||
    after.release_reason !== CONFIRMATION_EXPIRED_RELEASE_REASON ||
    !after.expired_at ||
    after.released_at ||
    after.client_confirmed_at ||
    after.client_rejected_at
  ) {
    return "retryable";
  }
  const notices = await cancelConfirmationNotices(supabase, after.id);
  return notices ? "expired" : "retryable";
}

export async function reconcileExpiredServiceRequestConfirmations(input: {
  supabase: SupabaseClient;
  stripe?: ServiceRequestExpiryStripe | null;
  now?: Date;
  limit?: number;
}): Promise<ConfirmationExpiryBatch> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? CONFIRMATION_EXPIRY_BATCH_LIMIT;
  const candidates = await input.supabase
    .from("service_request_claims")
    .select("id")
    .eq("status", "reserved")
    .eq("payment_rail", "stripe")
    .is("client_confirmed_at", null)
    .is("client_rejected_at", null)
    .not("confirmation_expires_at", "is", null)
    .lte("confirmation_expires_at", now.toISOString())
    .order("confirmation_expires_at", { ascending: true })
    .limit(limit);
  if (candidates.error) throw candidates.error;
  const rows = (candidates.data ?? []) as Array<{ id?: string }>;
  const counts: ConfirmationExpiryBatch = {
    examined: 0,
    expired: 0,
    skipped: 0,
    retryable: 0,
    invariant: 0,
  };
  for (const row of rows) {
    if (!row.id) continue;
    counts.examined += 1;
    try {
      const result = await expireServiceRequestConfirmation({
        supabase: input.supabase,
        claimId: row.id,
        stripe: input.stripe,
        now,
      });
      counts[result] += 1;
    } catch (error) {
      counts.retryable += 1;
      console.error("[billing/service-request-expiry] candidate failed", {
        name: error instanceof Error ? error.name : "Error",
      });
    }
  }
  return counts;
}

async function inspectUncapturedAuthorization(
  stripe: ServiceRequestExpiryStripe,
  payment: PaymentRow,
  claim: ClaimRow,
): Promise<{ ok: true } | { ok: false; error: "invariant" | "retryable" }> {
  if (!payment.stripe_payment_intent_id) return { ok: false, error: "invariant" };
  let intent: ReleaseIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  } catch (error) {
    console.error("[billing/service-request-expiry] retrieve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }
  return intentMatches(intent, payment, claim);
}

async function cancelUncapturedAuthorization(
  stripe: ServiceRequestExpiryStripe,
  payment: PaymentRow,
  claim: ClaimRow,
): Promise<{ ok: true } | { ok: false; error: "invariant" | "retryable" }> {
  if (!payment.stripe_payment_intent_id) return { ok: false, error: "invariant" };
  let intent: ReleaseIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  } catch (error) {
    console.error("[billing/service-request-expiry] retrieve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }
  const matched = intentMatches(intent, payment, claim);
  if (!matched.ok) return matched;
  if (intent.status === "canceled") return { ok: true };
  if (intent.status === "succeeded") return { ok: false, error: "invariant" };
  if (!CANCELABLE_INTENT_STATUSES.has(intent.status)) return { ok: false, error: "retryable" };
  try {
    const canceled = await stripe.paymentIntents.cancel(
      intent.id,
      { cancellation_reason: "abandoned" },
      { idempotencyKey: serviceRequestExpiryIdempotencyKey(payment.id) },
    );
    if (canceled.id !== intent.id || canceled.status !== "canceled") return { ok: false, error: "retryable" };
    return { ok: true };
  } catch (error) {
    console.error("[billing/service-request-expiry] cancel failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    try {
      const again = await stripe.paymentIntents.retrieve(intent.id);
      if (again.status === "canceled") return { ok: true };
      if (again.status === "succeeded") return { ok: false, error: "invariant" };
    } catch {
      return { ok: false, error: "retryable" };
    }
    return { ok: false, error: "retryable" };
  }
}

function intentMatches(
  intent: ReleaseIntent,
  payment: PaymentRow,
  claim: ClaimRow,
): { ok: true } | { ok: false; error: "invariant" | "retryable" } {
  const metadata = intent.metadata ?? {};
  if (
    intent.id !== payment.stripe_payment_intent_id ||
    intent.amount !== payment.amount_cents ||
    intent.currency.toLowerCase() !== "eur" ||
    metadata.purpose !== SERVICE_REQUEST_AUTHORIZATION_PURPOSE ||
    metadata.payment_id !== payment.id ||
    metadata.offer_id !== payment.offer_id ||
    metadata.claim_id !== claim.id ||
    metadata.specialist_id !== claim.specialist_id
  ) {
    return { ok: false, error: "invariant" };
  }
  if (intent.status === "succeeded") return { ok: false, error: "invariant" };
  return { ok: true };
}

async function cancelConfirmationNotices(supabase: SupabaseClient, claimId: string): Promise<boolean> {
  const inbox = await supabase
    .from("inbox_items")
    .select("id")
    .eq("dedupe_key", connectionConfirmationInboxKey(claimId))
    .maybeSingle();
  if (inbox.error) return false;
  if (!inbox.data?.id) return true;
  const updated = await supabase
    .from("notification_outbox")
    .update({
      status: "cancelled",
      last_error_code: CONFIRMATION_EXPIRED_RELEASE_REASON,
      updated_at: new Date().toISOString(),
    })
    .eq("inbox_item_id", inbox.data.id)
    .in("status", ["pending", "retryable"]);
  return !updated.error;
}
