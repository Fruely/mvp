import type { SupabaseClient } from "@supabase/supabase-js";

import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";

/**
 * Safe commercial state for a published specialist who is not on a covering
 * paid Professional/Growth plan. `inactive` blocks contact unlock without
 * implying a fake free subscription.
 */
export const PPL_ONLY_PLAN_CODE = "starter";
export const PPL_ONLY_PLAN_STATUS = "inactive";

const LEGACY_ENTITLED_PLAN_STATUSES = new Set(["early_access", "trialing"]);

export type PublishedPlanAccessSnapshot = {
  rowPresent: boolean;
  planCode: string | null;
  planStatus: string | null;
};

export type PublishedPlanAccessAction =
  | { kind: "noop"; reason: "paid_coverage" | "legacy_entitled" | "already_inactive" }
  | { kind: "insert_inactive" }
  | { kind: "update_inactive" };

export function shouldRunPaidLifecycleReconcile(action: PublishedPlanAccessAction): boolean {
  return action.kind === "noop" && action.reason === "paid_coverage";
}

function normalizedStatus(planStatus: string | null): string {
  return (planStatus ?? "").trim().toLowerCase();
}

export function hasCoveringPaidSubscription(snapshot: PublishedPlanAccessSnapshot): boolean {
  return (
    resolveSpecialistEntitlements({
      plan_code: snapshot.planCode ?? PPL_ONLY_PLAN_CODE,
      plan_status: snapshot.planStatus ?? PPL_ONLY_PLAN_STATUS,
    }).effectivePaidPlan !== null
  );
}

export function resolvePublishedPlanAccessAction(
  snapshot: PublishedPlanAccessSnapshot,
): PublishedPlanAccessAction {
  if (hasCoveringPaidSubscription(snapshot)) {
    return { kind: "noop", reason: "paid_coverage" };
  }

  const status = normalizedStatus(snapshot.planStatus);
  if (snapshot.rowPresent && LEGACY_ENTITLED_PLAN_STATUSES.has(status)) {
    return { kind: "noop", reason: "legacy_entitled" };
  }

  if (!snapshot.rowPresent) {
    return { kind: "insert_inactive" };
  }

  if (!canUnlockLeadContacts(snapshot.planStatus)) {
    return { kind: "noop", reason: "already_inactive" };
  }

  return { kind: "update_inactive" };
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/**
 * Materialize a non-entitled specialist_plan row for unpaid publishers.
 * Does not create payments, early_access, or a fake free paid plan.
 */
export async function ensureSafePublishedPlanAccess(
  service: SupabaseClient,
  specialistId: string,
): Promise<PublishedPlanAccessAction> {
  const { data: plan, error } = await service
    .from("specialist_plan")
    .select("plan_code, plan_status")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error) {
    console.error("[billing/publish] specialist_plan lookup failed", error);
  }

  const snapshot: PublishedPlanAccessSnapshot = {
    rowPresent: Boolean(plan) && !error,
    planCode: asOptionalString(plan?.plan_code),
    planStatus: asOptionalString(plan?.plan_status),
  };
  const action = resolvePublishedPlanAccessAction(snapshot);
  const nowIso = new Date().toISOString();

  if (action.kind === "insert_inactive") {
    const { error: insertError } = await service.from("specialist_plan").insert({
      specialist_id: specialistId,
      plan_code: PPL_ONLY_PLAN_CODE,
      plan_status: PPL_ONLY_PLAN_STATUS,
      started_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
    if (insertError) {
      console.error("[billing/publish] inactive specialist_plan insert failed", insertError);
    }
    return action;
  }

  if (action.kind === "update_inactive") {
    const { error: updateError } = await service
      .from("specialist_plan")
      .update({
        plan_status: PPL_ONLY_PLAN_STATUS,
        lifecycle_enrolled_at: null,
        updated_at: nowIso,
      })
      .eq("specialist_id", specialistId);
    if (updateError) {
      console.error("[billing/publish] inactive specialist_plan update failed", updateError);
    }
  }

  return action;
}
