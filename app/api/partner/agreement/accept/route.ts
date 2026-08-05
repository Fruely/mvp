import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { acceptPartnerAgreement } from "@/lib/partners/agreement";
import { PartnerDomainError } from "@/lib/partners/errors";
import { ensureSelfServePartner } from "@/lib/partners/join";
import { getPartnerForUser } from "@/lib/partners/session";
import { PARTNER_AGREEMENT_VERSION } from "@/lib/partners/featureFlags";

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

    const body = await request.json().catch(() => ({}));
    const accepted =
      body &&
      typeof body === "object" &&
      (body as { accepted?: unknown }).accepted === true;
    if (!accepted) {
      return NextResponse.json({ error: "agreement_not_accepted" }, { status: 400, headers: NO_STORE });
    }

    const householdOk =
      body &&
      typeof body === "object" &&
      (body as { household_rules_accepted?: unknown }).household_rules_accepted === true;
    if (!householdOk) {
      return NextResponse.json(
        { error: "household_rules_not_accepted" },
        { status: 400, headers: NO_STORE }
      );
    }

    const version =
      body &&
      typeof body === "object" &&
      typeof (body as { agreement_version?: unknown }).agreement_version === "string"
        ? (body as { agreement_version: string }).agreement_version.trim()
        : PARTNER_AGREEMENT_VERSION;

    if (version !== PARTNER_AGREEMENT_VERSION) {
      return NextResponse.json({ error: "agreement_version_mismatch" }, { status: 400, headers: NO_STORE });
    }

    const localeRaw =
      body &&
      typeof body === "object" &&
      typeof (body as { agreement_locale?: unknown }).agreement_locale === "string"
        ? (body as { agreement_locale: string }).agreement_locale.trim()
        : null;

    const service = createServiceClient();
    let partner = await getPartnerForUser(user.id, service);
    if (!partner) {
      const ensured = await ensureSelfServePartner(service, {
        userId: user.id,
        email: user.email || "",
        name:
          typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === "string"
              ? user.user_metadata.name
              : null,
      });
      partner = ensured.partner;
    }

    const result = await acceptPartnerAgreement(service, {
      partnerId: partner.id,
      userId: user.id,
      agreementVersion: version,
      agreementLocale: localeRaw,
      userEmail: user.email,
    });

    return NextResponse.json(
      {
        ok: true,
        already_accepted: result.alreadyAccepted,
        agreement_version: version,
        accepted_at: result.partner.contract_signed_at,
        partner_status: result.partner.status,
        referral_code: result.partner.referral_code,
        next: "/partner/dashboard",
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/agreement/accept]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
