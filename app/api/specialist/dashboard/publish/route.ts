import { NextRequest } from "next/server";

import { jsonNoStore } from "@/lib/api/response";
import { resolveDashboardSpecialistAuth } from "@/lib/specialistDashboard/dashboardRouteAuth";
import { publishSpecialistProfile } from "@/lib/specialistDashboard/publishSpecialist";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await resolveDashboardSpecialistAuth(request);
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const service = createServiceClient();
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
