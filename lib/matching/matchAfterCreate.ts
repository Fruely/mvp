import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceRequestCreateResult } from "@/lib/serviceRequests/createServiceRequest";
import type { ValidatedServiceRequestCreate } from "@/lib/serviceRequests/validation";
import type { MatchWorkFormat } from "./eligibility";
import { isServiceRequestMatchingEnabled } from "./featureFlag";
import { matchConfirmedServiceRequest, type BudgetReconciliationOffer, type MatchingRunResult } from "./runMatching";

function asFormat(value: unknown): MatchWorkFormat | null {
  if (value === "online" || value === "offline" || value === "hybrid") return value;
  return null;
}

function asLanguages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function skipped(requestId: string): MatchingRunResult {
  return {
    outcome: "skipped",
    runId: "",
    serviceRequestId: requestId,
    candidates: 0,
    matches: 0,
    durationMs: 0,
    budgetReconciliation: null,
  };
}

/**
 * Matching core for a row that already exists.
 * Create and budget-reconciliation accept both use this loader, then
 * `matchConfirmedServiceRequest`. There is no second matching algorithm.
 */
export async function matchPersistedServiceRequest(
  supabase: SupabaseClient,
  requestId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<MatchingRunResult> {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("id, category_id, service_languages, work_format, city, postal_code")
      .eq("id", requestId)
      .maybeSingle();
    if (error || !data?.id) {
      console.error("[matching] failed", { outcome: "request_not_found" });
      return skipped(requestId);
    }
    if (!isServiceRequestMatchingEnabled(env)) {
      console.info("[matching] matching_skipped", {
        reason: "feature_disabled",
        request_id: String(data.id),
      });
      return skipped(String(data.id));
    }
    const workFormat = asFormat(data.work_format);
    if (!workFormat || !data.category_id) {
      console.info("[matching] matching_skipped", {
        reason: workFormat ? "category_unresolved" : "work_format",
        request_id: String(data.id),
      });
      return skipped(String(data.id));
    }
    return matchConfirmedServiceRequest(
      supabase,
      {
        id: String(data.id),
        categoryId: String(data.category_id),
        serviceLanguages: asLanguages(data.service_languages),
        workFormat,
        city: typeof data.city === "string" ? data.city : null,
        postalCode: typeof data.postal_code === "string" ? data.postal_code : null,
      },
      env,
    );
  } catch (error) {
    console.error("[matching] failed", {
      outcome: "error",
      name: error instanceof Error ? error.name : "Error",
    });
    return {
      outcome: "error",
      runId: "",
      serviceRequestId: requestId,
      candidates: 0,
      matches: 0,
      durationMs: 0,
      budgetReconciliation: null,
    };
  }
}

/**
 * Runs only after a new confirmed service_request row exists.
 * A replay does not match again. Failure is logged and does not fail creation.
 */
export async function matchAfterServiceRequestCreated(
  supabase: SupabaseClient,
  result: ServiceRequestCreateResult,
  _validated: ValidatedServiceRequestCreate,
  env: NodeJS.ProcessEnv = process.env,
): Promise<BudgetReconciliationOffer | null> {
  if (result.kind !== "created") return null;
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("id")
      .eq("public_id", result.public_id)
      .maybeSingle();
    if (error || !data?.id) {
      console.error("[matching] failed", { outcome: "request_not_found" });
      return null;
    }
    const matched = await matchPersistedServiceRequest(supabase, String(data.id), env);
    return matched.budgetReconciliation;
  } catch (error) {
    console.error("[matching] failed", {
      outcome: "error",
      name: error instanceof Error ? error.name : "Error",
    });
    return null;
  }
}
