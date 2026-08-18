import { NextRequest, NextResponse } from "next/server";

import { unlockSpecialistLeadContacts } from "@/lib/specialistLeads/service";
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
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const session = await resolveSpecialistLeadSession(request);
    if (session.kind !== "ok") {
      return NextResponse.json(
        { error: specialistLeadSessionErrorCode(session) },
        { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
      );
    }

    const { id: leadId } = await Promise.resolve(context.params);
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ error: "invalid_lead_id" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const item = await unlockSpecialistLeadContacts(
      supabase,
      session.specialistId,
      leadId,
      session.userId,
    );

    if (!item) {
      return NextResponse.json({ error: "lead_not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ item }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[specialist/leads/unlock-contacts] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
