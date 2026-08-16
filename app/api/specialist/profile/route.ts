import { NextRequest, NextResponse } from "next/server";

import { normalizeAccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { loadSpecialistEditableProfile } from "@/lib/specialistProfile/loadProfile";
import {
  patchSpecialistEditableProfile,
  ProfilePatchValidationError,
} from "@/lib/specialistProfile/patchProfile";
import { pickEditableProfilePatch, findForbiddenProfilePatchKeys } from "@/lib/specialistProfile/patchWhitelist";
import {
  resolveSpecialistProfileBearerSession,
  resolveSpecialistProfileSession,
  specialistProfileSessionErrorCode,
  specialistProfileSessionErrorStatus,
} from "@/lib/specialistProfile/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function resolveLang(request: NextRequest, bodyLang?: unknown): ReturnType<typeof normalizeAccountCapabilitiesLang> {
  const fromQuery = request.nextUrl.searchParams.get("lang");
  const raw = typeof bodyLang === "string" && bodyLang.trim() ? bodyLang : fromQuery;
  return normalizeAccountCapabilitiesLang(raw);
}

export async function GET(request: NextRequest) {
  const session = await resolveSpecialistProfileBearerSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistProfileSessionErrorCode(session) },
      { status: specialistProfileSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const lang = resolveLang(request);

  try {
    const service = createSupabaseServerClient();
    const result = await loadSpecialistEditableProfile(service, session.specialistId, lang);
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    console.error("[api/specialist/profile] GET failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await resolveSpecialistProfileSession(request);
  if (session.kind !== "ok") {
    return NextResponse.json(
      { error: specialistProfileSessionErrorCode(session) },
      { status: specialistProfileSessionErrorStatus(session), headers: NO_STORE },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: NO_STORE });
  }

  const lang = resolveLang(request, body.lang);

  const forbidden = findForbiddenProfilePatchKeys(body);
  if (forbidden.length > 0) {
    return NextResponse.json(
      {
        error: "validation_error",
        code: "forbidden_fields",
        fields: Object.fromEntries(forbidden.map((field) => [field, "forbidden_fields"])),
      },
      { status: 422, headers: NO_STORE },
    );
  }

  const patch = pickEditableProfilePatch(body);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400, headers: NO_STORE });
  }

  try {
    const service = createSupabaseServerClient();
    const result = await patchSpecialistEditableProfile(
      service,
      session.specialistId,
      patch,
      lang,
    );
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (error) {
    if (error instanceof ProfilePatchValidationError) {
      return NextResponse.json(
        {
          error: "validation_error",
          code: error.code,
          fields: Object.fromEntries(error.fields.map((field) => [field, error.code])),
        },
        { status: 422, headers: NO_STORE },
      );
    }

    console.error("[api/specialist/profile] PATCH failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: NO_STORE });
  }
}
