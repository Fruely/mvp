/**
 * Canonical matched service-request connection fee.
 *
 * MP1-S4 charges EUR 25.00 for a confirmed connection. The client's budget is
 * request and matching information. It is snapshotted as estimated service
 * value and does not set this fee. This is the rollout price, not a permanent
 * pricing strategy.
 */

import {
  normalizeExplicitClientBudget,
  type ExplicitClientBudget,
} from "@/lib/serviceRequests/clientBudget";

export { normalizeExplicitClientBudget, type ExplicitClientBudget };

/** Server-authoritative MP1-S4 confirmed-connection fee. */
export const CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS = 2500;

export type ServiceRequestAccessPrice = {
  priceCents: number;
  currency: "eur";
  estimatedServiceValueMinCents: number | null;
  estimatedServiceValueMaxCents: number | null;
  maxBuyersSnapshot: 1;
};

function fixedConnectionFee(budget: ExplicitClientBudget | null): ServiceRequestAccessPrice {
  return {
    priceCents: CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS,
    currency: "eur",
    estimatedServiceValueMinCents: budget?.minCents ?? null,
    estimatedServiceValueMaxCents: budget?.maxCents ?? null,
    maxBuyersSnapshot: 1,
  };
}

export function resolveServiceRequestAccessPrice(
  clientBudgetText: string | null | undefined,
): ServiceRequestAccessPrice {
  return fixedConnectionFee(normalizeExplicitClientBudget(clientBudgetText));
}

/** Confirmed reconciliation ceiling. The connection fee stays fixed. */
export function resolveAcceptedCeilingAccessPrice(acceptedCents: number): ServiceRequestAccessPrice {
  return fixedConnectionFee({
    basisCents: acceptedCents,
    minCents: acceptedCents,
    maxCents: acceptedCents,
  });
}
