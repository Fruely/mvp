import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/api/response";
import { CACHE_PUBLIC_RECOMMENDED, jsonWithCache } from "@/lib/http/cache";
import { toContentLocale } from "@/lib/localization";
import { fetchRecommendedSpecialistsCached } from "@/lib/homepage/fetchRecommendedSpecialists";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang");
  const contentLocale = toContentLocale(langParam);

  try {
    const data = await fetchRecommendedSpecialistsCached(langParam);
    return jsonWithCache({ data }, CACHE_PUBLIC_RECOMMENDED, {
      headers: {
        Vary: "Accept-Language",
        "X-Content-Locale": contentLocale ?? "legacy",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recommended specialists";
    return jsonNoStore({ error: message }, { status: 500 });
  }
}
