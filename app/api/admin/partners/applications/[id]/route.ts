import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { approveApplication, rejectApplication } from "@/lib/partners/applications";
import { createInvitation } from "@/lib/partners/invitations";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/partners/applications/id]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const { id } = await Promise.resolve(context.params);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const action = (body as { action?: unknown }).action;
    const supabase = createSupabaseServerClient();

    if (action === "approve") {
      const referralCode =
        typeof (body as { referral_code?: unknown }).referral_code === "string"
          ? (body as { referral_code: string }).referral_code
          : null;
      const commissionAmountCents =
        typeof (body as { commission_amount_cents?: unknown }).commission_amount_cents ===
        "number"
          ? (body as { commission_amount_cents: number }).commission_amount_cents
          : undefined;
      const createInvite = (body as { create_invite?: unknown }).create_invite === true;

      const result = await approveApplication(supabase, {
        applicationId: id,
        referralCode,
        commissionAmountCents,
        status: "active",
      });

      let invite: {
        invitation_id: string;
        token: string;
        expires_at: string;
        email: string;
      } | null = null;

      if (createInvite && !result.partner.user_id) {
        const created = await createInvitation(supabase, {
          partnerId: result.partner.id,
          email: result.partner.email,
        });
        invite = {
          invitation_id: created.invitationId,
          token: created.rawToken,
          expires_at: created.expiresAt,
          email: created.email,
        };
      }

      return NextResponse.json(
        {
          application_id: result.applicationId,
          partner: {
            id: result.partner.id,
            name: result.partner.name,
            email: result.partner.email,
            referral_code: result.partner.referral_code,
            status: result.partner.status,
            commission_amount_cents: result.partner.commission_amount_cents,
            user_id: result.partner.user_id,
          },
          invite,
        },
        { headers: NO_STORE }
      );
    }

    if (action === "reject") {
      const rejectReason =
        typeof (body as { reject_reason?: unknown }).reject_reason === "string"
          ? (body as { reject_reason: string }).reject_reason
          : null;
      await rejectApplication(supabase, { applicationId: id, rejectReason });
      return NextResponse.json({ ok: true, status: "rejected" }, { headers: NO_STORE });
    }

    return NextResponse.json({ error: "invalid_action" }, { status: 400, headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
}
