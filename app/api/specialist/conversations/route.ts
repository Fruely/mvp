import { NextRequest, NextResponse } from "next/server";
import { listOwnedSpecialistConversations } from "@/lib/selection/specialistConversations";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Conversations owned by the signed-in specialist. Identity comes from the session only. */
export async function GET(request: NextRequest) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  try {
    const result = await listOwnedSpecialistConversations(createSupabaseServerClient(), session.specialistId);
    if (result.status === "error") {
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }
    return NextResponse.json({ items: result.items }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/conversations] list failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
