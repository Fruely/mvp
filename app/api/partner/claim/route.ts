import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { PartnerDomainError } from "@/lib/partners/errors";
import { consumeInvitation } from "@/lib/partners/invitations";

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

    const body = await request.json().catch(() => null);
    const token =
      body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string"
        ? (body as { token: string }).token
        : "";

    if (!token.trim()) {
      return NextResponse.json({ error: "invite_invalid" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createServiceClient();
    const result = await consumeInvitation(supabase, {
      token,
      userId: user.id,
      userEmail: user.email,
    });

    return NextResponse.json(
      {
        ok: true,
        partner_id: result.partnerId,
        already_bound: result.alreadyBound,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    if (err instanceof PartnerDomainError) {
      return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
    }
    console.error("[api/partner/claim]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
