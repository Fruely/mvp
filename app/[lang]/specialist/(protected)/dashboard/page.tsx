export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getDictionary, isSupportedLang, type Dictionary } from "@/lib/i18n";
import SpecialistDashboardEditor from "./SpecialistDashboardEditor";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import VerificationBanner from "./VerificationBanner";

export default async function SpecialistDashboardPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  const dict: Dictionary = await getDictionary(lang);

  const status = specialist.status;

  if (status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data: specExtra } = await service
    .from("specialists")
    .select("postal_code, country_code, telegram_chat_id")
    .eq("id", specialist.id)
    .maybeSingle();

  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "").trim() ?? "";
  const telegramConnectHref =
    botUsername.length > 0
      ? `https://t.me/${botUsername}?start=${encodeURIComponent(specialist.id)}`
      : null;
  const telegramConnected = Boolean(String(specExtra?.telegram_chat_id ?? "").trim());
  const { data: profile } = await service
    .from("specialist_profiles")
    .select("photo_url, about_me, city, address, gallery_urls, video_url")
    .eq("specialist_id", specialist.id)
    .maybeSingle();
  const { data: servicesRows } = await service
    .from("specialist_services")
    .select("id, title, price_from, currency, is_active")
    .eq("specialist_id", specialist.id)
    .order("created_at", { ascending: false });
  const { data: categoriesRows } = await service
    .from("categories")
    .select("id, title, title_ru, title_de, title_ua, parent_id, slug")
    .or("parent_id.not.is.null,slug.eq.other")
    .order("title", { ascending: true });

  return (
    <div className="space-y-6">
      <VerificationBanner status={status} dict={dict} />
      <SpecialistDashboardEditor
        dict={dict}
        lang={lang}
        initialStatus={status || "draft"}
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
            typeof (specialist as unknown as Record<string, unknown>).work_format === "string" &&
            ((specialist as unknown as Record<string, unknown>).work_format === "online" ||
              (specialist as unknown as Record<string, unknown>).work_format === "offline" ||
              (specialist as unknown as Record<string, unknown>).work_format === "hybrid")
              ? ((specialist as unknown as Record<string, unknown>).work_format as "online" | "offline" | "hybrid")
              : "online",
          languages: Array.isArray((specialist as unknown as Record<string, unknown>).languages)
            ? ((specialist as unknown as Record<string, unknown>).languages as unknown[])
                .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          about_me: typeof profile?.about_me === "string" ? profile.about_me : "",
          video_url: typeof profile?.video_url === "string" ? profile.video_url : "",
          postal_code: typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "",
          country_code: typeof specExtra?.country_code === "string" ? specExtra.country_code : "DE",
          city: typeof profile?.city === "string" ? profile.city : "",
          address: typeof profile?.address === "string" ? profile.address : "",
          photo_url: typeof profile?.photo_url === "string" ? profile.photo_url : "",
          gallery_urls: Array.isArray(profile?.gallery_urls)
            ? profile.gallery_urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          services: (servicesRows ?? []).map((service) => ({
            id: String(service.id),
            title: typeof service.title === "string" ? service.title : "",
            price_from:
              typeof service.price_from === "number" && Number.isFinite(service.price_from)
                ? String(service.price_from)
                : "",
            currency: typeof service.currency === "string" && service.currency.trim() ? service.currency : "EUR",
            is_active: Boolean(service.is_active),
          })),
        }}
        categories={(categoriesRows ?? [])
          .filter(
            (category) =>
              typeof category?.id === "string" &&
              typeof category?.title === "string" &&
              (category.parent_id === null || typeof category.parent_id === "string") &&
              typeof category?.slug === "string"
          )
          .map((category) => {
            const row = category as {
              id: string;
              title: string;
              title_ru?: string | null;
              title_de?: string | null;
              title_ua?: string | null;
              parent_id: string | null;
              slug: string;
            };
            return {
              id: row.id,
              title: row.title,
              title_ru: row.title_ru,
              title_de: row.title_de,
              title_ua: row.title_ua,
              parent_id: row.parent_id,
              slug: row.slug,
            };
          })}
      />
    </div>
  );
}
