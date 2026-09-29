/**
 * Access Pricing v1 for exclusive service-request access.
 * The price depends only on an explicit client budget. It is not a commission
 * on the later service, and it does not read specialist, category, or shadow rules.
 *
 * Budget text is interpreted by the shared request parser. This file does not
 * keep a second copy.
 */

import {
  normalizeExplicitClientBudget,
  type ExplicitClientBudget,
} from "@/lib/serviceRequests/clientBudget";

export { normalizeExplicitClientBudget, type ExplicitClientBudget };

const FLOOR_CENTS = 2500;
const CAP_CENTS = 25000;
const FIVE_EUROS_CENTS = 500;
const FIRST_TIER_CENTS = 25000;
const SECOND_TIER_CENTS = 100000;
const SECOND_TIER_RAW_CENTS = 6250;

export type ServiceRequestAccessPrice = {
  priceCents: number;
  currency: "eur";
  estimatedServiceValueMinCents: number | null;
  estimatedServiceValueMaxCents: number | null;
  maxBuyersSnapshot: 1;
};

/** Nearest EUR 5. A remainder of exactly EUR 2.50 rounds up. */
export function roundUpToNearestFiveEuros(cents: number): number {
  const remainder = cents % FIVE_EUROS_CENTS;
  if (remainder === 0) return cents;
  const down = cents - remainder;
  return remainder >= FIVE_EUROS_CENTS / 2 ? down + FIVE_EUROS_CENTS : down;
}

/** Integer-cent access price. Null basis uses the EUR 25 floor. */
export function serviceRequestAccessPriceCents(basisCents: number | null): number {
  let raw = FLOOR_CENTS;
  if (basisCents != null && basisCents > FIRST_TIER_CENTS) {
    if (basisCents <= SECOND_TIER_CENTS) {
      raw = FLOOR_CENTS + Math.floor(((basisCents - FIRST_TIER_CENTS) * 5) / 100);
    } else {
      raw = SECOND_TIER_RAW_CENTS + Math.floor(((basisCents - SECOND_TIER_CENTS) * 2) / 100);
    }
  }
  const rounded = roundUpToNearestFiveEuros(raw);
  return rounded > CAP_CENTS ? CAP_CENTS : rounded;
}

export function resolveServiceRequestAccessPrice(
  clientBudgetText: string | null | undefined,
): ServiceRequestAccessPrice {
  const budget = normalizeExplicitClientBudget(clientBudgetText);
  return {
    priceCents: serviceRequestAccessPriceCents(budget?.basisCents ?? null),
    currency: "eur",
    estimatedServiceValueMinCents: budget?.minCents ?? null,
    estimatedServiceValueMaxCents: budget?.maxCents ?? null,
    maxBuyersSnapshot: 1,
  };
}

/** Confirmed reconciliation ceiling. Same formula, exact amount as both bounds. */
export function resolveAcceptedCeilingAccessPrice(acceptedCents: number): ServiceRequestAccessPrice {
  return {
    priceCents: serviceRequestAccessPriceCents(acceptedCents),
    currency: "eur",
    estimatedServiceValueMinCents: acceptedCents,
    estimatedServiceValueMaxCents: acceptedCents,
    maxBuyersSnapshot: 1,
  };
}
