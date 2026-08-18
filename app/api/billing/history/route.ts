import { NextRequest, NextResponse } from "next/server";

import {
  PLAN_PAYMENT_HISTORY_LIMIT,
  PLAN_PAYMENT_HISTORY_SELECT,
  mapPlanPaymentHistoryItems,
} from "@/lib/billing/planPaymentHistory";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(request: NextRequest) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("plan_payments")
    .select(PLAN_PAYMENT_HISTORY_SELECT)
    .eq("specialist_id", session.specialistId)
    .order("created_at", { ascending: false })
    .limit(PLAN_PAYMENT_HISTORY_LIMIT);

  if (error) {
    console.error("[api/billing/history] list failed", error.message);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    { items: mapPlanPaymentHistoryItems(data ?? []) },
    { status: 200, headers: NO_STORE },
  );
}
