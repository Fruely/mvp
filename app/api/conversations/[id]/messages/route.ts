import { NextResponse, type NextRequest } from "next/server";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { postConversationText } from "@/lib/selection/messages";
import { loadConversationForViewer, resolveViewer } from "@/lib/selection/view";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await Promise.resolve(context.params);
  const conversationId = decodeURIComponent(params.id ?? "").trim();
  if (!CONVERSATION_ID.test(conversationId)) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const text = body && typeof body === "object" && "body" in body ? body.body : null;

  try {
    const supabase = createSupabaseServerClient();
    const viewer = await resolveViewer(supabase, {
      sessionUserId,
      accessToken: readRequestAccessToken(),
    });
    const conversation = await loadConversationForViewer(supabase, { conversationId, viewer });
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const posted = await postConversationText(supabase, {
      conversationId,
      actor: conversation.role,
      authorUserId: viewer.actorUserId,
      body: typeof text === "string" ? text : "",
    });
    if ("error" in posted) {
      return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ok: true, id: posted.id }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[conversations/messages] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
