import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PromotionAttributionCaptureBeacon from "@/components/serviceRequests/PromotionAttributionCaptureBeacon";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import {
  ATTRIBUTION_COOKIE_NAME,
} from "@/lib/serviceRequests/attributionCookie";
import { buildCaptureQueryString } from "@/lib/serviceRequests/attributionSanitize";
import { isAttributionTokenUrlSafe } from "@/lib/serviceRequests/attributionToken";
import { tryRecordPromotionRepeatVisit } from "@/lib/serviceRequests/capturePromotionAttribution";
import { getAttributionByToken } from "@/lib/serviceRequests/promotionAttributionData";
import { getPublishedPromotionForCapture } from "@/lib/serviceRequests/promotionPublicData";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; public_token: string };
}): Promise<Metadata> {
  if (!isSupportedLang(params.lang)) {
    return { robots: { index: false, follow: false } };
  }

  const dict = await getDictionary(params.lang as Lang);
  const title = t(dict, "serviceRequestPromotion.pageTitle");

  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function PublicPromotionPage({
  params,
  searchParams,
}: {
  params: { lang: string; public_token: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!isSupportedLang(params.lang)) {
    notFound();
  }

  const lang = params.lang as Lang;
  const promotion = await getPublishedPromotionForCapture(params.public_token);

  if (!promotion || promotion.locale !== lang) {
    notFound();
  }

  const cookieStore = cookies();
  const existingCookieToken = cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value;
  let needsCapture = true;

  if (existingCookieToken && isAttributionTokenUrlSafe(existingCookieToken)) {
    try {
      const row = await getAttributionByToken(existingCookieToken);
      if (row && row.promotion_id === promotion.id) {
        needsCapture = false;
        await tryRecordPromotionRepeatVisit({
          promotionId: promotion.id,
          existingCookieToken,
        });
      }
    } catch {
      console.error("[attribution/capture] repeat visit lookup failed");
    }
  }

  const captureQuery = needsCapture
    ? buildCaptureQueryString(lang, params.public_token, searchParams)
    : "";

  const dict = await getDictionary(lang);
  const publishedLabel = promotion.published_at
    ? new Date(promotion.published_at).toLocaleDateString(
        lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA",
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {needsCapture ? <PromotionAttributionCaptureBeacon captureQuery={captureQuery} /> : null}
      <article className="max-w-2xl mx-auto bg-white border rounded-lg p-6 shadow-sm">
        {publishedLabel ? (
          <p className="text-sm text-gray-500 mb-3">
            {t(dict, "serviceRequestPromotion.publishedAt", { defaultValue: "Опубликовано" })}
            {": "}
            {publishedLabel}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold mb-4">{promotion.public_title}</h1>
        <p className="whitespace-pre-wrap text-gray-700 mb-8">{promotion.public_summary}</p>
        <p className="text-sm text-gray-600 border-t pt-4">
          {t(dict, "serviceRequestPromotion.specialistCta")}
        </p>
      </article>
    </div>
  );
}
