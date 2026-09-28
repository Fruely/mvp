import { NextResponse, type NextRequest } from "next/server";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { deliverOutboxById } from "@/lib/inbox/delivery";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { postConversationText } from "@/lib/selection/messages";
import { loadConversationForViewer, resolveViewer, toTranscriptResponse, type Viewer } from "@/lib/selection/view";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function sessionUserIdFor(request: NextRequest): Promise<string | null | "invalid"> {
  const bearer = await resolveBearerAuthUser(request);
  if (bearer.kind === "invalid") return "invalid";
  if (bearer.kind === "authenticated") return bearer.userId;
  const session = await createSessionClient().auth.getUser();
  return session.data.user?.id ?? null;
}

async function viewerFor(request: NextRequest): Promise<{ viewer: Viewer; supabase: ReturnType<typeof createSupabaseServerClient> } | { error: "unauthorized" }> {
  const sessionUserId = await sessionUserIdFor(request);
  if (sessionUserId === "invalid") return { error: "unauthorized" };
  const supabase = createSupabaseServerClient();
  const viewer = await resolveViewer(supabase, {
    sessionUserId,
    accessToken: readRequestAccessToken(),
  });
  return { viewer, supabase };
}

/** Transcript for the signed-in client or the claimed specialist. Identity comes from the session. */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await Promise.resolve(context.params);
  const conversationId = decodeURIComponent(params.id ?? "").trim();
  if (!CONVERSATION_ID.test(conversationId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  const resolved = await viewerFor(request);
  if ("error" in resolved || !resolved.viewer.actorUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const conversation = await loadConversationForViewer(resolved.supabase, { conversationId, viewer: resolved.viewer });
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json(toTranscriptResponse(conversation), { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[conversations/messages] read failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await Promise.resolve(context.params);
  const conversationId = decodeURIComponent(params.id ?? "").trim();
  if (!CONVERSATION_ID.test(conversationId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const resolved = await viewerFor(request);
  if ("error" in resolved) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const text = body && typeof body === "object" && "body" in body ? body.body : null;

  try {
    const conversation = await loadConversationForViewer(resolved.supabase, { conversationId, viewer: resolved.viewer });
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const posted = await postConversationText(resolved.supabase, {
      conversationId,
      actor: conversation.role,
      authorUserId: resolved.viewer.actorUserId,
      body: typeof text === "string" ? text : "",
    });
    if ("error" in posted) {
      return NextResponse.json({ error: "invalid" }, { status: 400, headers: NO_STORE });
    }
    if (posted.outboxId) {
      try {
        await deliverOutboxById(resolved.supabase, posted.outboxId);
      } catch (error) {
        console.error("[conversations/messages] delivery failed", {
          name: error instanceof Error ? error.name : "Error",
        });
      }
    }
    return NextResponse.json({ ok: true, id: posted.id }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[conversations/messages] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
