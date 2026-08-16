import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import {
  resolveSpecialistProfileSession,
  specialistProfileSessionErrorCode,
  type SpecialistProfileSession,
} from "@/lib/specialistProfile/session";

export type SpecialistMediaContext =
  | { kind: "error"; status: number; body: Record<string, unknown> }
  | {
      kind: "ok";
      supabase: SupabaseClient;
      userId: string;
      specialistId: string;
      specialistStatus: string | null;
    };

function sessionErrorResponse(session: Exclude<SpecialistProfileSession, { kind: "ok" }>) {
  const status =
    session.kind === "unauthorized"
      ? 401
      : session.kind === "specialist_required" || session.kind === "forbidden_blocked"
        ? 403
        : 403;
  return {
    kind: "error" as const,
    status,
    body: { error: specialistProfileSessionErrorCode(session) },
  };
}

export async function resolveSpecialistMediaContext(request: Request): Promise<SpecialistMediaContext> {
  const session = await resolveSpecialistProfileSession(request);
  if (session.kind !== "ok") {
    return sessionErrorResponse(session);
  }

  const supabase = createServiceClient();
  const { data: specialist, error } = await supabase
    .from("specialists")
    .select("id, status")
    .eq("id", session.specialistId)
    .maybeSingle();

  if (error) {
    console.error("[specialistMedia/context] specialist lookup failed", error.message);
    return { kind: "error", status: 500, body: { error: "server_error" } };
  }

  if (!specialist?.id) {
    return { kind: "error", status: 403, body: { error: "specialist_required" } };
  }

  return {
    kind: "ok",
    supabase,
    userId: session.userId,
    specialistId: session.specialistId,
    specialistStatus: typeof specialist.status === "string" ? specialist.status : null,
  };
}
