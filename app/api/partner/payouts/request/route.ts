import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { PartnerDomainError } from "@/lib/partners/errors";
import { requestPartnerPayout } from "@/lib/partners/payouts";
import { getPartnerForUser } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Request manual bank-transfer payout for one approved commission (MVP).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await auth.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401, headers: NO_STORE });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    let commissionRefs: string[] = [];
    if (Array.isArray((body as { commission_refs?: unknown }).commission_refs)) {
      commissionRefs = (body as { commission_refs: unknown[] }).commission_refs
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim())
        .filter(Boolean);
    } else if (Array.isArray((body as { commissionRefs?: unknown }).commissionRefs)) {
      commissionRefs = (body as { commissionRefs: unknown[] }).commissionRefs
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim())
        .filter(Boolean);
    }

    const service = createServiceClient();
    const partner = await getPartnerForUser(user.id, service);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_bound" }, { status: 403, headers: NO_STORE });
    }

    const result = await requestPartnerPayout(service, {
      partnerId: partner.id,
      userId: user.id,
      commissionRefs,
    });

    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/payouts/request]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
