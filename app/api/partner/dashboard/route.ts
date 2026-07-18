import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { PartnerDomainError } from "@/lib/partners/errors";
import { getPartnerDashboard, type DashboardPeriod } from "@/lib/partners/dashboard";
import { requirePartnerApiSession } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[api/partner/dashboard]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requirePartnerApiSession();
    const periodParam = request.nextUrl.searchParams.get("period");
    const period: DashboardPeriod = periodParam === "all" ? "all" : "month";

    // Never accept client partnerId — always session partner
    const supabase = createServiceClient();
    const dashboard = await getPartnerDashboard(supabase, session.partner.id, period);

    return NextResponse.json(
      {
        ...dashboard,
        access_mode: session.accessMode,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    return jsonError(err);
  }
}
