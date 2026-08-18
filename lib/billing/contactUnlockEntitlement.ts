/**
 * Canonical specialist contact-unlock entitlement.
 *
 * Authority is `specialist_plan.plan_status` after lifecycle reconcile
 * (`active` → `grace` → `inactive`). Do not infer from Stripe, plan labels,
 * `is_visible`, or `is_active` in the lead route.
 */

export const CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN = "CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN";

export type BillingAccessState = "active" | "grace" | "inactive";

export type ContactUnlockEntitlement = {
  billing_access_state: BillingAccessState;
  can_unlock_contacts: boolean;
};

const GRACE_PLAN_STATUSES = new Set(["grace", "grace_period"]);
const INACTIVE_PLAN_STATUSES = new Set([
  "inactive",
  "expired",
  "cancelled",
  "canceled",
]);

/** Normalize stored `plan_status` to the three-state access model. */
export function resolveBillingAccessState(
  planStatus: string | null | undefined,
): BillingAccessState {
  const status = (planStatus ?? "").trim().toLowerCase();
  if (GRACE_PLAN_STATUSES.has(status)) return "grace";
  if (INACTIVE_PLAN_STATUSES.has(status)) return "inactive";
  // active, early_access, trialing, missing/unknown → access preserved
  return "active";
}

export function resolveContactUnlockEntitlement(
  planStatus: string | null | undefined,
): ContactUnlockEntitlement {
  const billing_access_state = resolveBillingAccessState(planStatus);
  return {
    billing_access_state,
    can_unlock_contacts: billing_access_state !== "inactive",
  };
}

/** Whether the specialist may newly unlock locked lead contacts. */
export function canUnlockLeadContacts(planStatus: string | null | undefined): boolean {
  return resolveContactUnlockEntitlement(planStatus).can_unlock_contacts;
}

export class ContactUnlockEntitlementError extends Error {
  readonly code = CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN;

  constructor() {
    super(CONTACT_UNLOCK_REQUIRES_ACTIVE_PLAN);
    this.name = "ContactUnlockEntitlementError";
  }
}

export function isContactUnlockEntitlementError(error: unknown): error is ContactUnlockEntitlementError {
  return error instanceof ContactUnlockEntitlementError;
}
