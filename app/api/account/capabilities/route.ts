import { NextRequest, NextResponse } from "next/server";

import { resolveAccountCapabilities } from "@/lib/account/capabilitiesService";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind === "invalid" || auth.kind === "absent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createSupabaseServerClient();
    const data = await resolveAccountCapabilities(auth.userId, supabase);

    return NextResponse.json(data, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/account/capabilities] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
