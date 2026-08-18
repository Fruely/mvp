import { NextRequest, NextResponse } from "next/server";

import { listSpecialistLeads } from "@/lib/specialistLeads/service";
import {
  resolveSpecialistLeadBearerSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const session = await resolveSpecialistLeadBearerSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const { searchParams } = request.nextUrl;

  try {
    const supabase = createSupabaseServerClient();
    const result = await listSpecialistLeads(supabase, session.specialistId, {
      limit: searchParams.get("limit"),
      cursor: searchParams.get("cursor"),
      status: searchParams.get("status"),
    });

    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_status_filter") {
      return NextResponse.json({ error: "invalid_status_filter" }, { status: 400, headers: NO_STORE });
    }

    console.error("[api/specialist/leads] list failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
