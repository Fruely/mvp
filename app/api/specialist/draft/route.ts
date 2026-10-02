import { NextResponse } from "next/server";

import { ensureSpecialistDraft } from "@/lib/specialists/ensureSpecialistDraft";
import { resolveDraftRequestActor } from "@/lib/specialists/resolveDraftRequestActor";
import { supabaseSpecialistDraftStore } from "@/lib/specialists/supabaseSpecialistDraftStore";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  const actor = await resolveDraftRequestActor(request);
  if (actor.kind !== "ok") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const result = await ensureSpecialistDraft(supabaseSpecialistDraftStore(createSupabaseServerClient()), {
      userId: actor.userId,
      email: actor.email,
    });

    if (!result.ok) {
      const status = result.error === "forbidden_blocked" ? 403 : 500;
      const error = result.error === "forbidden_blocked" ? "forbidden" : "server_error";
      return NextResponse.json({ error }, { status, headers: NO_STORE });
    }

    return NextResponse.json(
      {
        specialist: {
          id: result.specialist.id,
          status: result.specialist.status,
        },
        created: result.created,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[api/specialist/draft] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
