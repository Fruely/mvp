import {
  resolveSpecialistProfileSession,
  specialistProfileSessionErrorCode,
  specialistProfileSessionErrorStatus,
  type SpecialistProfileSession,
} from "@/lib/specialistProfile/session";

export type DashboardRouteAuthResult =
  | { ok: true; userId: string; specialistId: string; specialistStatus: string | null }
  | { ok: false; status: number; error: string };

export function mapSpecialistSessionToDashboardAuth(
  session: SpecialistProfileSession,
): DashboardRouteAuthResult {
  if (session.kind !== "ok") {
    return {
      ok: false,
      status: specialistProfileSessionErrorStatus(session),
      error: specialistProfileSessionErrorCode(session),
    };
  }

  return {
    ok: true,
    userId: session.userId,
    specialistId: session.specialistId,
    specialistStatus: session.specialistStatus,
  };
}

export async function resolveDashboardSpecialistAuth(
  request: Request,
): Promise<DashboardRouteAuthResult> {
  const session = await resolveSpecialistProfileSession(request);
  return mapSpecialistSessionToDashboardAuth(session);
}
