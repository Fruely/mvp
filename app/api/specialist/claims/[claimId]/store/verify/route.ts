import { NextRequest, NextResponse } from "next/server";
import { storeVerifyHttp } from "@/lib/billing/verifyAppleStorePurchase";
import {
  resolveSpecialistLeadSession,
  specialistLeadSessionErrorCode,
  specialistLeadSessionErrorStatus,
} from "@/lib/specialistLeads/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Verifies one Apple-signed transaction for the signed-in specialist's claim.
 * The body is only the signed transaction. The server resolves the claim,
 * offer, price, and conversation.
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
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  try {
    const result = await storeVerifyHttp({
      session,
      claimId: claimId ?? "",
      body,
      supabase: createSupabaseServerClient(),
    });
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/claims] store verify failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
