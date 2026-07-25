import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approveEligiblePendingCommissions } from "@/lib/partners/commissions";

/**
 * Daily approval pass for partner commissions past the 14-day validation period.
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Default assumption: payment still valid unless marked reversed via admin/webhook.
 * Does not execute payouts (PARTNER_PAYOUTS_ENABLED stays false until later).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const result = await approveEligiblePendingCommissions(supabase, {
      defaultPaymentValidity: "valid",
      actorLabel: "cron:partner-commissions-approve",
      limit: 200,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    console.error("[cron/partner-commissions-approve]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
