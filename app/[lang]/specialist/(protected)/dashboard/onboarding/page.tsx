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
    .select("photo_url, about_me, city, address, video_url, gallery_urls, certificate_urls")
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
    .eq("specialist_id", specialist.id);

  const { data: categoriesRows } = await service
    .from("categories")
    .select("id, title, title_ru, title_de, title_ua, parent_id, slug")
    .or(`parent_id.not.is.null,slug.eq.${UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG}`)
    .order("title", { ascending: true });

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
    (row) => row.is_active === true && typeof row.category_id === "string" && row.category_id === categoryId,
  );
  const totalServices = Array.isArray(servicesRows) ? servicesRows.length : 0;
  const activeServices = (servicesRows ?? []).filter((row) => row.is_active === true).length;
  const hasValidService = hasValidServiceForPublish(servicesInSelectedCategory);

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
      done: hasValidService,
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
      initialBasicData={{
        name,
        category_id: categoryId,
        work_format:
          workFormat === "online" || workFormat === "offline" || workFormat === "hybrid"
            ? workFormat
            : "online",
        postal_code: postalCode,
        languages,
      }}
      initialAboutData={{
        about_me: typeof profile?.about_me === "string" ? profile.about_me : "",
      }}
      servicesSummary={{
        totalServices,
        activeServices,
        hasValidServiceForPublish: hasValidService,
      }}
      currentPhotoUrl={typeof profile?.photo_url === "string" ? profile.photo_url : ""}
      categories={(categoriesRows ?? [])
        .filter(
          (category) =>
            typeof category?.id === "string" &&
            (typeof category?.title === "string" || category?.title === null) &&
            (category.parent_id === null || typeof category.parent_id === "string") &&
            (typeof category?.slug === "string" || category?.slug === null),
        )
        .map((category) => ({
          id: String(category.id),
          title: typeof category.title === "string" ? category.title : null,
          title_ru: typeof category.title_ru === "string" ? category.title_ru : null,
          title_de: typeof category.title_de === "string" ? category.title_de : null,
          title_ua: typeof category.title_ua === "string" ? category.title_ua : null,
          parent_id: typeof category.parent_id === "string" ? category.parent_id : null,
          slug: typeof category.slug === "string" ? category.slug : null,
        }))}
      preserveProfileData={{
        about_me: typeof profile?.about_me === "string" ? profile.about_me : "",
        city: typeof profile?.city === "string" ? profile.city : "",
        address: typeof profile?.address === "string" ? profile.address : "",
        video_url: typeof profile?.video_url === "string" ? profile.video_url : "",
        photo_url: typeof profile?.photo_url === "string" ? profile.photo_url : "",
        gallery_urls: Array.isArray(profile?.gallery_urls)
          ? profile.gallery_urls.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            )
          : [],
        certificate_urls: Array.isArray(profile?.certificate_urls)
          ? profile.certificate_urls.filter(
              (value): value is string => typeof value === "string" && value.trim().length > 0,
            )
          : [],
      }}
    />
  );
}
