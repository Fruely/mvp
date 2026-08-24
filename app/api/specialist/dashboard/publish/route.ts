import { NextRequest } from "next/server";

import { jsonNoStore } from "@/lib/api/response";
import { resolveDashboardSpecialistAuth } from "@/lib/specialistDashboard/dashboardRouteAuth";
import { publishSpecialistProfile } from "@/lib/specialistDashboard/publishSpecialist";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await resolveDashboardSpecialistAuth(request);
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();
  const { data: plan, error: planError } = await service
    .from("specialist_plan")
    .select("plan_code, plan_status")
    .eq("specialist_id", auth.specialistId)
    .maybeSingle();

  if (planError) {
    return jsonNoStore({ error: "plan_lookup_failed" }, { status: 500 });
  }

  const entitlements = resolveSpecialistEntitlements({
    plan_code: plan?.plan_code ?? "starter",
    plan_status: plan?.plan_status ?? "inactive",
  });

  if (!entitlements.effectivePaidPlan) {
    return jsonNoStore(
      { error: "paid_plan_required", code: "paid_plan_required" },
      { status: 402 },
    );
  }

  const result = await publishSpecialistProfile(service, auth.specialistId);

  if (!result.ok) {
    return jsonNoStore(result.body, { status: result.status });
  }

  return jsonNoStore({
    success: true,
    status: result.status,
    ...(result.alreadyPublished ? { alreadyPublished: true } : {}),
  });
}
