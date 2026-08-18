import { NextRequest, NextResponse } from "next/server";

import { normalizeAccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { resolveSpecialistMediaContext } from "@/lib/specialistMedia/context";
import {
  deleteSpecialistProfilePhoto,
  uploadSpecialistProfilePhoto,
} from "@/lib/specialistMedia/mutatePhoto";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveLang(request: NextRequest) {
  return normalizeAccountCapabilitiesLang(request.nextUrl.searchParams.get("lang"));
}

export async function POST(request: NextRequest) {
  const ctx = await resolveSpecialistMediaContext(request);
  if (ctx.kind === "error") {
    return NextResponse.json(ctx.body, { status: ctx.status, headers: NO_STORE });
  }

  const lang = resolveLang(request);
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "invalid_file" }, { status: 400, headers: NO_STORE });
  }

  const result = await uploadSpecialistProfilePhoto(ctx, file, lang);
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

  const lang = resolveLang(request);
  const result = await deleteSpecialistProfilePhoto(ctx, lang);
  if (!result.ok) {
    return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
  }

  return NextResponse.json(result.body, { status: result.status, headers: NO_STORE });
}
