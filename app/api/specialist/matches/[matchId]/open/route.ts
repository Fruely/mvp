import { NextRequest, NextResponse } from "next/server";
import { openOwnMatch } from "@/lib/inbox/respond";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

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
  if (!matchId) {
    return NextResponse.json({ error: "invalid_match" }, { status: 400, headers: NO_STORE });
  }

  const result = await openOwnMatch(createSupabaseServerClient(), {
    matchId,
    specialistId: session.specialistId,
    userId: session.userId,
  });
  if ("error" in result) {
    const status = result.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
  }
  return NextResponse.json({ openedAt: result.openedAt }, { status: 200, headers: NO_STORE });
}
