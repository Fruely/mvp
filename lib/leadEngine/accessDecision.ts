import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";

/**
 * Direct-lead commercial access decision.
 *
 * This is the entitlement to realize or keep contact access. It is not a PII
 * redaction switch: visible email/phone stay gated on `contact_unlocked_at`
 * in `mapRowToDashboardLead`. Query params and client flags are not facts.
 */
export const LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENV =
  "LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENABLED";

export const DIRECT_PPL_PENDING_PROCESSING_WINDOW_MS = 30 * 60 * 1000;

export function directPplPendingCutoffIso(now = new Date()): string {
  return new Date(now.getTime() - DIRECT_PPL_PENDING_PROCESSING_WINDOW_MS).toISOString();
}

export type LeadAccessUnlockSource =
  | "subscription"
  | "payment"
  | "manual_grant"
  | "existing_unlock";

export type DirectLeadLockedReason =
  | "direct_ppl_disabled"
  | "subscription_required"
  | "no_purchasable_offer";

export type LeadAccessDecision =
  | {
      state: "unlocked";
      source: LeadAccessUnlockSource;
    }
  | {
      state: "locked";
      canPurchase: true;
      priceCents: number;
      currency: string;
      offerId: string;
    }
  | {
      state: "locked";
      canPurchase: false;
      reason: DirectLeadLockedReason;
      offerId?: string;
      priceCents?: number;
      currency?: string;
    }
  | {
      state: "processing";
      offerId: string;
    }
  | {
      state: "unavailable";
      reason: string;
    };

export type DirectLeadAccessOfferSnapshot = {
  id: string;
  status: string;
  priceCents: number | null;
  currency: string | null;
  shadowPriceCents: number | null;
};

export type DirectLeadAccessFacts = {
  leadId: string | null;
  specialistId: string | null;
  planStatus: string | null | undefined;
  contactsUnlocked: boolean;
  paidEntitlement: boolean;
  paymentProcessing: boolean;
  offer: DirectLeadAccessOfferSnapshot | null;
  directPplCheckoutEnabled: boolean;
};

const CLOSED_OFFER_STATUSES = new Set(["declined", "expired"]);

export function isDirectLeadPplCheckoutEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENV] === "true";
}

export function canRealizeDirectLeadContactUnlock(
  decision: LeadAccessDecision,
): boolean {
  return decision.state === "unlocked";
}

function positiveCents(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : null;
}

function offerCurrency(offer: DirectLeadAccessOfferSnapshot | null): string {
  const currency = offer?.currency?.trim();
  return currency ? currency : "eur";
}

/**
 * Server-authoritative purchase price for a direct offer.
 * Live `price_cents` wins when present; otherwise the observational shadow snapshot.
 * Reading the shadow price is not an entitlement and must not write live price_cents.
 */
export function resolveDirectLeadPurchasePrice(
  offer: DirectLeadAccessOfferSnapshot | null,
): { priceCents: number; currency: string; source: "live" | "shadow" } | null {
  if (!offer) return null;
  const currency = offerCurrency(offer);
  const live = positiveCents(offer.priceCents);
  if (live != null) {
    return { priceCents: live, currency, source: "live" };
  }
  const shadow = positiveCents(offer.shadowPriceCents);
  if (shadow != null) {
    return { priceCents: shadow, currency, source: "shadow" };
  }
  return null;
}

export function mapDirectLeadOfferRow(
  row: Record<string, unknown> | null | undefined,
): DirectLeadAccessOfferSnapshot | null {
  if (!row || typeof row.id !== "string" || !row.id.trim()) {
    return null;
  }

  return {
    id: row.id,
    status: typeof row.status === "string" ? row.status : "",
    priceCents: positiveCents(row.price_cents),
    currency: typeof row.currency === "string" ? row.currency : "eur",
    shadowPriceCents: positiveCents(row.shadow_price_cents),
  };
}

function isClosedOffer(offer: DirectLeadAccessOfferSnapshot | null): boolean {
  if (!offer) return false;
  return CLOSED_OFFER_STATUSES.has(offer.status);
}

function sanitizeFacts(input: DirectLeadAccessFacts): DirectLeadAccessFacts {
  return {
    leadId:
      typeof input.leadId === "string" && input.leadId.trim()
        ? input.leadId
        : null,
    specialistId:
      typeof input.specialistId === "string" && input.specialistId.trim()
        ? input.specialistId
        : null,
    planStatus: input.planStatus,
    contactsUnlocked: input.contactsUnlocked === true,
    paidEntitlement: input.paidEntitlement === true,
    paymentProcessing: input.paymentProcessing === true,
    offer:
      input.offer && typeof input.offer.id === "string" && input.offer.id.trim()
        ? input.offer
        : null,
    directPplCheckoutEnabled: input.directPplCheckoutEnabled === true,
  };
}

function persistedUnlockSource(facts: DirectLeadAccessFacts): LeadAccessUnlockSource {
  if (facts.paidEntitlement) return "payment";
  return "existing_unlock";
}

function lockedWithoutCheckout(
  facts: DirectLeadAccessFacts,
  reason: DirectLeadLockedReason,
): LeadAccessDecision {
  const purchase = resolveDirectLeadPurchasePrice(facts.offer);
  return {
    state: "locked",
    canPurchase: false,
    reason,
    ...(facts.offer ? { offerId: facts.offer.id } : {}),
    ...(purchase
      ? { priceCents: purchase.priceCents, currency: purchase.currency }
      : {}),
  };
}

export function resolveDirectLeadAccessDecision(
  input: DirectLeadAccessFacts,
): LeadAccessDecision {
  const facts = sanitizeFacts(input);

  if (!facts.leadId || !facts.specialistId) {
    return { state: "unavailable", reason: "missing_identity" };
  }

  if (facts.contactsUnlocked) {
    return { state: "unlocked", source: persistedUnlockSource(facts) };
  }

  // Paid grant, then subscription, then processing. Current plan status is not a
  // historical unlock source.
  if (facts.paidEntitlement) {
    return { state: "unlocked", source: "payment" };
  }

  if (canUnlockLeadContacts(facts.planStatus)) {
    return { state: "unlocked", source: "subscription" };
  }

  if (facts.paymentProcessing) {
    return {
      state: "processing",
      offerId: facts.offer?.id ?? facts.leadId,
    };
  }

  if (isClosedOffer(facts.offer)) {
    return { state: "unavailable", reason: "offer_unavailable" };
  }

  const purchase = resolveDirectLeadPurchasePrice(facts.offer);

  if (facts.directPplCheckoutEnabled && purchase && facts.offer) {
    return {
      state: "locked",
      canPurchase: true,
      priceCents: purchase.priceCents,
      currency: purchase.currency,
      offerId: facts.offer.id,
    };
  }

  if (facts.directPplCheckoutEnabled) {
    return lockedWithoutCheckout(facts, "no_purchasable_offer");
  }

  if (purchase && facts.offer) {
    return lockedWithoutCheckout(facts, "direct_ppl_disabled");
  }

  return lockedWithoutCheckout(facts, "subscription_required");
}
