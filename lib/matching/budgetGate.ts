import {
  effectiveClientMaximumCents,
  nonNegativeIntegerCents,
} from "@/lib/serviceRequests/clientBudget";

export type ServiceEconomicFloor = {
  minimumOrderCents: number | null;
  currency: string | null;
};

export type OtherwiseEligibleCandidate = {
  id: string;
  services: readonly ServiceEconomicFloor[];
};

export type BudgetPartition = {
  otherwiseEligibleIds: string[];
  economicallyEligibleIds: string[];
  budgetBlocked: { id: string; floorCents: number }[];
};

export { effectiveClientMaximumCents, nonNegativeIntegerCents };

function isEurCurrency(value: string | null): boolean {
  if (value == null || value.trim() === "") return true;
  return value.trim().toLowerCase() === "eur";
}

/**
 * Lowest explicit EUR minimum among the specialist's relevant services.
 * Null means the minimum is unknown or open, so budget must not reject them.
 * A service with no minimum, a non-EUR currency, or no service row fails open.
 */
export function specialistEconomicFloorCents(services: readonly ServiceEconomicFloor[]): number | null {
  if (services.length === 0) return null;
  let floor: number | null = null;
  for (const service of services) {
    if (!isEurCurrency(service.currency)) return null;
    const minimum = service.minimumOrderCents;
    if (minimum == null || !Number.isInteger(minimum) || minimum < 0) return null;
    floor = floor == null ? minimum : Math.min(floor, minimum);
  }
  return floor;
}

/** Candidates passed here have already passed non-economic eligibility. */
export function partitionEconomicEligibility(input: {
  clientMaxCents: number | null;
  candidates: readonly OtherwiseEligibleCandidate[];
}): BudgetPartition {
  const otherwiseEligibleIds: string[] = [];
  const economicallyEligibleIds: string[] = [];
  const budgetBlocked: { id: string; floorCents: number }[] = [];
  for (const candidate of input.candidates) {
    otherwiseEligibleIds.push(candidate.id);
    const floor = specialistEconomicFloorCents(candidate.services);
    if (input.clientMaxCents != null && floor != null && input.clientMaxCents < floor) {
      budgetBlocked.push({ id: candidate.id, floorCents: floor });
    } else {
      economicallyEligibleIds.push(candidate.id);
    }
  }
  return { otherwiseEligibleIds, economicallyEligibleIds, budgetBlocked };
}

/** Lowest blocked minimum. Null when recovery must not be offered. */
export function reconciliationFloorCents(
  partition: BudgetPartition,
  clientMaxCents: number | null,
): number | null {
  if (clientMaxCents == null) return null;
  if (partition.otherwiseEligibleIds.length === 0) return null;
  if (partition.economicallyEligibleIds.length > 0) return null;
  if (partition.budgetBlocked.length !== partition.otherwiseEligibleIds.length) return null;
  let floor: number | null = null;
  for (const blocked of partition.budgetBlocked) {
    floor = floor == null ? blocked.floorCents : Math.min(floor, blocked.floorCents);
  }
  return floor;
}

/**
 * A decline applies only to the same unresolved threshold.
 * A different floor must ask again.
 */
export function shouldKeepBudgetDecline(input: {
  existingRequiredCents: number | null;
  existingDeclinedAt: string | null;
  nextFloorCents: number;
}): boolean {
  return input.existingDeclinedAt != null && input.existingRequiredCents === input.nextFloorCents;
}
