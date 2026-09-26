import { NextResponse, type NextRequest } from "next/server";
import { recordPushTap } from "@/lib/push/tap";
import { requirePushUser } from "@/lib/push/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const auth = await requirePushUser(request);
  if ("status" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const inboxId = body && typeof body === "object" && "inboxItemId" in body && typeof body.inboxItemId === "string"
    ? body.inboxItemId.trim()
    : "";
  if (!ID.test(inboxId)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  try {
    const result = await recordPushTap(createSupabaseServerClient(), { inboxId, userId: auth.userId });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404, headers: NO_STORE });
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[push/opened] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
