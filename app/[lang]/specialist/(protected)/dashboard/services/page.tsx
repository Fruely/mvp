export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import ServicesTable from "@/components/dashboard/ServicesTable";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import type { SpecialistService } from "@/lib/dashboard/services";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getDictionary, isSupportedLang, t } from "@/lib/i18n";

export default async function SpecialistDashboardServicesPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams?: { from?: string | string[] } | Promise<{ from?: string | string[] }>;
}) {
  const resolved = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams ?? {});
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const fromRaw = resolvedSearch.from;
  const fromParam = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  const showOnboardingReturn = fromParam === "onboarding";
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const dict = await getDictionary(lang);

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const { data, error } = await service
    .from("specialist_services")
    .select(
      "id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, created_at, updated_at"
    )
    .eq("specialist_id", specialist.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard/services] failed to load services", error);
  }

  const services: SpecialistService[] = (data ?? []).map((row) => ({
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : null,
    price_comment: typeof row.price_comment === "string" ? row.price_comment : null,
    pricing_type:
      row.pricing_type === "fixed" || row.pricing_type === "range" || row.pricing_type === "hourly"
        ? row.pricing_type
        : "fixed",
    price_from: typeof row.price_from === "number" ? row.price_from : 0,
    price_to: typeof row.price_to === "number" ? row.price_to : null,
    currency: typeof row.currency === "string" && row.currency.trim() ? row.currency : "EUR",
    duration_minutes:
      typeof row.duration_minutes === "number" && Number.isFinite(row.duration_minutes)
        ? row.duration_minutes
        : null,
    is_active: Boolean(row.is_active),
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
  const hasOnboardingPublishableService = services.some(
    (item) => item.is_active && Number.isFinite(item.price_from) && item.price_from > 0,
  );

  const onboardingServicesStepHref = `/${lang}/specialist/dashboard/onboarding?step=services`;
  const onboardingPhotosStepHref = `/${lang}/specialist/dashboard/onboarding?step=photos`;

  return (
    <>
      {showOnboardingReturn ? (
        <section className="mb-6 rounded-xl border border-blue-100 bg-blue-50/90 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-blue-950">
                {t(dict, "dashboard.onboarding.servicesContextBanner.title")}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-blue-900/90">
                {t(dict, "dashboard.onboarding.servicesContextBanner.body")}
              </p>
            </div>
            <Link
              href={onboardingServicesStepHref}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-blue-800 ring-1 ring-blue-200/80 transition hover:bg-blue-50"
            >
              {t(dict, "dashboard.onboarding.servicesContextBanner.back")}
            </Link>
          </div>
        </section>
      ) : null}
      <ServicesTable
        initialServices={services}
        lang={lang}
        dict={dict}
        onboardingReturnHref={showOnboardingReturn ? onboardingPhotosStepHref : undefined}
        initialShowCreate={showOnboardingReturn && !hasOnboardingPublishableService}
      />
    </>
  );
}
