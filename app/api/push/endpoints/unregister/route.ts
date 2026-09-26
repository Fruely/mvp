import { NextResponse, type NextRequest } from "next/server";
import { unregisterPushEndpoint } from "@/lib/push/endpoints";
import { requirePushUser } from "@/lib/push/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const auth = await requirePushUser(request);
  if ("status" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const deviceId = body && typeof body === "object" && "deviceId" in body && typeof body.deviceId === "string" ? body.deviceId : "";
  try {
    const result = await unregisterPushEndpoint(createSupabaseServerClient(), { actorUserId: auth.userId, deviceId });
    if ("error" in result) {
      const status = result.error === "forbidden" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json({ disabled: true }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[push/unregister] failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
