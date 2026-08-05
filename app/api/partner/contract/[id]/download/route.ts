import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getPartnerContractDownloadBuffer } from "@/lib/partners/contractDocuments";
import { PartnerDomainError } from "@/lib/partners/errors";
import { requirePartnerApiSession } from "@/lib/partners/session";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const params = await Promise.resolve(context.params);
    const documentId = params?.id?.trim();
    if (!documentId) {
      return NextResponse.json({ error: "document_id_required" }, { status: 400, headers: NO_STORE });
    }

    const session = await requirePartnerApiSession();
    const supabase = createServiceClient();
    const result = await getPartnerContractDownloadBuffer(
      supabase,
      session.partner.id,
      documentId
    );
    if (!result) {
      return NextResponse.json({ error: "document_not_found" }, { status: 404, headers: NO_STORE });
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        ...NO_STORE,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/contract/download]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
