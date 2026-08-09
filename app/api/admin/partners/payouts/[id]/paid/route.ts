import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { markPartnerPayoutPaid } from "@/lib/partners/payouts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    const paymentReference =
      body && typeof body === "object" && typeof (body as { payment_reference?: unknown }).payment_reference === "string"
        ? (body as { payment_reference: string }).payment_reference.trim()
        : body && typeof body === "object" && typeof (body as { paymentReference?: unknown }).paymentReference === "string"
          ? (body as { paymentReference: string }).paymentReference.trim()
          : null;
    const adminNote =
      body && typeof body === "object" && typeof (body as { admin_note?: unknown }).admin_note === "string"
        ? (body as { admin_note: string }).admin_note.trim()
        : body && typeof body === "object" && typeof (body as { adminNote?: unknown }).adminNote === "string"
          ? (body as { adminNote: string }).adminNote.trim()
          : null;

    const { id } = await context.params;
    const supabase = createSupabaseServerClient();
    const result = await markPartnerPayoutPaid(supabase, {
      payoutId: id,
      paymentReference,
      adminNote,
      actorLabel: "admin_token",
    });
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[admin/partners/payouts/paid]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
