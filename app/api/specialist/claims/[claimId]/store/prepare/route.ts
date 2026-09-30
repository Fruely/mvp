import { NextRequest, NextResponse } from "next/server";
import { prepareServiceRequestStorePayment } from "@/lib/billing/prepareServiceRequestStorePayment";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const CLAIM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Binds one reserved claim to the store payment sequence.
 * Identity comes from the session. The body is ignored.
 * This is not a purchase endpoint.
 */
export async function POST(
  request: NextRequest,
  context: { params: { claimId: string } | Promise<{ claimId: string }> },
) {
  const session = await resolveSpecialistLeadSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistLeadSessionErrorCode(session) },
      { status: specialistLeadSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const { claimId } = await Promise.resolve(context.params);
  if (!claimId || !CLAIM_ID.test(claimId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  try {
    const result = await prepareServiceRequestStorePayment({
      supabase: createSupabaseServerClient(),
      claimId,
      specialistId: session.specialistId,
    });
    if (!result.ok) {
      const status =
        result.error === "forbidden"
          ? 403
          : result.error === "not_found"
            ? 404
            : result.error === "retryable"
              ? 503
              : 409;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true, state: result.state }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/claims] store prepare failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
