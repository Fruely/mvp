import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { SERVICE_REQUEST_LIST_SELECT } from "@/lib/serviceRequests/validation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const authResponse = requireAdminToken(request);
  if (authResponse) return authResponse;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_requests")
      .select(SERVICE_REQUEST_LIST_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/service-requests] list failed", error);
      return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[admin/service-requests] unexpected error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
