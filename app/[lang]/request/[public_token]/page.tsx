import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PromotionAttributionCaptureBeacon from "@/components/serviceRequests/PromotionAttributionCaptureBeacon";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { ATTRIBUTION_COOKIE_NAME } from "@/lib/serviceRequests/attributionCookie";
import { buildCaptureQueryString } from "@/lib/serviceRequests/attributionSanitize";
import { isAttributionTokenUrlSafe } from "@/lib/serviceRequests/attributionToken";
import { tryRecordPromotionRepeatVisit } from "@/lib/serviceRequests/capturePromotionAttribution";
import { getAttributionByToken } from "@/lib/serviceRequests/promotionAttributionData";
import {
  buildPromotedAcceptUrl,
  getPublishedPromotionPublicView,
} from "@/lib/serviceRequests/promotionPublicView";

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
  const view = await getPublishedPromotionPublicView(params.public_token);

  if (!view || view.locale !== lang) {
    notFound();
  }

  const cookieStore = cookies();
  const existingCookieToken = cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value;
  let needsCapture = true;

  if (existingCookieToken && isAttributionTokenUrlSafe(existingCookieToken)) {
    try {
      const row = await getAttributionByToken(existingCookieToken);
      if (row && row.promotion_id === view.id) {
        needsCapture = false;
        await tryRecordPromotionRepeatVisit({
          promotionId: view.id,
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
  const publishedLabel = view.published_at
    ? new Date(view.published_at).toLocaleDateString(
        lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA",
      )
    : null;

  const acceptHref = buildPromotedAcceptUrl(lang, params.public_token);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {needsCapture ? <PromotionAttributionCaptureBeacon captureQuery={captureQuery} /> : null}
      <article className="max-w-2xl mx-auto bg-white border rounded-lg p-6 shadow-sm space-y-6">
        {publishedLabel ? (
          <p className="text-sm text-gray-500">
            {t(dict, "serviceRequestPromotion.publishedAt", { defaultValue: "Опубликовано" })}
            {": "}
            {publishedLabel}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold text-gray-900">{view.public_title}</h1>
        <p className="whitespace-pre-wrap text-gray-700">{view.public_summary}</p>

        <dl className="grid gap-2 text-sm text-gray-700 border-t pt-4">
          {view.when_label ? (
            <div>
              <dt className="font-semibold">{t(dict, "serviceRequestPromotion.accept.when")}</dt>
              <dd>{view.when_label}</dd>
            </div>
          ) : null}
          {view.location_label ? (
            <div>
              <dt className="font-semibold">{t(dict, "serviceRequestPromotion.accept.where")}</dt>
              <dd>{view.location_label}</dd>
            </div>
          ) : null}
          {view.preferred_language ? (
            <div>
              <dt className="font-semibold">{t(dict, "serviceRequestPromotion.accept.language")}</dt>
              <dd>{view.preferred_language}</dd>
            </div>
          ) : null}
          {view.work_format ? (
            <div>
              <dt className="font-semibold">{t(dict, "serviceRequestPromotion.accept.format")}</dt>
              <dd>{view.work_format}</dd>
            </div>
          ) : null}
        </dl>

        <section className="border-t pt-6">
          <Link
            href={acceptHref}
            className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
          >
            {t(dict, "serviceRequestPromotion.accept.cta")}
          </Link>
        </section>
      </article>
    </div>
  );
}
