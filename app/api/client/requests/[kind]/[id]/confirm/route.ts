import { NextRequest, NextResponse } from "next/server";

import { confirmServiceRequestConnection } from "@/lib/billing/confirmServiceRequestConnection";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
 * Client confirmation for one owned service request.
 * The body is ignored. Amount, specialist, claim, and PaymentIntent come from the server.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await resolveBearerAuthUser(request);
  if (auth.kind === "invalid" || auth.kind === "absent") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!serviceRequestKind(params.kind) || !params.id?.trim()) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  try {
    const result = await confirmServiceRequestConnection({
      supabase: createSupabaseServerClient(),
      publicId: params.id,
      clientUserId: auth.userId,
    });
    if (!result.ok) {
      const status =
        result.error === "not_found"
          ? 404
          : result.error === "payments_unavailable" || result.error === "retryable"
            ? 503
            : 409;
      return NextResponse.json({ error: result.error === "not_found" ? "not_found" : result.error }, {
        status,
        headers: NO_STORE,
      });
    }
    if (result.state === "connected") {
      return NextResponse.json(
        { ok: true, state: "connected", conversationId: result.conversationId },
        { status: 200, headers: NO_STORE },
      );
    }
    return NextResponse.json({ ok: true, state: "capture_pending" }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[client/requests/confirm] failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
