import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createPartnerLink, setPartnerLinkActive } from "@/lib/partners/service";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/partners/links]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const link = await createPartnerLink(supabase, {
      partnerId: typeof body.partner_id === "string" ? body.partner_id : "",
      code: typeof body.code === "string" ? body.code : "",
      campaign: typeof body.campaign === "string" ? body.campaign : null,
      targetPath: typeof body.target_path === "string" ? body.target_path : null,
      isActive: typeof body.is_active === "boolean" ? body.is_active : true,
    });

    return NextResponse.json(
      { link: { ...link, referral_path: `/r/${link.code}` } },
      { status: 201, headers: NO_STORE }
    );
  } catch (err) {
    return jsonError(err);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
    }
    if (typeof body.link_id !== "string" || typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "invalid_fields" }, { status: 400, headers: NO_STORE });
    }

    const supabase = createSupabaseServerClient();
    const link = await setPartnerLinkActive(supabase, body.link_id, body.is_active);
    return NextResponse.json({ link }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
}
