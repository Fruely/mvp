import { hasActiveProEntitlement } from "@/lib/specialists/proPage/entitlement";
import { loadSpecialistProEntitlement } from "@/lib/specialists/proPage/loadProEntitlement";
import { resolveDashboardSpecialistAuth } from "@/lib/specialistDashboard/dashboardRouteAuth";

export type ProPageEditorAccessResult =
  | { ok: true; userId: string; specialistId: string }
  | { ok: false; status: number; error: string };

export async function requireProPageEditorAccess(request: Request): Promise<ProPageEditorAccessResult> {
  const auth = await resolveDashboardSpecialistAuth(request);
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }

  const entitlement = await loadSpecialistProEntitlement(auth.specialistId);
  if (!hasActiveProEntitlement(entitlement)) {
    return { ok: false, status: 403, error: "pro_entitlement_required" };
  }

  return { ok: true, userId: auth.userId, specialistId: auth.specialistId };
}

/** Page-level check (no Request): used by server components. */
export async function requireProPageEditorAccessForSpecialist(
  specialistId: string,
): Promise<{ ok: true } | { ok: false; error: "pro_entitlement_required" }> {
  const entitlement = await loadSpecialistProEntitlement(specialistId);
  if (!hasActiveProEntitlement(entitlement)) {
    return { ok: false, error: "pro_entitlement_required" };
  }
  return { ok: true };
}
