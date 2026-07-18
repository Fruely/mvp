import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";
import { PartnerDomainError } from "@/lib/partners/errors";
import { createPartner, listPartners, getPartnerSummary } from "@/lib/partners/service";
import type { PartnerStatus } from "@/lib/partners/types";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonError(err: unknown) {
  if (err instanceof PartnerDomainError) {
    return NextResponse.json({ error: err.code }, { status: err.status, headers: NO_STORE });
  }
  console.error("[admin/partners]", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const supabase = createSupabaseServerClient();
    const partners = await listPartners(supabase);
    const withSummary = await Promise.all(
      partners.map(async (p) => {
        const summary = await getPartnerSummary(supabase, p.id);
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          referral_code: p.referral_code,
          status: p.status,
          commission_amount_cents: p.commission_amount_cents,
          currency: p.currency,
          channel_name: p.channel_name,
          user_id: p.user_id,
          created_at: p.created_at,
          // Aggregates only — no specialist PII
          summary,
        };
      })
    );
    return NextResponse.json({ partners: withSummary }, { headers: NO_STORE });
  } catch (err) {
    return jsonError(err);
  }
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
    const result = await createPartner(supabase, {
      name: typeof body.name === "string" ? body.name : "",
      email: typeof body.email === "string" ? body.email : "",
      referralCode: typeof body.referral_code === "string" ? body.referral_code : "",
      channelName: typeof body.channel_name === "string" ? body.channel_name : null,
      channelUrl: typeof body.channel_url === "string" ? body.channel_url : null,
      commissionAmountCents:
        typeof body.commission_amount_cents === "number"
          ? body.commission_amount_cents
          : undefined,
      currency: typeof body.currency === "string" ? body.currency : undefined,
      status:
        body.status === "active" ||
        body.status === "pending" ||
        body.status === "paused" ||
        body.status === "rejected" ||
        body.status === "disabled"
          ? (body.status as PartnerStatus)
          : "pending",
    });

    return NextResponse.json(
      {
        partner: {
          id: result.partner.id,
          name: result.partner.name,
          email: result.partner.email,
          referral_code: result.partner.referral_code,
          status: result.partner.status,
          commission_amount_cents: result.partner.commission_amount_cents,
          currency: result.partner.currency,
        },
        default_link: {
          id: result.link.id,
          code: result.link.code,
          target_path: result.link.target_path,
          is_active: result.link.is_active,
          referral_path: `/r/${result.link.code}`,
        },
      },
      { status: 201, headers: NO_STORE }
    );
  } catch (err) {
    return jsonError(err);
  }
}
