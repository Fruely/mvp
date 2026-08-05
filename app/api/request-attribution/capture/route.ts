import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isSupportedLang } from "@/lib/i18n";
import {
  ATTRIBUTION_COOKIE_NAME,
  buildAttributionCookieOptions,
} from "@/lib/serviceRequests/attributionCookie";
import { sanitizeUtmFields, parseReferrerHost } from "@/lib/serviceRequests/attributionSanitize";
import { createPromotionAttributionCapture } from "@/lib/serviceRequests/capturePromotionAttribution";
import { getPublishedPromotionForCapture } from "@/lib/serviceRequests/promotionPublicData";
import { isPromotionTokenUrlSafe } from "@/lib/serviceRequests/promotionToken";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lang = searchParams.get("lang")?.trim() ?? "";
  const publicToken = searchParams.get("public_token")?.trim() ?? "";

  if (!isSupportedLang(lang) || !publicToken || !isPromotionTokenUrlSafe(publicToken)) {
    return new NextResponse(null, { status: 404 });
  }

  const promotion = await getPublishedPromotionForCapture(publicToken);
  if (!promotion || promotion.locale !== lang) {
    return new NextResponse(null, { status: 404 });
  }

  const utm = sanitizeUtmFields(searchParams);
  const referrerHost = parseReferrerHost(request.headers.get("referer"));
  const result = await createPromotionAttributionCapture({
    promotionId: promotion.id,
    landingLocale: lang,
    utm,
    referrerHost,
  });

  if (!result.ok || !result.needsCookie) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieStore = cookies();
  cookieStore.set(
    ATTRIBUTION_COOKIE_NAME,
    result.cookieToken,
    buildAttributionCookieOptions(),
  );

  return new NextResponse(null, { status: 204 });
}
