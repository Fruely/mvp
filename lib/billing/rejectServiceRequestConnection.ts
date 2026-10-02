import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { SERVICE_REQUEST_AUTHORIZATION_PURPOSE } from "@/lib/billing/createServiceRequestAuthorization";
import { stripePaymentIntentAttribution } from "@/lib/billing/requestOfferPaymentProvider";
import { paymentProvesStripeRail } from "@/lib/billing/serviceRequestPaymentRail";
import { CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS } from "@/lib/leadEngine/serviceRequestAccessPricing";
import { connectionConfirmationInboxKey } from "@/lib/selection/policy";

/**
 * The owning client rejects one reserved specialist before connection.
 * The body is not an input. This releases an uncaptured Stripe authorization.
 * It does not capture, refund, grant access, select a specialist, or rematch.
 */
export const CLIENT_REJECTION_RELEASE_REASON = "client_rejected";

export function serviceRequestReleaseIdempotencyKey(paymentId: string): string {
  return `service-request-release:${paymentId}`;
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
  metadata?: Record<string, string> | null;
};

export type ServiceRequestReleaseStripe = {
  paymentIntents: {
    retrieve: (id: string) => Promise<ReleaseIntent>;
    cancel: (
      id: string,
      params: { cancellation_reason: "requested_by_customer" },
      options: { idempotencyKey: string },
    ) => Promise<ReleaseIntent>;
  };
};

export type RejectServiceRequestConnectionResult =
  | { ok: true; state: "released" }
  | {
      ok: false;
      error: "not_found" | "not_claimable" | "invariant" | "payments_unavailable" | "retryable";
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
  payment_rail: string | null;
  release_reason: string | null;
  released_at: string | null;
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
  "id, status, specialist_id, service_request_id, match_id, request_offer_id, client_confirmed_at, client_rejected_at, payment_rail, release_reason, released_at, confirmation_expires_at";

const PAYMENT_COLUMNS =
  "id, offer_id, specialist_id, service_request_claim_id, amount_cents, currency, status, stripe_payment_intent_id, provider";

function canonicalAmount(value: unknown): boolean {
  return value === CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS;
}

function decisionLost(claim: { client_confirmed_at?: string | null; status?: string }): boolean {
  return claim.status === "completed" || (typeof claim.client_confirmed_at === "string" && claim.client_confirmed_at.length > 0);
}

export async function finalizeClientRejectedConnection(
  supabase: SupabaseClient,
  claimId: string,
): Promise<"success" | "retryable_failure" | "validation_failed"> {
  const claimResult = await supabase.from("service_request_claims").select(CLAIM_COLUMNS).eq("id", claimId).maybeSingle();
  if (claimResult.error || !claimResult.data?.id) return "retryable_failure";
  const claim = claimResult.data as ClaimRow;
  if (!claim.client_rejected_at || claim.client_confirmed_at) return "validation_failed";
  if (claim.status === "completed") return "validation_failed";
  if (claim.status === "released" && claim.release_reason !== CLIENT_REJECTION_RELEASE_REASON) {
    return "validation_failed";
  }

  const paymentResult = await supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("service_request_claim_id", claim.id)
    .in("status", ["pending", "authorized", "paid", "released"]);
  if (paymentResult.error) return "retryable_failure";
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  if (payments.some((row) => row.status === "paid")) return "validation_failed";
  const payment = payments.find((row) => row.status === "released")
    ?? payments.find((row) => row.status === "authorized")
    ?? payments.find((row) => row.status === "pending")
    ?? null;
  if (!payment || !canonicalAmount(payment.amount_cents) || payment.currency !== "eur") {
    return "validation_failed";
  }

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
    if (released.error) return "retryable_failure";
  }

  const closed = await closeRejectedMatch(supabase, claim);
  if (closed !== "ready") return closed;

  if (claim.status !== "released") {
    const releasedAt = new Date().toISOString();
    const saved = await supabase
      .from("service_request_claims")
      .update({
        status: "released",
        released_at: releasedAt,
        release_reason: CLIENT_REJECTION_RELEASE_REASON,
        updated_at: releasedAt,
      })
      .eq("id", claim.id)
      .eq("status", "reserved")
      .is("client_confirmed_at", null)
      .not("client_rejected_at", "is", null);
    if (saved.error) return "retryable_failure";
  }

  const current = await supabase.from("service_request_claims").select(CLAIM_COLUMNS).eq("id", claim.id).maybeSingle();
  if (current.error || !current.data) return "retryable_failure";
  const after = current.data as ClaimRow;
  if (
    after.status !== "released" ||
    after.release_reason !== CLIENT_REJECTION_RELEASE_REASON ||
    !after.client_rejected_at ||
    after.client_confirmed_at
  ) {
    return "retryable_failure";
  }

  const notices = await cancelConfirmationNotices(supabase, after.id);
  if (!notices) return "retryable_failure";
  return "success";
}

