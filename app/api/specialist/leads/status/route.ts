import { NextRequest, NextResponse } from "next/server";

import { updateSpecialistLeadStatus } from "@/lib/specialistLeads/service";
import { SPECIALIST_LEAD_STATUSES } from "@/lib/specialistLeads/types";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function PATCH(request: NextRequest) {
  try {
    const session = await resolveSpecialistLeadSession(request);
    if (session.kind !== "ok") {
      return NextResponse.json(
        { error: specialistLeadSessionErrorCode(session) },
        { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
      );
    }

    const body = await request.json().catch(() => null);
    const leadId = body?.lead_id;
    const nextStatus = body?.status;

    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400, headers: NO_STORE });
    }

    if (!nextStatus || typeof nextStatus !== "string") {
      return NextResponse.json({ error: "status is required" }, { status: 400, headers: NO_STORE });
    }

    if (!SPECIALIST_LEAD_STATUSES.includes(nextStatus as (typeof SPECIALIST_LEAD_STATUSES)[number])) {
      return NextResponse.json(
        { error: `status must be one of: ${SPECIALIST_LEAD_STATUSES.join(", ")}` },
        { status: 400, headers: NO_STORE },
      );
    }

    const supabase = createSupabaseServerClient();
    const item = await updateSpecialistLeadStatus(
      supabase,
      session.specialistId,
      leadId,
      nextStatus,
    );

    if (!item) {
      return NextResponse.json({ error: "lead_not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ item }, { status: 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof Error && error.message === "lead_status_conflict") {
      return NextResponse.json({ error: "invalid_status_transition" }, { status: 409, headers: NO_STORE });
    }

    console.error("[specialist/leads/status] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
