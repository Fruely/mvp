import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { PartnerDomainError } from "@/lib/partners/errors";
import { getPartnerForUser } from "@/lib/partners/session";
import { startStripeConnectOnboarding } from "@/lib/partners/stripeConnect";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

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

    const service = createServiceClient();
    const partner = await getPartnerForUser(user.id, service);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_bound" }, { status: 403, headers: NO_STORE });
    }

    if (!partner.contract_signed_at) {
      return NextResponse.json({ error: "agreement_required" }, { status: 403, headers: NO_STORE });
    }

    const origin = request.nextUrl.origin;
    const lang =
      request.nextUrl.searchParams.get("lang") === "ru" ||
      request.nextUrl.searchParams.get("lang") === "de"
        ? request.nextUrl.searchParams.get("lang")!
        : "ua";

    const result = await startStripeConnectOnboarding({
      partnerId: partner.id,
      returnUrl: `${origin}/${lang}/partners/payout-onboarding?stripe=return`,
      refreshUrl: `${origin}/${lang}/partners/payout-onboarding?stripe=refresh`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, reason: result.reason, message: result.message },
        { status: 200, headers: NO_STORE }
      );
    }

    return NextResponse.json({ ok: true, url: result.url }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/stripe-connect/start]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
