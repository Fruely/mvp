import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceRequestCreateResult } from "@/lib/serviceRequests/createServiceRequest";
import type { ValidatedServiceRequestCreate } from "@/lib/serviceRequests/validation";
import type { MatchWorkFormat } from "./eligibility";
import { matchConfirmedServiceRequest } from "./runMatching";

function asFormat(value: string): MatchWorkFormat | null {
  if (value === "online" || value === "offline" || value === "hybrid") return value;
  return null;
}

/**
 * Runs only after a new confirmed service_request row exists.
 * A replay does not match again. Failure is logged and does not fail creation.
 */
export async function matchAfterServiceRequestCreated(
  supabase: SupabaseClient,
  result: ServiceRequestCreateResult,
  validated: ValidatedServiceRequestCreate,
): Promise<void> {
  if (result.kind !== "created") return;
  const workFormat = asFormat(validated.work_format);
  if (!workFormat) return;

  try {
    const { data, error } = await supabase
      .from("service_requests")
      .select("id")
      .eq("public_id", result.public_id)
      .maybeSingle();
    if (error || !data?.id) {
      console.error("[matching] failed", { outcome: "request_not_found" });
      return;
    }
    await matchConfirmedServiceRequest(supabase, {
      id: String(data.id),
      categoryId: validated.category_id,
      serviceLanguages: validated.service_languages ?? [],
      workFormat,
      city: validated.city,
      postalCode: validated.postal_code,
    });
  } catch (error) {
    console.error("[matching] failed", {
      outcome: "error",
      name: error instanceof Error ? error.name : "Error",
    });
  }
}
