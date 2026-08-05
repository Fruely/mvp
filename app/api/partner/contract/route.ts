import { NextResponse } from "next/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { listPartnerContractDocuments } from "@/lib/partners/contractDocuments";
import { PartnerDomainError } from "@/lib/partners/errors";
import { isEmailConfigured } from "@/lib/email";
import { requirePartnerApiSession } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  try {
    const session = await requirePartnerApiSession();
    const supabase = createServiceClient();
    const documents = await listPartnerContractDocuments(supabase, session.partner.id);

    return NextResponse.json(
      {
        documents: documents.map((d) => ({
          id: d.id,
          agreement_version: d.agreement_version,
          agreement_locale: d.agreement_locale,
          accepted_at: d.accepted_at,
          issued_at: d.issued_at,
          document_number: d.document_number,
          status: d.status,
          emailed_at: d.emailed_at,
        })),
        email_available: isEmailConfigured(),
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/contract]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
