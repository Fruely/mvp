import { NextRequest, NextResponse } from "next/server";

import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { listClientRequestHistory } from "@/lib/clientRequests/historyService";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind === "invalid" || auth.kind === "absent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const cursor = searchParams.get("cursor");

  try {
    const supabase = createSupabaseServerClient();
    const result = await listClientRequestHistory(supabase, auth.userId, { limit, cursor });

    return NextResponse.json(
      {
        items: result.items,
        next_cursor: result.next_cursor,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[client/requests] list failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
