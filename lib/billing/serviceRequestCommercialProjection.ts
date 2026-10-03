import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTIVE_REQUEST_OFFER_PAYMENT_STATUSES,
  derivePaymentRequired,
  type PaymentRequiredGrant,
  type PaymentRequiredOffer,
  type PaymentRequiredPayment,
} from "@/lib/billing/serviceRequestPaidAccessState";
import { isCanonicalMatchedServiceRequestOffer } from "@/lib/billing/recordServiceRequestClientConfirmation";
import { CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS } from "@/lib/leadEngine/serviceRequestAccessPricing";

/**
 * Read-only specialist continuation projection.
 * Derived from the current claim, payment, request, and conversation.
 * It is not persisted and it is not the store `payment_required` boolean.
 */
export const COMMERCIAL_CONNECTION_STATES = [
  "request_presented",
  "payment_required",
  "authorizing",
  "authorized",
  "client_confirmed",
  "capturing",
  "connected",
  "declined",
  "expired",
] as const;

export type CommercialConnectionState = (typeof COMMERCIAL_CONNECTION_STATES)[number];

export type CommercialConnectionProjection = {
  state: CommercialConnectionState;
  claim_id: string | null;
  payment_id: string | null;
  amount_cents: number | null;
  currency: "eur" | null;
  confirmation_expires_at: string | null;
};

export type CommercialClaimFact = {
  id: string;
  status: unknown;
  serviceRequestId: unknown;
  matchId: unknown;
  specialistId: unknown;
  requestOfferId: unknown;
  clientConfirmedAt: unknown;
  clientRejectedAt: unknown;
  confirmationExpiresAt: unknown;
  paymentRail: unknown;
  releaseReason: unknown;
};

export type CommercialPaymentFact = {
  id: string;
  claimId: string;
  offerId: unknown;
  specialistId: unknown;
  amountCents: unknown;
  currency: unknown;
  status: unknown;
};

export type CommercialPreviewItem = {
  matchId: string;
  requestId: string;
  selectedSpecialistId: string | null;
  conversationSpecialistId: string | null;
};

const LIVE_CLAIM_STATUSES = new Set(["reserved", "completed"]);
const ACTIVE_PAYMENT_STATUSES = new Set<string>(ACTIVE_REQUEST_OFFER_PAYMENT_STATUSES);

