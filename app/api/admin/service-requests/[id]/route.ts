import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { SERVICE_REQUEST_ADMIN_DETAIL_SELECT } from "@/lib/serviceRequests/validation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const { id } = await Promise.resolve(context.params);
    if (!id) {
      return NextResponse.json({ error: "invalid_id" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_requests")
      .select(SERVICE_REQUEST_ADMIN_DETAIL_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[admin/service-requests/detail] fetch failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[admin/service-requests/detail] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
