import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import type { PaidPlanCode } from "@/lib/billing/plans";
import { unixToIso } from "@/lib/billing/subscriptionWebhookValidation";

export type SpecialistPlanProjection = {
  plan_code: PaidPlanCode;
  plan_status: string;
  started_at: string;
  expires_at: string | null;
  grace_until: string | null;
};

type ExistingSpecialistPlan = {
  plan_code: string;
  plan_status: string;
  started_at: string | null;
};

export function buildSpecialistPlanProjection(
  planCode: PaidPlanCode,
  subscription: Stripe.Subscription,
): SpecialistPlanProjection {
  const status = subscription.status;
  const periodStart = unixToIso(subscription.current_period_start);
  const periodEnd = unixToIso(subscription.current_period_end);
  const trialEnd = unixToIso(subscription.trial_end);
  const endedAt = unixToIso(subscription.ended_at);
  const nowIso = new Date().toISOString();

  if (status === "active") {
    return {
      plan_code: planCode,
      plan_status: "active",
      started_at: periodStart ?? nowIso,
      expires_at: periodEnd,
      grace_until: null,
    };
  }

  if (status === "trialing") {
    return {
      plan_code: planCode,
      plan_status: "trialing",
      started_at: periodStart ?? unixToIso(subscription.trial_start) ?? nowIso,
      expires_at: trialEnd ?? periodEnd,
      grace_until: null,
    };
  }

  if (status === "past_due") {
    return {
      plan_code: planCode,
      plan_status: "grace",
      started_at: periodStart ?? nowIso,
      expires_at: periodEnd,
      grace_until: null,
    };
  }

  if (status === "unpaid") {
    return {
      plan_code: planCode,
      plan_status: "expired",
      started_at: periodStart ?? nowIso,
      expires_at: periodEnd ?? endedAt,
      grace_until: null,
    };
  }

  if (status === "canceled" || status === "incomplete_expired") {
    return {
      plan_code: planCode,
      plan_status: "cancelled",
      started_at: periodStart ?? nowIso,
      expires_at: endedAt ?? periodEnd,
      grace_until: null,
    };
  }

  if (status === "incomplete" || status === "paused") {
    return {
      plan_code: planCode,
      plan_status: "expired",
      started_at: periodStart ?? nowIso,
      expires_at: periodEnd ?? endedAt,
      grace_until: null,
    };
  }

  return {
    plan_code: planCode,
    plan_status: "expired",
    started_at: periodStart ?? nowIso,
    expires_at: periodEnd ?? endedAt,
    grace_until: null,
  };
}

export async function projectSpecialistPlanFromSubscription(
  supabase: SupabaseClient,
  input: {
    specialistId: string;
    planCode: PaidPlanCode;
    subscription: Stripe.Subscription;
    existingPlan?: ExistingSpecialistPlan | null;
  },
): Promise<"synced" | "retryable_failure"> {
  const projection = buildSpecialistPlanProjection(input.planCode, input.subscription);
  if (projection.plan_status === "early_access") {
    return "retryable_failure";
  }

  const ts = new Date().toISOString();
  const { data: existing } = await supabase
    .from("specialist_plan")
    .select("specialist_id, plan_code, plan_status, started_at")
    .eq("specialist_id", input.specialistId)
    .maybeSingle();

  const startedAt =
    existing?.started_at && projection.plan_status !== "cancelled"
      ? String(existing.started_at)
      : projection.started_at;

  if (existing?.specialist_id) {
    const { error } = await supabase
      .from("specialist_plan")
      .update({
        plan_code: projection.plan_code,
        plan_status: projection.plan_status,
        started_at: startedAt,
        expires_at: projection.expires_at,
        grace_until: projection.grace_until,
        updated_at: ts,
      })
      .eq("specialist_id", input.specialistId);

    return error ? "retryable_failure" : "synced";
  }

  const { error } = await supabase.from("specialist_plan").insert({
    specialist_id: input.specialistId,
    plan_code: projection.plan_code,
    plan_status: projection.plan_status,
    started_at: startedAt,
    expires_at: projection.expires_at,
    grace_until: projection.grace_until,
    created_at: ts,
    updated_at: ts,
  });

  return error ? "retryable_failure" : "synced";
}
