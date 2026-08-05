import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { isAllowedAdminStatus } from "@/lib/serviceRequests/validation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function PATCH(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = body.status;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400, headers: NO_STORE });
    }

    if (!isAllowedAdminStatus(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400, headers: NO_STORE });
    }

    const nowIso = new Date().toISOString();
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_requests")
      .update({ status, updated_at: nowIso })
      .eq("id", id)
      .select("id, public_id, status, updated_at")
      .maybeSingle();

    if (error) {
      console.error("[admin/service-requests/status] update failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    if (!data) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json({ data }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[admin/service-requests/status] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
