export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import ServicesTable from "@/components/dashboard/ServicesTable";
import { Alert } from "@/components/ui";
import { hasValidServiceForPublish } from "@/lib/dashboard/publicationValidator";
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
  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);
  const service = createServiceClient();
  const specialistCategoryId =
    typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
      ? ((specialist as unknown as Record<string, unknown>).category_id as string).trim()
      : "";

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  if (showOnboardingReturn && specialistCategoryId.length === 0) {
    redirect(`/${lang}/specialist/dashboard/onboarding?step=basic`);
  }

  const { data, error } = await service
    .from("specialist_services")
    .select(
      "id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, category_id, created_at, updated_at"
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
    currency: "EUR",
    duration_minutes:
      typeof row.duration_minutes === "number" && Number.isFinite(row.duration_minutes)
        ? row.duration_minutes
        : null,
    is_active: Boolean(row.is_active),
    category_id: typeof row.category_id === "string" ? row.category_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
  const servicesInSelectedCategory = services.filter(
    (item) => item.category_id === specialistCategoryId,
  );
  const hasServicesOutsideSelectedCategory = services.some(
    (item) => item.category_id !== specialistCategoryId,
  );
  const hasOnboardingPublishableService = hasValidServiceForPublish(servicesInSelectedCategory);

  const onboardingPhotosStepHref = `/${lang}/specialist/dashboard/onboarding?step=photos`;

  if (showOnboardingReturn && hasOnboardingPublishableService) {
    redirect(onboardingPhotosStepHref);
  }

  return (
    <div className="space-y-freuly-8">
      {showOnboardingReturn ? (
        <Alert variant="info" title={t(dict, "dashboard.onboarding.servicesContextBanner.title")}>
          {t(dict, "dashboard.onboarding.servicesContextBanner.body")}
        </Alert>
      ) : null}
      <ServicesTable
        initialServices={services}
        lang={lang}
        dict={dict}
        onboardingReturnHref={showOnboardingReturn ? onboardingPhotosStepHref : undefined}
        initialShowCreate={showOnboardingReturn}
        currentCategoryId={specialistCategoryId || null}
        hasServicesOutsideSelectedCategory={hasServicesOutsideSelectedCategory}
      />
    </div>
  );
}
