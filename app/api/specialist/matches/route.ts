import { NextRequest, NextResponse } from "next/server";
import { listOwnedActiveMatchPreviews } from "@/lib/inbox/matchPreview";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Current `active` matches for the signed-in specialist. Opening a row is a separate read. */
export async function GET(request: NextRequest) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  try {
    const result = await listOwnedActiveMatchPreviews(createSupabaseServerClient(), session.specialistId);
    if (result.status === "error") {
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }
    return NextResponse.json({ items: result.items }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/matches] list failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
