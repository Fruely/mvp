import { NextRequest, NextResponse } from "next/server";

import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { CLIENT_REQUEST_KINDS } from "@/lib/clientRequests/constants";
import { getClientRequestHistoryDetail } from "@/lib/clientRequests/historyService";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type RouteParams = {
  params: {
    kind: string;
    id: string;
  };
};

function normalizeKind(value: string): "lead" | "service_request" | null {
  if (value === "lead") return "lead";
  if (value === "service-request" || value === "service_request") return "service_request";
  return null;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await resolveBearerAuthUser(_request);
  if (auth.kind === "invalid" || auth.kind === "absent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const kind = normalizeKind(params.kind);
  const id = params.id?.trim();

  if (!kind || !CLIENT_REQUEST_KINDS.includes(kind) || !id) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  try {
    const supabase = createSupabaseServerClient();
    const item = await getClientRequestHistoryDetail(supabase, auth.userId, kind, id);

    if (!item) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ item }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[client/requests/detail] failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
