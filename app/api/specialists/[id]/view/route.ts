import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

const VIEWER_COOKIE_NAME = "freuly_viewer_key";
const VIEWER_KEY_MAX_LEN = 64;
const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

function isValidViewerKey(value: string): boolean {
  const t = value.trim();
  if (t.length < 8 || t.length > VIEWER_KEY_MAX_LEN) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

function generateViewerKey(): string {
  return crypto.randomUUID();
}

function applyViewerCookie(
  response: ReturnType<typeof jsonNoStore>,
  viewerKey: string,
  setCookie: boolean
): ReturnType<typeof jsonNoStore> {
  if (setCookie) {
    response.cookies.set(VIEWER_COOKIE_NAME, viewerKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 400,
      path: "/",
    });
  }
  return response;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const param = (await Promise.resolve(params)).id;
    if (!param || typeof param !== "string" || param.trim().length === 0) {
      return jsonNoStore({ error: "Missing specialist id" }, { status: 400 });
    }

    const trim = param.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(trim);

    const cookieStore = cookies();
    const rawCookie = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
    let viewerKey: string | null =
      rawCookie && isValidViewerKey(rawCookie) ? rawCookie.trim().toLowerCase() : null;
    const mustSetCookie = viewerKey === null;
    if (viewerKey === null) {
      viewerKey = generateViewerKey();
    }

    const supabase = createSupabaseServerClient();

    const { data: specialist, error: specError } = await supabase
      .from("specialists")
      .select("id, status, is_active, is_visible")
      .eq(isUuid ? "id" : "slug", trim)
      .maybeSingle();

    if (specError) {
      return applyViewerCookie(
        jsonNoStore({ error: "Failed to verify specialist" }, { status: 500 }),
        viewerKey,
        mustSetCookie
      );
    }

    if (
      !specialist ||
      !specialist.is_active ||
      !specialist.is_visible ||
      !(VISIBLE_PUBLIC_SPECIALIST_STATUSES as readonly string[]).includes(specialist.status ?? "")
    ) {
      return applyViewerCookie(
        jsonNoStore({ error: "Specialist not found" }, { status: 404 }),
        viewerKey,
        mustSetCookie
      );
    }

    const specialistId = specialist.id as string;
    const sinceIso = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();

    const { data: existingRows, error: dupError } = await supabase
      .from("profile_view_events")
      .select("id")
      .eq("specialist_id", specialistId)
      .eq("viewer_key", viewerKey)
      .gte("created_at", sinceIso)
      .limit(1);

    if (dupError) {
      return applyViewerCookie(
        jsonNoStore({ error: "Failed to record view" }, { status: 500 }),
        viewerKey,
        mustSetCookie
      );
    }

    if (existingRows && existingRows.length > 0) {
      return applyViewerCookie(jsonNoStore({ ok: true, counted: false }), viewerKey, mustSetCookie);
    }

    const { error: insertError } = await supabase.from("profile_view_events").insert({
      specialist_id: specialistId,
      viewer_key: viewerKey,
    });

    if (insertError) {
      return applyViewerCookie(
        jsonNoStore({ error: "Failed to record view" }, { status: 500 }),
        viewerKey,
        mustSetCookie
      );
    }

    return applyViewerCookie(jsonNoStore({ ok: true, counted: true }), viewerKey, mustSetCookie);
  } catch {
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
  }
}
