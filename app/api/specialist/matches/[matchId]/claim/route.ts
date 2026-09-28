import { NextRequest, NextResponse } from "next/server";
import { claimOwnMatch } from "@/lib/selection/claimMatch";
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
 * Specialist TAKE. Identity comes from the session. The body is ignored.
 * Ownership is the conditional update inside `claimOwnMatch`.
 */
export async function POST(
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
    const result = await claimOwnMatch(createSupabaseServerClient(), {
      matchId,
      specialistId: session.specialistId,
    });
    if (!result.ok) {
      const status = result.error === "forbidden" ? 403 : result.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json(
      { ok: true, conversationId: result.conversationId, changed: result.changed },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[api/specialist/matches] claim failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