/**
 * Closes the rejected match before the claim stops being the live owner.
 * Reservation accepts only an active match, so `not_selected` must be stored
 * first. A failed close leaves the claim reserved.
 */
async function closeRejectedMatch(
  supabase: SupabaseClient,
  claim: ClaimRow,
): Promise<"ready" | "retryable_failure" | "validation_failed"> {
  if (!claim.match_id) return "retryable_failure";
  const matchResult = await supabase
    .from("service_request_matches")
    .select("id, status, service_request_id, specialist_id")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (matchResult.error || !matchResult.data?.id) return "retryable_failure";
  const match = matchResult.data as {
    status?: string;
    service_request_id?: string;
    specialist_id?: string;
  };
  if (match.service_request_id !== claim.service_request_id || match.specialist_id !== claim.specialist_id) {
    return "validation_failed";
  }
  if (match.status === "selected") return "validation_failed";
  if (match.status === "not_selected" || match.status === "declined" || match.status === "expired") {
    return "ready";
  }
  if (match.status !== "active" && match.status !== "interested") return "retryable_failure";

  const marked = await supabase
    .from("service_request_matches")
    .update({ status: "not_selected", updated_at: new Date().toISOString() })
    .eq("id", claim.match_id)
    .in("status", ["active", "interested"]);
  if (marked.error) return "retryable_failure";
  const reread = await supabase
    .from("service_request_matches")
    .select("status")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (reread.error) return "retryable_failure";
  const status = reread.data?.status;
  if (status === "not_selected" || status === "declined" || status === "expired") return "ready";
  return "retryable_failure";
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
      last_error_code: CLIENT_REJECTION_RELEASE_REASON,
      updated_at: new Date().toISOString(),
    })
    .eq("inbox_item_id", inbox.data.id)
    .in("status", ["pending", "retryable"]);
  return !updated.error;
}

async function establishRejection(
  supabase: SupabaseClient,
  claim: ClaimRow,
): Promise<{ ok: true; claim: ClaimRow } | { ok: false; error: "not_claimable" | "retryable" }> {
  if (claim.client_rejected_at) return { ok: true, claim };
  const rejectedAt = new Date().toISOString();
  const saved = await supabase
    .from("service_request_claims")
    .update({ client_rejected_at: rejectedAt, updated_at: rejectedAt })
    .eq("id", claim.id)
    .eq("status", "reserved")
    .is("client_confirmed_at", null)
    .is("client_rejected_at", null)
    .select("id");
  if (saved.error) {
    return { ok: false, error: saved.error.code === "23514" ? "not_claimable" : "retryable" };
  }
  const reread = await supabase.from("service_request_claims").select(CLAIM_COLUMNS).eq("id", claim.id).maybeSingle();
  if (reread.error || !reread.data) return { ok: false, error: "retryable" };
  const current = reread.data as ClaimRow;
  if (decisionLost(current)) return { ok: false, error: "not_claimable" };
  if (!current.client_rejected_at || current.status !== "reserved") return { ok: false, error: "retryable" };
  return { ok: true, claim: current };
}

