import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminToken } from "@/lib/adminApiAuth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Admin payout queue for manual bank-transfer lifecycle.
 */
export async function GET(request: NextRequest) {
  const auth = requireAdminToken(request);
  if (auth) return auth;

  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("partner_payouts")
      .select(
        "id, partner_id, amount_cents, requested_amount_cents, currency, status, requested_at, ready_at, paid_at, cancelled_at, payment_reference, admin_note, created_at, partners(name, referral_code)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[admin/partners/payouts/list]", error.message);
      return NextResponse.json({ error: "payout_list_failed" }, { status: 500, headers: NO_STORE });
    }

    const payouts = (data ?? []).map((row) => {
      const partner = row.partners as { name?: string; referral_code?: string } | null;
      return {
        id: row.id,
        partner_id: row.partner_id,
        partner_name: partner?.name ?? "Partner",
        partner_referral_code: partner?.referral_code ?? null,
        amount_cents: row.amount_cents,
        requested_amount_cents: row.requested_amount_cents,
        currency: row.currency,
        status: row.status,
        requested_at: row.requested_at,
        ready_at: row.ready_at,
        paid_at: row.paid_at,
        cancelled_at: row.cancelled_at,
        payment_reference: row.payment_reference,
        admin_note: row.admin_note,
        created_at: row.created_at,
      };
    });

    return NextResponse.json({ payouts }, { headers: NO_STORE });
  } catch (err) {
    console.error("[admin/partners/payouts/list]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500, headers: NO_STORE });
  }
}
