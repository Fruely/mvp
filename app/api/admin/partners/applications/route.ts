import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { listApplications } from "@/lib/partners/applications";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam === "pending" || statusParam === "approved" || statusParam === "rejected"
        ? statusParam
        : undefined;
    const supabase = createSupabaseServerClient();
    const applications = await listApplications(supabase, status);
    return NextResponse.json({ applications }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[admin/partners/applications]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
