export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { notify } from "@/lib/notifications/notify";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getDictionary, isSupportedLang, type Dictionary } from "@/lib/i18n";
import SpecialistDashboardEditor from "../SpecialistDashboardEditor";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import VerificationBanner from "../VerificationBanner";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";
import { getDashboardCategoryOptions } from "@/lib/categories/dashboardCategoryOptions";

export default async function SpecialistDashboardProfilePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);
  const service = createServiceClient();

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const [specExtraResult, profileResult, servicesResult, categoriesRows, plan] =
    await Promise.all([
      service
        .from("specialists")
        .select(
          "postal_code, country_code, telegram_chat_id, mobile_service, service_radius_km, work_format, languages, avatar_url, lat, lng",
        )
        .eq("id", specialist.id)
        .maybeSingle(),
      service
        .from("specialist_profiles")
        .select("photo_url, photo_source_url, homepage_photo_url, homepage_photo, about_me, city, address, gallery_urls, certificate_urls, video_url")
        .eq("specialist_id", specialist.id)
        .maybeSingle(),
      service
        .from("specialist_services")
        .select("id, title, price_from, is_active, price_comment, pricing_exception, pricing_type, price_to")
        .eq("specialist_id", specialist.id)
        .order("created_at", { ascending: false }),
      getDashboardCategoryOptions(),
      getSpecialistPlanForDashboard(service, specialist.id),
    ]);

  const specExtra = specExtraResult.data;
  const profile = profileResult.data;
  const servicesRows = servicesResult.data;

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() ?? "";
  const telegramConnectHref =
    botUsername.length > 0
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(specialist.id)}`
      : null;
  const telegramConnected = Boolean(String(specExtra?.telegram_chat_id ?? "").trim());

  const entitlements = resolveSpecialistEntitlements(plan);

  return (
    <div className="space-y-freuly-8">
      <VerificationBanner status={status} dict={dict} />
      <SpecialistDashboardEditor
        dict={dict}
        lang={lang}
        galleryLimit={entitlements.galleryLimit}
        effectivePaidPlan={entitlements.effectivePaidPlan}
        initialStatus={status || "draft"}
        specialistId={specialist.id}
        homepagePhoto={{
          photo_source_url:
            typeof profile?.photo_source_url === "string" ? profile.photo_source_url : null,
          homepage_photo_url:
            typeof profile?.homepage_photo_url === "string" ? profile.homepage_photo_url : null,
          homepage_photo: profile?.homepage_photo ?? null,
        }}
        telegramConnected={telegramConnected}
        telegramConnectHref={telegramConnectHref}
        initialData={{
          name: specialist.first_name?.trim() || specialist.name?.trim() || "",
          email: specialist.email || "",
          phone: specialist.phone || "",
          category_id:
            typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
              ? ((specialist as unknown as Record<string, unknown>).category_id as string)
              : "",
          work_format:
            specExtra?.work_format === "online" ||
            specExtra?.work_format === "offline" ||
            specExtra?.work_format === "hybrid"
              ? (specExtra.work_format as "online" | "offline" | "hybrid")
              : "online",
          languages: Array.isArray(specExtra?.languages)
            ? (specExtra.languages as unknown[]).filter(
                (value): value is string => typeof value === "string" && value.trim().length > 0,
              )
            : [],
          about_me: typeof profile?.about_me === "string" ? profile.about_me : "",
          video_url: typeof profile?.video_url === "string" ? profile.video_url : "",
          postal_code: typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "",
          country_code:
            typeof specExtra?.country_code === "string" ? specExtra.country_code : "",
          mobile_service: Boolean(specExtra?.mobile_service),
          service_radius_km:
            typeof specExtra?.service_radius_km === "number" && Number.isFinite(specExtra.service_radius_km)
              ? String(specExtra.service_radius_km)
              : "",
          city: typeof profile?.city === "string" ? profile.city : "",
          lat:
            typeof specExtra?.lat === "number" && Number.isFinite(specExtra.lat)
              ? specExtra.lat
              : null,
          lng:
            typeof specExtra?.lng === "number" && Number.isFinite(specExtra.lng)
              ? specExtra.lng
              : null,
          address: typeof profile?.address === "string" ? profile.address : "",
          photo_url:
            typeof specExtra?.avatar_url === "string" && specExtra.avatar_url.trim()
              ? specExtra.avatar_url
              : typeof profile?.photo_url === "string"
                ? profile.photo_url
                : "",
          gallery_urls: Array.isArray(profile?.gallery_urls)
            ? profile.gallery_urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          certificate_urls: Array.isArray(profile?.certificate_urls)
            ? profile.certificate_urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          services: (servicesRows ?? []).map((service) => ({
            id: String(service.id),
            title: typeof service.title === "string" ? service.title : "",
            price_from:
              typeof service.price_from === "number" && Number.isFinite(service.price_from)
                ? String(service.price_from)
                : "",
            is_active: Boolean(service.is_active),
            price_comment: service.price_comment != null ? String(service.price_comment) : "",
            pricing_exception:
              service.pricing_exception === "THIRD_PARTY_FUNDED" ||
              service.pricing_exception === "AFTER_ASSESSMENT"
                ? service.pricing_exception
                : null,
            pricing_type:
              service.pricing_type === "fixed" ||
              service.pricing_type === "range" ||
              service.pricing_type === "hourly"
                ? service.pricing_type
                : undefined,
          })),
        }}
        categories={categoriesRows}
      />
    </div>
  );
}
