import { NextRequest, NextResponse } from "next/server";

import { normalizeAccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { resolveSpecialistServicesContext } from "@/lib/specialistServices/context";
import { loadSpecialistServicesPage } from "@/lib/specialistServices/loadServicesPage";
import {
  createSpecialistService,
  deleteSpecialistService,
  updateSpecialistService,
} from "@/lib/specialistServices/mutateService";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveLang(request: NextRequest, bodyLang?: unknown) {
  const fromQuery = request.nextUrl.searchParams.get("lang");
  const raw = typeof bodyLang === "string" && bodyLang.trim() ? bodyLang : fromQuery;
  return normalizeAccountCapabilitiesLang(raw);
}

export async function GET(request: NextRequest) {
  const ctx = await resolveSpecialistServicesContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const lang = resolveLang(request);

  try {
    const result = await loadSpecialistServicesPage(ctx, lang);
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/services] GET failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await resolveSpecialistServicesContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request, body.lang);
  const result = await createSpecialistService(ctx, body, lang);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const ctx = await resolveSpecialistServicesContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request, body.lang);
  const result = await updateSpecialistService(ctx, body, lang);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: 200, headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const ctx = await resolveSpecialistServicesContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request, body.lang);
  const result = await deleteSpecialistService(ctx, body, lang);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: 200, headers: NO_STORE });
}
