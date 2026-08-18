import { NextRequest, NextResponse } from "next/server";

import { normalizeAccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { resolveSpecialistMediaContext } from "@/lib/specialistMedia/context";
import { loadSpecialistMediaPage } from "@/lib/specialistMedia/loadMediaPage";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveLang(request: NextRequest) {
  return normalizeAccountCapabilitiesLang(request.nextUrl.searchParams.get("lang"));
}

export async function GET(request: NextRequest) {
  const ctx = await resolveSpecialistMediaContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const lang = resolveLang(request);

  try {
    const result = await loadSpecialistMediaPage(ctx.supabase, ctx.specialistId, lang);
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/media] GET failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
