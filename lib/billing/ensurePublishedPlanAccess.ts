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
export const SPECIALIST_PLAN_ACCESS_FAILED = "specialist_plan_access_failed";
export const MAX_PUBLISHED_PLAN_ACCESS_ATTEMPTS = 3;

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

export type EnsurePublishedPlanAccessResult =
  | { ok: true; action: PublishedPlanAccessAction }
  | { ok: false; code: typeof SPECIALIST_PLAN_ACCESS_FAILED };

export type SpecialistPlanAccessStore = {
  load(specialistId: string): Promise<{
    snapshot: PublishedPlanAccessSnapshot;
    error: unknown | null;
  }>;
  insertInactive(specialistId: string): Promise<{ error: unknown | null }>;
  casUpdateInactive(
    specialistId: string,
    observed: PublishedPlanAccessSnapshot,
  ): Promise<{ updated: boolean; error: unknown | null }>;
};

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

export function isSpecialistPlanUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";
  return code === "23505" || /duplicate key|unique constraint/i.test(message);
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function snapshotFromPlanRow(
  plan: { plan_code?: unknown; plan_status?: unknown } | null,
): PublishedPlanAccessSnapshot {
  return {
    rowPresent: Boolean(plan),
    planCode: asOptionalString(plan?.plan_code),
    planStatus: asOptionalString(plan?.plan_status),
  };
}

/**
 * Persist the resolved unpublished/PPL-only plan state with fail-closed errors
 * and compare-and-set updates so a concurrent paid webhook cannot be overwritten.
 */
export async function applyPublishedPlanAccess(
  specialistId: string,
  store: SpecialistPlanAccessStore,
): Promise<EnsurePublishedPlanAccessResult> {
  for (let attempt = 0; attempt < MAX_PUBLISHED_PLAN_ACCESS_ATTEMPTS; attempt += 1) {
    const loaded = await store.load(specialistId);
    if (loaded.error) {
      console.error("[billing/publish] specialist_plan lookup failed", loaded.error);
      return { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED };
    }

    const action = resolvePublishedPlanAccessAction(loaded.snapshot);
    if (action.kind === "noop") {
      return { ok: true, action };
    }

    if (action.kind === "insert_inactive") {
      const inserted = await store.insertInactive(specialistId);
      if (!inserted.error) {
        return { ok: true, action };
      }
      if (isSpecialistPlanUniqueViolation(inserted.error)) {
        continue;
      }
      console.error("[billing/publish] inactive specialist_plan insert failed", inserted.error);
      return { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED };
    }

    const cas = await store.casUpdateInactive(specialistId, loaded.snapshot);
    if (cas.error) {
      console.error("[billing/publish] inactive specialist_plan update failed", cas.error);
      return { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED };
    }
    if (cas.updated) {
      return { ok: true, action };
    }
  }

  return { ok: false, code: SPECIALIST_PLAN_ACCESS_FAILED };
}

function createSupabasePlanAccessStore(service: SupabaseClient): SpecialistPlanAccessStore {
  return {
    async load(specialistId) {
      const { data: plan, error } = await service
        .from("specialist_plan")
        .select("plan_code, plan_status")
        .eq("specialist_id", specialistId)
        .maybeSingle();
      if (error) {
        return {
          snapshot: { rowPresent: false, planCode: null, planStatus: null },
          error,
        };
      }
      return { snapshot: snapshotFromPlanRow(plan), error: null };
    },

    async insertInactive(specialistId) {
      const nowIso = new Date().toISOString();
      const { error } = await service.from("specialist_plan").insert({
        specialist_id: specialistId,
        plan_code: PPL_ONLY_PLAN_CODE,
        plan_status: PPL_ONLY_PLAN_STATUS,
        started_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
      });
      return { error };
    },

    async casUpdateInactive(specialistId, observed) {
      const nowIso = new Date().toISOString();
      const base = service
        .from("specialist_plan")
        .update({
          plan_status: PPL_ONLY_PLAN_STATUS,
          lifecycle_enrolled_at: null,
          updated_at: nowIso,
        })
        .eq("specialist_id", specialistId);
      const withCode =
        observed.planCode == null ? base.is("plan_code", null) : base.eq("plan_code", observed.planCode);
      const withStatus =
        observed.planStatus == null
          ? withCode.is("plan_status", null)
          : withCode.eq("plan_status", observed.planStatus);
      const { data, error } = await withStatus.select("specialist_id").maybeSingle();
      if (error) {
        return { updated: false, error };
      }
      return { updated: Boolean(data), error: null };
    },
  };
}

/**
 * Materialize a non-entitled specialist_plan row for unpaid publishers.
 * Does not create payments, early_access, or a fake free paid plan.
 * Fail closed: callers must not treat the specialist as safely published unless ok.
 */
export async function ensureSafePublishedPlanAccess(
  service: SupabaseClient,
  specialistId: string,
): Promise<EnsurePublishedPlanAccessResult> {
  return applyPublishedPlanAccess(specialistId, createSupabasePlanAccessStore(service));
}
