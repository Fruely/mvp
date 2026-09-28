import { NextResponse, type NextRequest } from "next/server";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { resolveOwnedConversation, resolveViewer } from "@/lib/selection/view";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const PUBLIC_ID = /^REQ-[0-9]{8}-[A-Z0-9]{6}$/;

/** The signed-in client's active conversation for one owned request. */
export async function GET(
  request: NextRequest,
  context: { params: { publicId: string } | Promise<{ publicId: string }> },
) {
  const params = await Promise.resolve(context.params);
  const publicId = decodeURIComponent(params.publicId ?? "").trim();
  if (!PUBLIC_ID.test(publicId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "invalid") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  let sessionUserId = bearer.kind === "authenticated" ? bearer.userId : null;
  if (!sessionUserId) {
    const session = await createSessionClient().auth.getUser();
    sessionUserId = session.data.user?.id ?? null;
  }
  if (!sessionUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  try {
    const supabase = createSupabaseServerClient();
    const viewer = await resolveViewer(supabase, {
      sessionUserId,
      accessToken: readRequestAccessToken(),
    });
    const resolved = await resolveOwnedConversation(supabase, { publicId, viewer });
    if (resolved.status !== "ready") {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json(
      {
        conversation_id: resolved.conversationId,
        service_request_id: resolved.requestId,
        public_id: resolved.publicId,
        service_label: resolved.serviceLabel,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[requests/conversation] resolve failed", {
      name: error instanceof Error ? error.name : "Error",
    });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
