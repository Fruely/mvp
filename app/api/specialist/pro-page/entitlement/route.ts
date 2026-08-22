import { jsonNoStore } from "@/lib/api/response";
import { hasActiveProEntitlement } from "@/lib/specialists/proPage/entitlement";
import { loadSpecialistProEntitlement } from "@/lib/specialists/proPage/loadProEntitlement";
import { resolveDashboardSpecialistAuth } from "@/lib/specialistDashboard/dashboardRouteAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await resolveDashboardSpecialistAuth(request);
  if (!auth.ok) {
    return jsonNoStore({ error: auth.error }, { status: auth.status });
  }

  const entitlement = await loadSpecialistProEntitlement(auth.specialistId);
  return jsonNoStore({ active: hasActiveProEntitlement(entitlement) });
}
