export const dynamic = "force-dynamic";

import SpecialistOnboardingWizard from "@/components/dashboard/onboarding/SpecialistOnboardingWizard";
import type { OnboardingChecklistItem } from "@/components/dashboard/onboarding/OnboardingChecklist";
import { ONBOARDING_STEP_ORDER, type OnboardingStepKey } from "@/components/dashboard/onboarding/OnboardingProgress";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import {
  hasValidServiceForPublish,
  isPublicationReadyForDashboard,
} from "@/lib/dashboard/publicationReadiness";
import { getDictionary, isSupportedLang, t, type Dictionary } from "@/lib/i18n";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

function normalizeStep(value: string | string[] | undefined): OnboardingStepKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return ONBOARDING_STEP_ORDER.includes(raw as OnboardingStepKey) ? (raw as OnboardingStepKey) : "welcome";
}

export default async function SpecialistDashboardOnboardingPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams?: { step?: string | string[] } | Promise<{ step?: string | string[] }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const lang = isSupportedLang(resolvedParams.lang) ? resolvedParams.lang : "ru";
  const activeStep = normalizeStep(resolvedSearchParams.step);
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const dict: Dictionary = await getDictionary(lang);

  const { data: specExtra } = await service
    .from("specialists")
    .select("postal_code, country_code, work_format, languages")
    .eq("id", specialist.id)
    .maybeSingle();

  const { data: profile } = await service
    .from("specialist_profiles")
    .select("photo_url, about_me, city")
    .eq("specialist_id", specialist.id)
    .maybeSingle();

  const categoryId =
    typeof (specialist as unknown as Record<string, unknown>).category_id === "string"
      ? ((specialist as unknown as Record<string, unknown>).category_id as string)
      : "";

  const { data: categoryRow } = categoryId
    ? await service
        .from("categories")
        .select("id, parent_id, slug")
        .eq("id", categoryId)
        .maybeSingle()
    : { data: null };

  const { data: servicesRows } = await service
    .from("specialist_services")
    .select("title, price_from, is_active, category_id")
    .eq("specialist_id", specialist.id)
    .eq("is_active", true);

  const name = specialist.first_name?.trim() || specialist.name?.trim() || "";
  const languages = Array.isArray(specExtra?.languages)
    ? (specExtra.languages as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];
  const workFormat =
    specExtra?.work_format === "online" ||
    specExtra?.work_format === "offline" ||
    specExtra?.work_format === "hybrid"
      ? String(specExtra.work_format)
      : "online";
  const postalCode = typeof specExtra?.postal_code === "string" ? specExtra.postal_code : "";
  const city = typeof profile?.city === "string" ? profile.city.trim() : "";
  const countryCode = typeof specExtra?.country_code === "string" ? specExtra.country_code.trim() : "";
  const categoryParentId =
    categoryRow && typeof categoryRow.parent_id === "string" ? categoryRow.parent_id : null;
  const isUncategorizedCategory = categoryRow?.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
  const servicesInSelectedCategory = (servicesRows ?? []).filter(
    (row) => typeof row.category_id === "string" && row.category_id === categoryId,
  );

  const publishReady = isPublicationReadyForDashboard({
    name,
    categoryId,
    categoryParentId,
    languages,
    workFormat,
    postalCode,
    servicesInSelectedCategory,
  });

  const hasAbout = typeof profile?.about_me === "string" && profile.about_me.trim().length > 0;
  const hasPhoto = typeof profile?.photo_url === "string" && profile.photo_url.trim().length > 0;
  const needsPostalCode = workFormat !== "online";
  const hasWorkFormat =
    workFormat === "online" || workFormat === "offline" || workFormat === "hybrid";
  const profileStarted = Boolean(
    name ||
      categoryId ||
      languages.length > 0 ||
      city ||
      countryCode ||
      hasAbout ||
      hasPhoto ||
      (servicesRows ?? []).length > 0,
  );

  const checklistItems: OnboardingChecklistItem[] = [
    {
      key: "basic",
      label: t(dict, "dashboard.onboarding.checklist.basic"),
      done: Boolean(name),
    },
    {
      key: "category",
      label: t(dict, "dashboard.onboarding.checklist.category"),
      done: Boolean(categoryId && categoryParentId != null && !isUncategorizedCategory),
      helper: isUncategorizedCategory ? t(dict, "dashboard.onboarding.uncategorizedWarning") : undefined,
    },
    {
      key: "languages",
      label: t(dict, "dashboard.onboarding.checklist.languages"),
      done: languages.length > 0,
    },
    {
      key: "format",
      label: t(dict, "dashboard.onboarding.checklist.format"),
      done: hasWorkFormat && (!needsPostalCode || /^\d{5}$/.test(postalCode.trim())),
    },
    {
      key: "services",
      label: t(dict, "dashboard.onboarding.checklist.services"),
      done: hasValidServiceForPublish(servicesInSelectedCategory),
    },
    {
      key: "photo",
      label: t(dict, "dashboard.onboarding.checklist.photo"),
      done: hasPhoto,
      recommendation: true,
    },
    {
      key: "about",
      label: t(dict, "dashboard.onboarding.checklist.about"),
      done: hasAbout,
      recommendation: true,
    },
  ];

  return (
    <SpecialistOnboardingWizard
      dict={dict}
      lang={lang}
      activeStep={activeStep}
      profileStarted={profileStarted}
      publishReady={publishReady}
      isUncategorizedCategory={isUncategorizedCategory}
      checklistItems={checklistItems}
    />
  );
}
