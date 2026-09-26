import { NextRequest, NextResponse } from "next/server";
import { respondToOwnMatch } from "@/lib/inbox/respond";
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

  const body = await request.json().catch(() => null);
  const response = body && typeof body === "object" ? (body as { response?: unknown }).response : null;
  if (response !== "interested" && response !== "declined") {
    return NextResponse.json({ error: "invalid_response" }, { status: 400, headers: NO_STORE });
  }

  const result = await respondToOwnMatch(createSupabaseServerClient(), {
    matchId,
    specialistId: session.specialistId,
    userId: session.userId,
    response,
  });
  if ("error" in result) {
    const status = result.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
  }
  return NextResponse.json(
    { status: result.status, changed: result.changed, respondedAt: result.respondedAt },
    { status: 200, headers: NO_STORE },
  );
}