export function emptyCommercialConnection(): CommercialConnectionProjection {
  return {
    state: "request_presented",
    claim_id: null,
    payment_id: null,
    amount_cents: null,
    currency: null,
    confirmation_expires_at: null,
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canonicalMoney(payment: CommercialPaymentFact): boolean {
  return (
    payment.amountCents === CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS &&
    payment.currency === "eur"
  );
}

function moneyFields(payment: CommercialPaymentFact | null): {
  payment_id: string | null;
  amount_cents: number | null;
  currency: "eur" | null;
} {
  if (!payment || !canonicalMoney(payment)) {
    return { payment_id: null, amount_cents: null, currency: null };
  }
  return {
    payment_id: payment.id,
    amount_cents: CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS,
    currency: "eur",
  };
}

function projection(
  state: CommercialConnectionState,
  claimId: string | null,
  payment: CommercialPaymentFact | null,
  deadline: string | null,
): CommercialConnectionProjection {
  return {
    state,
    claim_id: claimId,
    confirmation_expires_at: deadline,
    ...moneyFields(payment),
  };
}

/**
 * One deterministic projection for one owned match.
 * A reserved or completed claim beats historical terminal rows.
 * More than one live claim, or more than one canonical terminal claim, fails closed.
 * A non-canonical amount is not rewritten to €25.
 */
export function deriveCommercialConnection(input: {
  requestId: string;
  matchId: string;
  specialistId: string;
  selectedSpecialistId: string | null;
  conversationSpecialistId: string | null;
  offers: readonly PaymentRequiredOffer[];
  claims: readonly CommercialClaimFact[];
  payments: readonly CommercialPaymentFact[];
}): CommercialConnectionProjection | null {
  const canonicalOfferIds = new Set(
    input.offers
      .filter((offer) => isCanonicalMatchedServiceRequestOffer(offerShape(offer), input.requestId, input.specialistId))
      .map((offer) => offer.id),
  );
  const owned = input.claims.filter(
    (claim) =>
      claim.matchId === input.matchId &&
      claim.specialistId === input.specialistId &&
      claim.serviceRequestId === input.requestId,
  );
  const live = owned.filter((claim) => typeof claim.status === "string" && LIVE_CLAIM_STATUSES.has(claim.status));
  if (live.length > 1 || canonicalOfferIds.size > 1) return null;
  if (live.length === 1) {
    const claim = live[0];
    if (typeof claim.requestOfferId !== "string" || !canonicalOfferIds.has(claim.requestOfferId)) return null;
    return projectLiveClaim(input, claim);
  }

  const related = owned.filter(
    (claim) => typeof claim.requestOfferId === "string" && canonicalOfferIds.has(claim.requestOfferId),
  );

  const terminals = related.filter((claim) => isCanonicalTerminal(claim));
  if (terminals.length !== 1) return emptyCommercialConnection();
  const terminal = terminals[0];
  const deadline = text(terminal.confirmationExpiresAt);
  if (terminal.status === "released" && terminal.releaseReason === "client_rejected") {
    return projection("declined", terminal.id, singleCanonicalPayment(input.payments, terminal), deadline);
  }
  if (terminal.status === "expired" && terminal.releaseReason === "confirmation_expired") {
    return projection("expired", terminal.id, singleCanonicalPayment(input.payments, terminal), deadline);
  }
  return emptyCommercialConnection();
}

function offerShape(offer: PaymentRequiredOffer) {
  return {
    request_kind: typeof offer.requestKind === "string" ? offer.requestKind : undefined,
    offer_reason: typeof offer.offerReason === "string" ? offer.offerReason : undefined,
    service_request_id: typeof offer.serviceRequestId === "string" ? offer.serviceRequestId : null,
    specialist_id: typeof offer.specialistId === "string" ? offer.specialistId : undefined,
    billing_model: typeof offer.billingModel === "string" ? offer.billingModel : undefined,
    price_cents: typeof offer.priceCents === "number" ? offer.priceCents : null,
    currency: typeof offer.currency === "string" ? offer.currency : undefined,
    idempotency_key: typeof offer.idempotencyKey === "string" ? offer.idempotencyKey : undefined,
  };
}

function isCanonicalTerminal(claim: CommercialClaimFact): boolean {
  if (claim.paymentRail === "store") return false;
  if (claim.status === "released" && claim.releaseReason === "client_rejected") return true;
  return claim.status === "expired" && claim.releaseReason === "confirmation_expired";
}

function paymentsFor(payments: readonly CommercialPaymentFact[], claim: CommercialClaimFact): CommercialPaymentFact[] {
  return payments.filter(
    (payment) =>
      payment.claimId === claim.id &&
      payment.offerId === claim.requestOfferId &&
      payment.specialistId === claim.specialistId,
  );
}

function singleCanonicalPayment(
  payments: readonly CommercialPaymentFact[],
  claim: CommercialClaimFact,
): CommercialPaymentFact | null {
  const canonical = paymentsFor(payments, claim).filter(canonicalMoney);
  return canonical.length === 1 ? canonical[0] : null;
}

function projectLiveClaim(
  input: {
    specialistId: string;
    selectedSpecialistId: string | null;
    conversationSpecialistId: string | null;
    payments: readonly CommercialPaymentFact[];
  },
  claim: CommercialClaimFact,
): CommercialConnectionProjection | null {
  if (claim.paymentRail === "store") {
    const paid = singleActivePayment(input.payments, claim);
    if (paid && isConnected(input, claim, paid)) {
      return projection("connected", claim.id, paid, text(claim.confirmationExpiresAt));
    }
    return null;
  }
  if (claim.paymentRail !== "stripe" && claim.paymentRail != null && claim.paymentRail !== "") {
    return null;
  }

  const activeOnClaim = input.payments.filter(
    (payment) => payment.claimId === claim.id && typeof payment.status === "string" && ACTIVE_PAYMENT_STATUSES.has(payment.status),
  );
  const active = paymentsFor(input.payments, claim).filter(
    (payment) => typeof payment.status === "string" && ACTIVE_PAYMENT_STATUSES.has(payment.status),
  );
  if (activeOnClaim.length !== active.length || active.length > 1) return null;
  const payment = active[0] ?? null;
  if (payment && !canonicalMoney(payment)) return null;

  const confirmed = text(claim.clientConfirmedAt);
  const rejected = text(claim.clientRejectedAt);
  const deadline = text(claim.confirmationExpiresAt);
  if (confirmed && rejected) return null;

  if (payment && isConnected(input, claim, payment)) {
    return projection("connected", claim.id, payment, deadline);
  }
  if (payment?.status === "paid") {
    if (confirmed) return projection("capturing", claim.id, payment, deadline);
    return null;
  }
  if (confirmed && claim.status === "reserved" && claim.paymentRail === "stripe" && payment) {
    return projection("client_confirmed", claim.id, payment, deadline);
  }
  if (rejected || confirmed || claim.status !== "reserved") return null;
  if (!payment) {
    if (claim.paymentRail != null && claim.paymentRail !== "" && claim.paymentRail !== "stripe") return null;
    return projection("payment_required", claim.id, null, null);
  }
  if (claim.paymentRail !== "stripe") return null;
  if (payment.status === "pending") return projection("authorizing", claim.id, payment, deadline);
  if (payment.status === "authorized") return projection("authorized", claim.id, payment, deadline);
  return null;
}

function singleActivePayment(
  payments: readonly CommercialPaymentFact[],
  claim: CommercialClaimFact,
): CommercialPaymentFact | null {
  const active = paymentsFor(payments, claim).filter(
    (payment) => typeof payment.status === "string" && ACTIVE_PAYMENT_STATUSES.has(payment.status) && canonicalMoney(payment),
  );
  return active.length === 1 ? active[0] : null;
}

function isConnected(
  input: { specialistId: string; selectedSpecialistId: string | null; conversationSpecialistId: string | null },
  claim: CommercialClaimFact,
  payment: CommercialPaymentFact,
): boolean {
  return (
    payment.status === "paid" &&
    claim.status === "completed" &&
    input.selectedSpecialistId === input.specialistId &&
    input.conversationSpecialistId === input.specialistId
  );
}

type PreviewRead = {
  paymentRequired: Map<string, boolean>;
  commercial: Map<string, CommercialConnectionProjection | null>;
};

function closedRead(items: readonly CommercialPreviewItem[]): PreviewRead {
  const paymentRequired = new Map<string, boolean>();
  const commercial = new Map<string, CommercialConnectionProjection | null>();
  for (const item of items) {
    paymentRequired.set(item.matchId, false);
    commercial.set(item.matchId, null);
  }
  return { paymentRequired, commercial };
}

function asRow(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function offerFact(row: Record<string, unknown>): PaymentRequiredOffer | null {
  if (typeof row.id !== "string" || !row.id) return null;
  return {
    id: row.id,
    requestKind: row.request_kind,
    offerReason: row.offer_reason,
    billingModel: row.billing_model,
    serviceRequestId: row.service_request_id,
    specialistId: row.specialist_id,
    currency: row.currency,
    priceCents: row.price_cents,
    idempotencyKey: row.idempotency_key,
  };
}

/**
 * One batch read for the preview boolean and the continuation projection.
 * Lookup failure fails closed. This function does not write.
 */
export async function loadSpecialistMatchPreviewFacts(
  supabase: SupabaseClient,
  specialistId: string,
  items: readonly CommercialPreviewItem[],
  offers: readonly Record<string, unknown>[],
): Promise<PreviewRead> {
  const result = closedRead(items);
  if (!items.length) return result;

  const claims = await supabase
    .from("service_request_claims")
    .select(
      "id, status, service_request_id, match_id, specialist_id, request_offer_id, client_confirmed_at, client_rejected_at, confirmation_expires_at, payment_rail, release_reason",
    )
    .eq("specialist_id", specialistId)
    .in(
      "match_id",
      items.map((item) => item.matchId),
    );
  if (claims.error || !Array.isArray(claims.data)) return result;
  const claimRows = (claims.data as unknown[]).map(asRow).filter((row): row is Record<string, unknown> => Boolean(row));
  const offerFacts = offers.map(offerFact).filter((offer): offer is PaymentRequiredOffer => Boolean(offer));

  let grantRows: PaymentRequiredGrant[] = [];
  const offerIds: string[] = [];
  for (const row of claimRows) {
    if (typeof row.request_offer_id === "string" && !offerIds.includes(row.request_offer_id)) {
      offerIds.push(row.request_offer_id);
    }
  }
  if (offerIds.length) {
    const grants = await supabase
      .from("request_offer_access_grants")
      .select("offer_id, specialist_id, revoked_at")
      .eq("specialist_id", specialistId)
      .in("offer_id", offerIds);
    if (grants.error || !Array.isArray(grants.data)) return result;
    grantRows = (grants.data as unknown[]).flatMap((value) => {
      const row = asRow(value);
      if (!row || typeof row.offer_id !== "string" || typeof row.specialist_id !== "string") return [];
      return [{ offerId: row.offer_id, specialistId: row.specialist_id, revokedAt: row.revoked_at }];
    });
  }

  const claimIds = claimRows.map((row) => row.id).filter((id): id is string => typeof id === "string");
  let paymentFacts: CommercialPaymentFact[] = [];
  let paymentRows: PaymentRequiredPayment[] = [];
  if (claimIds.length) {
    const payments = await supabase
      .from("request_offer_payments")
      .select("id, service_request_claim_id, offer_id, specialist_id, amount_cents, currency, status")
      .in("service_request_claim_id", claimIds);
    if (payments.error || !Array.isArray(payments.data)) return result;
    for (const value of payments.data as unknown[]) {
      const row = asRow(value);
      if (!row || typeof row.id !== "string" || typeof row.service_request_claim_id !== "string") continue;
      paymentRows.push({ claimId: row.service_request_claim_id, status: row.status });
      paymentFacts.push({
        id: row.id,
        claimId: row.service_request_claim_id,
        offerId: row.offer_id,
        specialistId: row.specialist_id,
        amountCents: row.amount_cents,
        currency: row.currency,
        status: row.status,
      });
    }
  }

  const claimsByMatch = new Map<string, CommercialClaimFact[]>();
  for (const row of claimRows) {
    if (typeof row.id !== "string" || typeof row.match_id !== "string") continue;
    const claim: CommercialClaimFact = {
      id: row.id,
      status: row.status,
      serviceRequestId: row.service_request_id,
      matchId: row.match_id,
      specialistId: row.specialist_id,
      requestOfferId: row.request_offer_id,
      clientConfirmedAt: row.client_confirmed_at,
      clientRejectedAt: row.client_rejected_at,
      confirmationExpiresAt: row.confirmation_expires_at,
      paymentRail: row.payment_rail,
      releaseReason: row.release_reason,
    };
    const current = claimsByMatch.get(claim.matchId as string) ?? [];
    current.push(claim);
    claimsByMatch.set(claim.matchId as string, current);
  }

  for (const item of items) {
    const matchClaims = claimsByMatch.get(item.matchId) ?? [];
    result.paymentRequired.set(
      item.matchId,
      matchClaims.some((claim) => {
        const offer = offerFacts.find((candidate) => candidate.id === claim.requestOfferId) ?? null;
        return derivePaymentRequired({
          requestId: item.requestId,
          matchId: item.matchId,
          specialistId,
          offer,
          claim: {
            id: claim.id,
            status: claim.status,
            serviceRequestId: claim.serviceRequestId,
            matchId: claim.matchId,
            specialistId: claim.specialistId,
            requestOfferId: claim.requestOfferId,
            clientConfirmedAt: claim.clientConfirmedAt,
          },
          grants: grantRows,
          payments: paymentRows,
        });
      }),
    );
    result.commercial.set(
      item.matchId,
      deriveCommercialConnection({
        requestId: item.requestId,
        matchId: item.matchId,
        specialistId,
        selectedSpecialistId: item.selectedSpecialistId,
        conversationSpecialistId: item.conversationSpecialistId,
        offers: offerFacts,
        claims: matchClaims,
        payments: paymentFacts,
      }),
    );
  }
  return result;
}
