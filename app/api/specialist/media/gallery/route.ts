import { NextRequest, NextResponse } from "next/server";

import { normalizeAccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { resolveSpecialistMediaContext } from "@/lib/specialistMedia/context";
import {
  addSpecialistGalleryImage,
  deleteSpecialistGalleryImage,
} from "@/lib/specialistMedia/mutateGallery";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveLang(request: NextRequest, bodyLang?: unknown) {
  const fromQuery = request.nextUrl.searchParams.get("lang");
  const raw = typeof bodyLang === "string" && bodyLang.trim() ? bodyLang : fromQuery;
  return normalizeAccountCapabilitiesLang(raw);
}

export async function POST(request: NextRequest) {
  const ctx = await resolveSpecialistMediaContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const idempotencyKey =
    typeof formData?.get("idempotency_key") === "string"
      ? String(formData.get("idempotency_key"))
      : null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request);
  const result = await addSpecialistGalleryImage(ctx, file, lang, idempotencyKey);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const ctx = await resolveSpecialistMediaContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const url = typeof body?.url === "string" ? body.url : null;
  if (!url) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request, body?.lang);
  const result = await deleteSpecialistGalleryImage(ctx, url, lang);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
