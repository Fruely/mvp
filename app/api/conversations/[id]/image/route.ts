import { NextResponse, type NextRequest } from "next/server";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { authorizeConversationImageUpload, conversationWriteStatus } from "@/lib/selection/conversationMedia";
import { loadConversationForViewer, resolveViewer, type Viewer } from "@/lib/selection/view";
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

/** Signed upload for one conversation JPEG. The path is chosen here. */
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
  if ("error" in resolved || !resolved.viewer.actorUserId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  try {
    const conversation = await loadConversationForViewer(resolved.supabase, { conversationId, viewer: resolved.viewer });
    if (!conversation) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const signed = await authorizeConversationImageUpload(resolved.supabase, {
      conversationId,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
    });
    if (!signed.ok) {
      const status = signed.error === "sign_failed" ? 500 : conversationWriteStatus(signed.error);
      return NextResponse.json({ error: signed.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json(
      {
        path: signed.path,
        token: signed.token,
        signed_url: signed.signedUrl,
        mime_type: signed.mimeType,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[conversations/image] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
