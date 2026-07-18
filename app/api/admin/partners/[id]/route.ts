import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import {
  getPartnerById,
  getPartnerSummary,
  setPartnerStatus,
  updatePartnerCommissionRate,
} from "@/lib/partners/service";
import type { PartnerStatus } from "@/lib/partners/types";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/partners/id]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const { id } = await Promise.resolve(context.params);
    const supabase = createSupabaseServerClient();
    const partner = await getPartnerById(supabase, id);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_found" }, { status: 404, headers: NO_STORE });
    }

    const [{ data: links }, { data: attributions }, { data: commissions }, summary] =
      await Promise.all([
        supabase.from("partner_links").select("id, code, campaign, target_path, is_active, created_at").eq("partner_id", id),
        supabase
          .from("partner_attributions")
          .select("id, specialist_id, attribution_method, registered_at, created_at")
          .eq("partner_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("partner_commissions")
          .select(
            "id, specialist_id, source_type, source_event_id, amount_cents, currency, status, earned_at, created_at"
          )
          .eq("partner_id", id)
          .order("created_at", { ascending: false })
          .limit(100),
        getPartnerSummary(supabase, id),
      ]);

    // Attribution/commission lists expose specialist_id (admin-only), never email/name.
    return NextResponse.json(
      {
        partner,
        links: links ?? [],
        attributions: attributions ?? [],
        commissions: commissions ?? [],
        summary,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    return jsonError(err);
  }
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

    const supabase = createSupabaseServerClient();
    let partner = await getPartnerById(supabase, id);
    if (!partner) {
      return NextResponse.json({ error: "partner_not_found" }, { status: 404, headers: NO_STORE });
    }

    if (typeof body.status === "string") {
      const status = body.status as PartnerStatus;
      if (!["pending", "active", "paused", "rejected", "disabled"].includes(status)) {
        return NextResponse.json({ error: "invalid_status" }, { status: 400, headers: NO_STORE });
      }
      partner = await setPartnerStatus(supabase, id, status);
    }

    if (typeof body.commission_amount_cents === "number") {
      partner = await updatePartnerCommissionRate(supabase, id, body.commission_amount_cents);
    }

    return NextResponse.json({ partner }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
}
