import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  reconcileSpecialistAccess,
  isLifecycleReconciliationEnabled,
} from "@/lib/billing/specialistAccessLifecycle";

const BATCH_LIMIT = 100;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLifecycleReconciliationEnabled()) {
    return NextResponse.json({ skipped: true, reason: "lifecycle_reconciliation_disabled" });
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  // A) active with expired coverage — no Stripe webhook at expiry for manual payments
  const { data: expiredActive, error: eaError } = await supabase
    .from("specialist_plan")
    .select("specialist_id")
    .eq("plan_status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso)
    .order("expires_at", { ascending: true })
    .limit(BATCH_LIMIT);

  // B) grace/grace_period with expired grace_until
  const { data: expiredGrace, error: egError } = await supabase
    .from("specialist_plan")
    .select("specialist_id")
    .in("plan_status", ["grace", "grace_period"])
    .lt("grace_until", nowIso)
    .order("grace_until", { ascending: true })
    .limit(BATCH_LIMIT);

  if (eaError || egError) {
    console.error("[cron/reconcile-specialist-access] query failed", { eaError, egError });
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const row of [...(expiredActive ?? []), ...(expiredGrace ?? [])]) {
    const sid = typeof row.specialist_id === "string" ? row.specialist_id : null;
    if (!sid || seen.has(sid)) continue;
    seen.add(sid);
    candidates.push(sid);
  }

  let transitioned = 0;
  let errors = 0;

  for (const specialistId of candidates) {
    const result = await reconcileSpecialistAccess(supabase, specialistId);
    if (result.outcome === "success") {
      if (result.rpcOutcome === "transitioned") transitioned++;
    } else {
      errors++;
      console.error("[cron/reconcile-specialist-access] reconcile failed", {
        specialistId,
      });
    }
  }

  console.info("[cron/reconcile-specialist-access] sweep complete", {
    candidates: candidates.length,
    transitioned,
    errors,
  });

  return NextResponse.json({
    candidates: candidates.length,
    transitioned,
    errors,
  });
}