async function inspectUncapturedAuthorization(
  stripe: ServiceRequestReleaseStripe,
  payment: PaymentRow,
  claim: ClaimRow,
): Promise<{ ok: true } | { ok: false; error: "invariant" | "retryable" }> {
  if (!payment.stripe_payment_intent_id) return { ok: false, error: "invariant" };
  let intent: ReleaseIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  } catch (error) {
    console.error("[billing/service-request-reject] retrieve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }
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
  if (intent.status === "canceled" || CANCELABLE_INTENT_STATUSES.has(intent.status)) return { ok: true };
  return { ok: false, error: "retryable" };
}

async function cancelUncapturedAuthorization(
  stripe: ServiceRequestReleaseStripe,
  payment: PaymentRow,
  claim: ClaimRow,
): Promise<{ ok: true } | { ok: false; error: "invariant" | "retryable" | "payments_unavailable" }> {
  if (!payment.stripe_payment_intent_id) return { ok: false, error: "invariant" };
  let intent: ReleaseIntent;
  try {
    intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
  } catch (error) {
    console.error("[billing/service-request-reject] retrieve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return { ok: false, error: "retryable" };
  }
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
  if (intent.status === "canceled") return { ok: true };
  if (intent.status === "succeeded") return { ok: false, error: "invariant" };
  if (!CANCELABLE_INTENT_STATUSES.has(intent.status)) return { ok: false, error: "retryable" };
  try {
    const canceled = await stripe.paymentIntents.cancel(
      intent.id,
      { cancellation_reason: "requested_by_customer" },
      { idempotencyKey: serviceRequestReleaseIdempotencyKey(payment.id) },
    );
    if (canceled.id !== intent.id || canceled.status !== "canceled") return { ok: false, error: "retryable" };
    return { ok: true };
  } catch (error) {
    console.error("[billing/service-request-reject] cancel failed", {
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

export async function rejectServiceRequestConnection(input: {
  supabase: SupabaseClient;
  publicId: string;
  clientUserId: string;
  env?: NodeJS.ProcessEnv;
  stripe?: ServiceRequestReleaseStripe | null;
}): Promise<RejectServiceRequestConnectionResult> {
  const publicId = input.publicId.trim();
  if (!publicId || publicId.length > 80 || !/^[A-Za-z0-9_-]+$/.test(publicId)) {
    return { ok: false, error: "not_found" };
  }
  if (!input.clientUserId) return { ok: false, error: "not_found" };

  const requestResult = await input.supabase
    .from("service_requests")
    .select("id, selected_specialist_id, client_user_id")
    .eq("public_id", publicId)
    .eq("client_user_id", input.clientUserId)
    .maybeSingle();
  if (requestResult.error) return { ok: false, error: "retryable" };
  const request = requestResult.data as {
    id?: string;
    selected_specialist_id?: string | null;
    client_user_id?: string | null;
  } | null;
  if (!request?.id || request.client_user_id !== input.clientUserId) return { ok: false, error: "not_found" };
  if (request.selected_specialist_id) return { ok: false, error: "not_claimable" };

  const reservedResult = await input.supabase
    .from("service_request_claims")
    .select(CLAIM_COLUMNS)
    .eq("service_request_id", request.id)
    .eq("status", "reserved")
    .maybeSingle();
  if (reservedResult.error) return { ok: false, error: "retryable" };
  let claim = reservedResult.data as ClaimRow | null;
  if (!claim) {
    const prior = await input.supabase
      .from("service_request_claims")
      .select(CLAIM_COLUMNS)
      .eq("service_request_id", request.id)
      .eq("status", "released")
      .eq("release_reason", CLIENT_REJECTION_RELEASE_REASON)
      .not("client_rejected_at", "is", null);
    if (prior.error) return { ok: false, error: "retryable" };
    const rows = (prior.data ?? []) as ClaimRow[];
    const completed = rows
      .filter((row) => row.client_rejected_at && !row.client_confirmed_at)
      .sort((left, right) => String(right.client_rejected_at).localeCompare(String(left.client_rejected_at)))[0];
    if (!completed) return { ok: false, error: "not_claimable" };
    const finalized = await finalizeClientRejectedConnection(input.supabase, completed.id);
    if (finalized === "success") return { ok: true, state: "released" };
    if (finalized === "validation_failed") return { ok: false, error: "not_claimable" };
    return { ok: false, error: "retryable" };
  }
  if (decisionLost(claim) || claim.service_request_id !== request.id || !claim.request_offer_id || !claim.match_id) {
    return { ok: false, error: "not_claimable" };
  }
  if (claim.payment_rail === "store") return { ok: false, error: "not_claimable" };

  const paymentResult = await input.supabase
    .from("request_offer_payments")
    .select(PAYMENT_COLUMNS)
    .eq("service_request_claim_id", claim.id)
    .in("status", ["pending", "authorized", "paid", "released"]);
  if (paymentResult.error) return { ok: false, error: "retryable" };
  const payments = (paymentResult.data ?? []) as PaymentRow[];
  if (payments.some((row) => row.status === "paid")) return { ok: false, error: "not_claimable" };
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
    return { ok: false, error: "invariant" };
  }

  if (!claim.client_rejected_at && payment.status !== "released") {
    const stripe = input.stripe === undefined ? (getStripeClient() as ServiceRequestReleaseStripe | null) : input.stripe;
    if (!stripe) return { ok: false, error: "payments_unavailable" };
    const inspected = await inspectUncapturedAuthorization(stripe, payment, claim);
    if (!inspected.ok) return inspected;
  }

  const decided = await establishRejection(input.supabase, claim);
  if (!decided.ok) return decided;
  claim = decided.claim;

  if (payment.status !== "released") {
    const stripe = input.stripe === undefined ? (getStripeClient() as ServiceRequestReleaseStripe | null) : input.stripe;
    if (!stripe) return { ok: false, error: "retryable" };
    const canceled = await cancelUncapturedAuthorization(stripe, payment, claim);
    if (!canceled.ok) return canceled.error === "payments_unavailable"
      ? { ok: false, error: "retryable" }
      : canceled;
  }

  const finalized = await finalizeClientRejectedConnection(input.supabase, claim.id);
  if (finalized === "success") return { ok: true, state: "released" };
  if (finalized === "validation_failed") return { ok: false, error: "invariant" };
  return { ok: false, error: "retryable" };
}
