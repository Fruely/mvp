import { NextRequest, NextResponse } from "next/server";
import { readOwnedMatchPreview } from "@/lib/inbox/matchPreview";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const MATCH_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Specialist-owned demand preview. Reading it uses the same open path as
 * `POST /api/specialist/matches/:id/open`.
 */
export async function GET(
  request: NextRequest,
  context: { params: { matchId: string } | Promise<{ matchId: string }> },
) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const { matchId } = await Promise.resolve(context.params);
  if (!matchId || !MATCH_ID.test(matchId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  try {
    const result = await readOwnedMatchPreview(createSupabaseServerClient(), {
      matchId,
      specialistId: session.specialistId,
      userId: session.userId,
    });
    if (result.status === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
    }
    if (result.status === "not_found") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    if (result.status === "error") {
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }
    return NextResponse.json(result.preview, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/matches] preview failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
