import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toContentLocale, type ContentLocale } from "@/lib/localization";
import {
  generateMissingTranslations,
  type TranslationRepairInstruction,
  type TranslatableField,
} from "@/lib/translations/generateMissingTranslations";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ACTIVE_TRANSLATION_LOCALES = ["ru", "uk", "de"] as const satisfies readonly ContentLocale[];
const PRODUCTION_SOURCE_LOCALE: ContentLocale = "ru";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

async function parseRepairInstructions(
  request: NextRequest
): Promise<
  | { repairs: TranslationRepairInstruction[] | undefined; error?: never }
  | { repairs?: never; error: string }
> {
  if (
    request.method !== "POST" ||
    !request.headers.get("content-type")?.includes("application/json")
  ) {
    return { repairs: undefined };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid JSON body" };
  }
  if (
    !body ||
    typeof body !== "object" ||
    !Object.prototype.hasOwnProperty.call(body, "repairs")
  ) {
    return { repairs: undefined };
  }

  const rawRepairs = (body as { repairs?: unknown }).repairs;
  if (!Array.isArray(rawRepairs) || rawRepairs.length === 0 || rawRepairs.length > 20) {
    return { error: "repairs must contain 1-20 exact instructions" };
  }

  const repairs: TranslationRepairInstruction[] = [];
  for (const raw of rawRepairs) {
    if (!raw || typeof raw !== "object") {
      return { error: "Invalid repair instruction" };
    }
    const item = raw as Record<string, unknown>;
    const entityType = item.entityType;
    const entityId = item.entityId;
    const sourceLocale = item.sourceLocale;
    const targetLocale = item.targetLocale;
    const field = item.field;
    const expectedCurrentHash = item.expectedCurrentHash;
    const expectedSourceHash = item.expectedSourceHash;
    const validLocale = (value: unknown): value is ContentLocale =>
      typeof value === "string" &&
      (ACTIVE_TRANSLATION_LOCALES as readonly string[]).includes(value);
    const validField =
      (entityType === "profile" && field === "about_me") ||
      (entityType === "service" &&
        ["title", "description", "price_comment"].includes(String(field)));

    if (
      (entityType !== "profile" && entityType !== "service") ||
      typeof entityId !== "string" ||
      !UUID_PATTERN.test(entityId) ||
      !validLocale(sourceLocale) ||
      !validLocale(targetLocale) ||
      sourceLocale === targetLocale ||
      !validField ||
      typeof expectedCurrentHash !== "string" ||
      !SHA256_PATTERN.test(expectedCurrentHash) ||
      (expectedSourceHash != null &&
        (typeof expectedSourceHash !== "string" ||
          !SHA256_PATTERN.test(expectedSourceHash)))
    ) {
      return { error: "Invalid repair instruction" };
    }

    repairs.push({
      entityType,
      entityId,
      sourceLocale,
      targetLocale,
      field: field as TranslatableField,
      expectedCurrentHash,
      ...(typeof expectedSourceHash === "string" ? { expectedSourceHash } : {}),
    });
  }

  return { repairs };
}

/**
 * Protected cron/admin endpoint that fills missing specialist translations.
 * Production V1 keeps the existing `ru` source behavior while the shared
 * generator accepts any canonical source/target locale pair.
 *
 * Auth: Authorization: Bearer <CRON_SECRET> (same convention as other crons).
 * Idempotent: only missing/blank fields are filled; non-empty fields are never
 * overwritten.
 * DeepL failures are caught per-string and reported in the stats, never thrown.
 *
 * Optional query params:
 *   - maxProfiles / maxServices: bounded invocation caps
 *   - sourceLocale: canonical source locale (defaults to production `ru`)
 *   - profileIds / serviceIds: comma-separated exact UUID scope (max 20 each)
 *   - dryRun=true: plan only; no DeepL calls or database writes
 * Repair mode (POST JSON only):
 *   - repairs: 1-20 exact entity/locale/field instructions with a full
 *     expectedCurrentHash SHA-256 guard and optional expectedSourceHash
 */
async function handle(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parseCap = (value: string | null): number | null => {
    if (value == null) return null;
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };
  const url = new URL(request.url);
  const maxProfiles = parseCap(url.searchParams.get("maxProfiles"));
  const maxServices = parseCap(url.searchParams.get("maxServices"));
  const dryRun = url.searchParams.get("dryRun") === "true";
  const repairParseResult = await parseRepairInstructions(request);
  if (repairParseResult.error) {
    return NextResponse.json(
      { error: repairParseResult.error },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const repairs = repairParseResult.repairs;
  const sourceLocaleInput = url.searchParams.get("sourceLocale");
  const sourceLocale = sourceLocaleInput
    ? toContentLocale(sourceLocaleInput)
    : PRODUCTION_SOURCE_LOCALE;
  if (!sourceLocale) {
    return NextResponse.json(
      { error: "Unsupported sourceLocale" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const parseIds = (value: string | null): string[] | undefined | null => {
    if (value == null) return undefined;
    const ids = Array.from(
      new Set(value.split(",").map((id) => id.trim()).filter(Boolean))
    );
    return ids.length <= 20 && ids.every((id) => UUID_PATTERN.test(id))
      ? ids
      : null;
  };
  const profileIds = parseIds(url.searchParams.get("profileIds"));
  const serviceIds = parseIds(url.searchParams.get("serviceIds"));
  if (profileIds === null || serviceIds === null) {
    return NextResponse.json(
      { error: "Invalid profileIds/serviceIds scope" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (
    repairs != null &&
    (sourceLocaleInput != null ||
      profileIds != null ||
      serviceIds != null ||
      maxProfiles != null ||
      maxServices != null)
  ) {
    return NextResponse.json(
      { error: "Repair mode cannot be combined with backfill scope parameters" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const deeplApiKey = process.env.DEEPL_API_KEY?.trim();
  if (!dryRun && !deeplApiKey) {
    console.error("[cron/generate-translations] DEEPL_API_KEY is not configured");
    return NextResponse.json(
      { error: "DEEPL_API_KEY is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const deeplApiUrl = process.env.DEEPL_API_URL?.trim() || undefined;

  const startedAt = Date.now();
  try {
    const supabase = createSupabaseServerClient();
    const stats = await generateMissingTranslations({
      supabase,
      deeplApiKey: deeplApiKey ?? "",
      deeplApiUrl,
      sourceLocale,
      targetLocales: ACTIVE_TRANSLATION_LOCALES,
      maxProfiles,
      maxServices,
      profileIds,
      serviceIds,
      dryRun,
      includePlan: profileIds != null || serviceIds != null,
      repairs,
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
