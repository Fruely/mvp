import { NextResponse, type NextRequest } from "next/server";
import { resolveBearerAuthUser } from "@/lib/auth/resolveBearerAuthUser";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { selectInterestedSpecialist } from "@/lib/selection/selectSpecialist";
import { resolveViewer } from "@/lib/selection/view";
import { createSupabaseServerClient as createSessionClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const PUBLIC_ID = /^REQ-[0-9]{8}-[A-Z0-9]{6}$/;
const SPECIALIST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textField(body: unknown, key: string): string {
  if (!body || typeof body !== "object" || !(key in body)) return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
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
  const publicId = textField(body, "publicId");
  const specialistId = textField(body, "specialistId");
  if (!PUBLIC_ID.test(publicId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  if (!SPECIALIST_ID.test(specialistId)) {
    return NextResponse.json({ error: "not_selectable" }, { status: 400, headers: NO_STORE });
  }

  try {
    const supabase = createSupabaseServerClient();
    const requestRow = await supabase
      .from("service_requests")
      .select("id")
      .eq("public_id", publicId)
      .maybeSingle();
    if (!requestRow.data?.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
    }
    const viewer = await resolveViewer(supabase, {
      sessionUserId,
      accessToken: readRequestAccessToken(),
    });
    const result = await selectInterestedSpecialist(supabase, {
      requestId: String(requestRow.data.id),
      specialistId,
      actorUserId: viewer.actorUserId,
      anonymousAccess: !viewer.actorUserId && viewer.anonymousRequestId === String(requestRow.data.id),
    });
    if (!result.ok) {
      const status = result.error === "not_found" || result.error === "forbidden" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json(
      { ok: true, conversationId: result.conversationId, changed: result.changed },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    console.error("[client/select] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
