import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createInvitation } from "@/lib/partners/invitations";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/partners/invite]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const { id } = await Promise.resolve(context.params);
    const body = await request.json().catch(() => ({}));
    const email =
      body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string"
        ? (body as { email: string }).email
        : null;

    const supabase = createSupabaseServerClient();
    const invite = await createInvitation(supabase, {
      partnerId: id,
      email,
      createdByLabel: "admin_token",
    });

    // Raw token returned once for admin to share (email send deferred)
    return NextResponse.json(
      {
        invitation_id: invite.invitationId,
        email: invite.email,
        expires_at: invite.expiresAt,
        token: invite.rawToken,
        claim_path_template: "/{lang}/partner/claim?token=…",
      },
      { status: 201, headers: NO_STORE }
    );
  } catch (err) {
    return jsonError(err);
  }
}
