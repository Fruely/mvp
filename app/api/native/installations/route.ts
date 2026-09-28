import { NextResponse, type NextRequest } from "next/server";
import { installationCommand, registerNativeInstallation } from "@/lib/nativeInstallations/installations";
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
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  try {
    const result = await registerNativeInstallation(
      createSupabaseServerClient(),
      installationCommand(auth.userId, record),
    );
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400, headers: NO_STORE });
    return NextResponse.json({ installationId: result.installationId, active: true }, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[native/installations] register failed", { name: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
