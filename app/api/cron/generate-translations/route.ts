import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateMissingDeUkTranslations } from "@/lib/translations/generateDeUkFromRu";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Protected cron/admin endpoint that backfills missing `de`/`uk` specialist
 * translations from existing `ru` rows. Reuses the shared generation logic.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (same convention as other crons).
 * Idempotent: only missing rows are created; existing rows are never touched.
 * DeepL failures are caught per-string and reported in the stats, never thrown.
 *
 * Optional query params:
 *   - maxProfiles: cap profile ru-rows scanned this run (bounded invocation)
 *   - maxServices: cap service ru-rows scanned this run
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deeplApiKey = process.env.DEEPL_API_KEY?.trim();
  if (!deeplApiKey) {
    console.error("[cron/generate-translations] DEEPL_API_KEY is not configured");
    return NextResponse.json(
      { error: "DEEPL_API_KEY is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const deeplApiUrl = process.env.DEEPL_API_URL?.trim() || undefined;

  const parseCap = (value: string | null): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  const url = new URL(request.url);
  const maxProfiles = parseCap(url.searchParams.get("maxProfiles"));
  const maxServices = parseCap(url.searchParams.get("maxServices"));

  const startedAt = Date.now();
  try {
    const supabase = createSupabaseServerClient();
    const stats = await generateMissingDeUkTranslations({
      supabase,
      deeplApiKey,
      deeplApiUrl,
      maxProfiles,
      maxServices,
    });

    const durationMs = Date.now() - startedAt;
    console.info("[cron/generate-translations] done", { ...stats, durationMs });

    return NextResponse.json(
      { success: true, durationMs, stats },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    // A fatal error (e.g. DB read failure) is logged and surfaced, but isolated
    // to this endpoint — it never affects the public site.
    console.error("[cron/generate-translations] fatal error", err);
    return NextResponse.json(
      { error: "Translation generation failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
