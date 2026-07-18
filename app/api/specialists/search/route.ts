import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { searchSpecialists } from "@/lib/search/specialistSearch";

export const dynamic = "force-dynamic";

/**
 * GET /api/specialists/search
 *
 * Thin HTTP wrapper around the shared `searchSpecialists` helper.
 * All business logic lives in lib/search/specialistSearch.ts so that
 * app/specialists/page.tsx can call it directly without an HTTP roundtrip.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lang = normalizeSearchLangToDbCode(searchParams.get("lang"));
  const category = searchParams.get("category")?.trim() || null;
  const mode = searchParams.get("mode")?.trim().toLowerCase() || null;
  const place = searchParams.get("place")?.trim() || null;
  const q = searchParams.get("q")?.trim() || null;
  const radiusRaw = Number(searchParams.get("radius") ?? "");
  const radius = Number.isFinite(radiusRaw) ? radiusRaw : null;
  const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

  const result = await searchSpecialists({ lang, category, mode, place, q, radius, offset });
  return jsonNoStore(result);
}
