import { NextResponse, type NextRequest } from "next/server";
import { deactivateNativeInstallation } from "@/lib/nativeInstallations/installations";
import { requireInstallationUser } from "@/lib/nativeInstallations/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const auth = await requireInstallationUser(request);
  if ("status" in auth) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const installationId =
    body && typeof body === "object" && "installationId" in body && typeof body.installationId === "string"
      ? body.installationId
      : "";
  try {
    const result = await deactivateNativeInstallation(createSupabaseServerClient(), {
      actorUserId: auth.userId,
      installationId,
    });
    if ("error" in result) {
      const status = result.error === "forbidden" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status, headers: NO_STORE });
    }
    return NextResponse.json({ active: false }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[native/installations] deactivate failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
