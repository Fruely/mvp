import { NextRequest, NextResponse } from "next/server";

import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyClientBudgetReconciliation, parseBudgetAction } from "@/lib/serviceRequests/budgetReconciliation";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

type RouteParams = {
  params: {
    kind: string;
    id: string;
  };
};

function serviceRequestKind(value: string): boolean {
  return value === "service-request" || value === "service_request";
}

/**
 * Client accept or decline of an unresolved budget reconciliation.
 * The body may contain only `{ action: "accept" | "decline" }`.
 * The amount is the persisted server floor.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind === "invalid" || auth.kind === "absent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!serviceRequestKind(params.kind) || !params.id?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_action" }, { status: 400, headers: NO_STORE });
  }
  const action = parseBudgetAction(body);
  if (!action) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await applyClientBudgetReconciliation({
      supabase: createSupabaseServerClient(),
      publicId: params.id.trim(),
      clientUserId: auth.userId,
      action,
    });
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json(
      {
        ok: true,
        action: result.action,
        public_id: result.public_id,
        accepted_cents: result.accepted_cents,
        declined: result.declined,
        matches: result.matches,
        ...(result.budget_reconciliation ? { budget_reconciliation: result.budget_reconciliation } : {}),
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[client/requests/budget] failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
