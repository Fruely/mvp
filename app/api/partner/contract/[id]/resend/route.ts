import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { resendPartnerContractEmail } from "@/lib/partners/contractDocuments";
import { PartnerDomainError } from "@/lib/partners/errors";
import { isEmailConfigured } from "@/lib/email";
import { requirePartnerApiSession } from "@/lib/partners/session";
import type { Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!isEmailConfigured()) {
      return NextResponse.json({ error: "email_unavailable" }, { status: 503, headers: NO_STORE });
    }

    const params = await Promise.resolve(context.params);
    const documentId = params?.id?.trim();
    if (!documentId) {
      return NextResponse.json({ error: "document_id_required" }, { status: 400, headers: NO_STORE });
    }

    const session = await requirePartnerApiSession();
    const body = await request.json().catch(() => ({}));
    const localeRaw =
      body && typeof body === "object" && typeof (body as { locale?: unknown }).locale === "string"
        ? (body as { locale: string }).locale.trim()
        : "de";
    const locale = (["de", "ru", "ua"].includes(localeRaw) ? localeRaw : "de") as Lang;

    const supabase = createServiceClient();
    const sent = await resendPartnerContractEmail(
      supabase,
      session.partner.id,
      documentId,
      session.user.email || session.partner.email,
      locale
    );
    if (!sent) {
      return NextResponse.json({ error: "email_send_failed" }, { status: 500, headers: NO_STORE });
    }

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/contract/resend]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
