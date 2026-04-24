import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Canonical subscription snapshot for dashboard UI — always read from `specialist_plan`.
 * If no row exists, returns a safe MVP fallback (no payment implied).
 */
export type SpecialistPlanForUi = {
  plan_code: string;
  plan_status: string;
  started_at: string | null;
  expires_at: string | null;
  /** Reserved for when `specialist_plan.grace_until` exists in DB; currently always null. */
  grace_until: string | null;
  /** Whether a row was found in `specialist_plan`. */
  fromDatabase: boolean;
};

const FALLBACK: SpecialistPlanForUi = {
  plan_code: "starter",
  plan_status: "early_access",
  started_at: null,
  expires_at: null,
  grace_until: null,
  fromDatabase: false,
};

export async function getSpecialistPlanForDashboard(
  supabase: SupabaseClient,
  specialistId: string
): Promise<SpecialistPlanForUi> {
  const { data, error } = await supabase
    .from("specialist_plan")
    .select("plan_code, plan_status, started_at, expires_at")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error || !data) {
    return { ...FALLBACK };
  }

  const planCodeRaw = data.plan_code != null ? String(data.plan_code).trim() : "";
  const planStatusRaw = data.plan_status != null ? String(data.plan_status).trim() : "";

  return {
    plan_code: planCodeRaw || FALLBACK.plan_code,
    plan_status: planStatusRaw || FALLBACK.plan_status,
    started_at: data.started_at != null ? String(data.started_at) : null,
    expires_at: data.expires_at != null ? String(data.expires_at) : null,
    grace_until: null,
    fromDatabase: true,
  };
}

/** Statuses counted as “active subscription” for admin MVP metrics. */
export const ACTIVE_SUBSCRIPTION_PLAN_STATUSES = [
  "early_access",
  "trialing",
  "active",
  "grace",
  "grace_period",
] as const;
