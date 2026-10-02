import { NextRequest, NextResponse } from "next/server";
import { reconcileExpiredServiceRequestConfirmations } from "@/lib/billing/expireServiceRequestConfirmation";
import { getStripeClient } from "@/lib/billing/stripeClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await reconcileExpiredServiceRequestConfirmations({
      supabase: createSupabaseServerClient(),
      stripe: getStripeClient(),
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[cron/service-request-confirmation-expiry] failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "expiry_failed" }, { status: 500 });
  }
}
