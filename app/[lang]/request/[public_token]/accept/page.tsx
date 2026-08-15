import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PromotedReservationCheckoutButton from "@/components/billing/PromotedReservationCheckoutButton";
import PromotionAttributionCaptureBeacon from "@/components/serviceRequests/PromotionAttributionCaptureBeacon";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServerClient as createAuthClient } from "@/lib/supabase/auth-server";
import { getDictionary, isSupportedLang, t, type Lang } from "@/lib/i18n";
import { ATTRIBUTION_COOKIE_NAME } from "@/lib/serviceRequests/attributionCookie";
import { buildCaptureQueryString } from "@/lib/serviceRequests/attributionSanitize";
import {
  buildPromotedPublicUrl,
  getPublishedPromotionPublicView,
} from "@/lib/serviceRequests/promotionPublicView";
import { tryBindPromotionAttributionFromCookie } from "@/lib/serviceRequests/tryBindPromotionAttributionFromCookie";

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
  return {
    title: t(dict, "serviceRequestPromotion.accept.pageTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function PromotedRequestAcceptPage({
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

  const dict = await getDictionary(lang);
  const reservationState =
    typeof searchParams.reservation === "string" ? searchParams.reservation : null;

  const auth = createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const cookieStore = cookies();
  const attributionCookie = cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value;

  if (user?.id) {
    const service = createSupabaseServerClient();
    const { data: specialist } = await service
      .from("specialists")
      .select("id")
      .eq("user_id", user.id)
      .neq("status", "blocked")
      .maybeSingle();

    if (specialist?.id) {
      await tryBindPromotionAttributionFromCookie({
        cookieRaw: attributionCookie,
        userId: user.id,
        specialistId: specialist.id,
        supabase: service,
      });
      redirect(`/${lang}/specialist/dashboard/requests/promoted`);
    }
  }

  const captureQuery = buildCaptureQueryString(lang, params.public_token, searchParams);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <PromotionAttributionCaptureBeacon captureQuery={captureQuery} />
      <article className="max-w-2xl mx-auto bg-white border rounded-lg p-6 shadow-sm space-y-6">
        <Link
          href={buildPromotedPublicUrl(lang, params.public_token)}
          className="text-sm font-semibold text-emerald-700 hover:underline"
        >
          {t(dict, "serviceRequestPromotion.accept.backToPreview")}
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{view.public_title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-gray-700">{view.public_summary}</p>
        </div>

        <dl className="grid gap-2 text-sm text-gray-700">
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

        <section className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(dict, "serviceRequestPromotion.accept.reservationTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-gray-700">
            {t(dict, "serviceRequestPromotion.accept.reservationBody")}
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            {t(dict, "serviceRequestPromotion.accept.reservationNonRefund")}
          </p>
          {reservationState === "success" ? (
            <p className="text-sm font-medium text-emerald-800" role="status">
              {t(dict, "serviceRequestPromotion.accept.paymentPendingRegistration")}
            </p>
          ) : null}
          {reservationState === "cancel" ? (
            <p className="text-sm text-gray-600" role="status">
              {t(dict, "serviceRequestPromotion.accept.paymentCancelled")}
            </p>
          ) : null}
          <PromotedReservationCheckoutButton
            lang={lang}
            dict={dict}
            publicToken={params.public_token}
          />
          <p className="text-xs text-gray-600">
            {t(dict, "serviceRequestPromotion.accept.registerHint")}{" "}
            <Link
              href={`/${lang}/become-specialist`}
              className="font-semibold text-emerald-700 hover:underline"
            >
              {t(dict, "serviceRequestPromotion.signupCta.button")}
            </Link>
          </p>
        </section>
      </article>
    </div>
  );
}
