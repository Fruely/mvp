import type { SupabaseClient } from "@supabase/supabase-js";
import { deactivatePaidProEntitlement } from "@/lib/specialists/proPage/syncPaidProEntitlement";

/**
 * Central lifecycle resolver for specialist access.
 *
 * Calls the `reconcile_specialist_access` RPC which determines the lifecycle
 * state (active / grace / inactive) from the plan_payments ledger and syncs
 * `specialist_plan.plan_status` and `specialists.billing_visibility_blocked`.
 *
 * Never touches `specialists.is_visible` — admin/moderation ownership preserved.
 * Safe to call for any lifecycle event: refund, natural expiry, initial grace,
 * reactivation, cron sweep, or manual admin reconciliation.
 */

export type LifecycleStatus = "active" | "grace" | "inactive";

export type ReconcileSpecialistAccessResult = {
  outcome: "success" | "retryable_failure";
  rpcOutcome?: string;
  lifecycleStatus?: LifecycleStatus;
  previousStatus?: string;
  graceUntil?: string | null;
};

export async function reconcileSpecialistAccess(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<ReconcileSpecialistAccessResult> {
  const { data, error } = await supabase.rpc("reconcile_specialist_access", {
    p_specialist_id: specialistId,
  });

  if (error) {
    console.error("[billing/lifecycle] reconcile_specialist_access_rpc_error", {
      specialistId,
      error: error.message ?? error,
    });
    return { outcome: "retryable_failure" };
  }

  const result = (data ?? {}) as {
    outcome?: string;
    lifecycle_status?: string;
    previous_status?: string;
    grace_until?: string | null;
  };
  const rpcOutcome = result.outcome ?? "unknown";
  const lifecycleStatus = (result.lifecycle_status ?? undefined) as LifecycleStatus | undefined;

  console.info("[billing/lifecycle] specialist_access_reconciled", {
    specialistId,
    rpcOutcome,
    lifecycleStatus,
    previousStatus: result.previous_status,
  });

  if (lifecycleStatus === "inactive") {
    const deactivate = await deactivatePaidProEntitlement(supabase, specialistId);
    if (!deactivate.ok) {
      console.error("[billing/lifecycle] paid_pro_entitlement_deactivate_failed", {
        specialistId,
        code: deactivate.code,
      });
      return { outcome: "retryable_failure" };
    }
  }

  return {
    outcome: "success",
    rpcOutcome,
    lifecycleStatus,
    previousStatus: result.previous_status,
    graceUntil: result.grace_until,
  };
}

/** Lifecycle reconciliation feature flag. When off, refund/expiry handlers skip reconciliation. */
export function isLifecycleReconciliationEnabled(): boolean {
  return process.env.LIFECYCLE_RECONCILIATION_ENABLED === "true";
}

export const GRACE_PERIOD_DAYS = 7;
