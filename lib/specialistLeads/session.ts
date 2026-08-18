import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient as createCookieClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export type SpecialistLeadSession =
  | { kind: "unauthorized" }
  | { kind: "specialist_required" }
  | { kind: "forbidden_blocked" }
  | { kind: "ok"; userId: string; specialistId: string; specialistStatus: string | null };

async function lookupSpecialistForUser(userId: string): Promise<SpecialistLeadSession> {
  const service = createServiceClient();
  const { data: specialist, error } = await service
    .from("specialists")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[specialistLeads/session] specialist lookup failed", error.message);
    throw new Error("specialist_lookup_failed");
  }

  if (!specialist?.id) {
    return { kind: "specialist_required" };
  }

  if (specialist.status === "blocked") {
    return { kind: "forbidden_blocked" };
  }

  return {
    kind: "ok",
    userId,
    specialistId: specialist.id,
    specialistStatus: typeof specialist.status === "string" ? specialist.status : null,
  };
}

/** Bearer-only session for Native list/detail endpoints. */
export async function resolveSpecialistLeadBearerSession(
  request: Request,
): Promise<SpecialistLeadSession> {
  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "absent" || bearer.kind === "invalid") {
    return { kind: "unauthorized" };
  }

  return lookupSpecialistForUser(bearer.userId);
}

/** Bearer first, cookie fallback — for mutation routes shared with Web dashboard. */
export async function resolveSpecialistLeadSession(request: Request): Promise<SpecialistLeadSession> {
  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "authenticated") {
    return lookupSpecialistForUser(bearer.userId);
  }

  if (bearer.kind === "invalid") {
    return { kind: "unauthorized" };
  }

  const cookieClient = createCookieClient();
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser();

  if (error || !user?.id) {
    return { kind: "unauthorized" };
  }

  return lookupSpecialistForUser(user.id);
}

export function specialistLeadSessionErrorStatus(
  session: Exclude<SpecialistLeadSession, { kind: "ok" }>,
): number {
  switch (session.kind) {
    case "unauthorized":
      return 401;
    case "specialist_required":
      return 403;
    case "forbidden_blocked":
      return 403;
    default:
      return 403;
  }
}

export function specialistLeadSessionErrorCode(
  session: Exclude<SpecialistLeadSession, { kind: "ok" }>,
): string {
  switch (session.kind) {
    case "unauthorized":
      return "unauthorized";
    case "specialist_required":
      return "specialist_required";
    case "forbidden_blocked":
      return "forbidden";
    default:
      return "forbidden";
  }
}
