export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import SpecialistOnboardingWizard from "@/components/dashboard/onboarding/SpecialistOnboardingWizard";
import type { OnboardingChecklistItem } from "@/components/dashboard/onboarding/OnboardingChecklist";
import { ONBOARDING_STEP_ORDER, type OnboardingStepKey } from "@/components/dashboard/onboarding/OnboardingProgress";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { hasValidServiceForPublish } from "@/lib/dashboard/publicationReadiness";
import {
  needsServiceRadius,
  validatePublication,
} from "@/lib/dashboard/publicationValidator";
import { getDictionary, isSupportedLang, t, type Dictionary } from "@/lib/i18n";
import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
  isAllowedServiceRadiusKm,
  normalizeCountryCode,
  normalizePostalCode,
  parseServiceRadiusKm,
} from "@/lib/specialists/geography";
import {
  getCurrentUserAndSpecialist,
  isPublishedSpecialistStatus,
} from "@/lib/specialists/server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getSpecialistUrl } from "@/lib/urls";

function normalizeStep(value: string | string[] | undefined): OnboardingStepKey {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "photos") return "photo";
  return ONBOARDING_STEP_ORDER.includes(raw as OnboardingStepKey) ? (raw as OnboardingStepKey) : "welcome";
}

function hasReason(value: string | string[] | undefined, reason: string): boolean {
  return Array.isArray(value) ? value.includes(reason) : value === reason;
}

export default async function SpecialistDashboardOnboardingPage({
  params,
  searchParams,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
  searchParams?:
    | { step?: string | string[]; reason?: string | string[] }
    | Promise<{ step?: string | string[]; reason?: string | string[] }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const lang = isSupportedLang(resolvedParams.lang) ? resolvedParams.lang : "ru";
  const activeStep = normalizeStep(resolvedSearchParams.step);
  const showIncompleteProfileGateNotice = hasReason(
    resolvedSearchParams.reason,
    "incomplete_profile",
  );
  const { specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();
  const dict: Dictionary = await getDictionary(lang);
  const specialistSlug =
    typeof (specialist as unknown as Record<string, unknown>).slug === "string"
      ? ((specialist as unknown as Record<string, unknown>).slug as string)
      : null;
  const publicProfileHref = getSpecialistUrl(lang, {
    id: specialist.id,
    slug: specialistSlug,
  });

  const { data: specExtra } = await service
    .from("specialists")
    .select(
      "postal_code, country_code, work_format, languages, avatar_url, service_radius_km, lat, lng"
    )
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
  const hasSavedCategory = categoryId.trim().length > 0;
  const requiresSavedCategoryForStep =
    activeStep === "services" || activeStep === "photo" || activeStep === "review";

  if (!hasSavedCategory && requiresSavedCategoryForStep) {
    redirect(`/${lang}/specialist/dashboard/onboarding?step=basic`);
  }

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

  if (!Array.isArray(categoriesRows) || categoriesRows.length === 0) {
    return (
      <SpecialistOnboardingWizard
        dict={dict}
        lang={lang}
        activeStep={activeStep}
        profileStarted={false}
        publishReady={false}
        isAlreadyPublished={false}
        isUncategorizedCategory={false}
        showIncompleteProfileGateNotice={showIncompleteProfileGateNotice}
        checklistItems={[]}
        initialBasicData={{
          name: "",
          category_id: "",
          work_format: "online",
          country_code: GERMANY_COUNTRY_CODE,
          postal_code: "",
          city: "",
          lat: null,
          lng: null,
          service_radius_km: "",
          languages: [],
        }}
        initialAboutData={{ about_me: "" }}
        servicesSummary={{ totalServices: 0, activeServices: 0, hasValidServiceForPublish: false }}
        currentPhotoUrl=""
        reviewSummary={{
          publishReady: false,
          blocking: [],
          recommendations: [],
          hasName: false,
          hasCategory: false,
          hasPublishableCategory: false,
          isUncategorizedCategory: false,
          isRootCategory: false,
          hasLanguages: false,
          hasWorkFormat: false,
          hasCountry: false,
          hasPostalCode: false,
          hasCity: false,
          hasCoordinates: false,
          needsServiceRadius: false,
          hasServiceRadius: false,
          hasActiveServicesAnyCategory: false,
          hasValidServiceInSelectedCategory: false,
          servicesMismatch: false,
          hasAbout: false,
          hasPhoto: false,
          hasGallery: false,
        }}
        publicProfileHref={publicProfileHref}
        categories={[]}
        preserveProfileData={{ about_me: "", city: "", address: "", video_url: "", photo_url: "", gallery_urls: [], certificate_urls: [] }}
        categoriesLoadError={"Не удалось загрузить список категорий. Пожалуйста, обновите страницу."}
      />
    );
  }

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
  const serviceRadiusKm =
    typeof specExtra?.service_radius_km === "number" && Number.isFinite(specExtra.service_radius_km)
      ? specExtra.service_radius_km
      : null;
  const city = typeof profile?.city === "string" ? profile.city.trim() : "";
  const countryCodeRaw =
    typeof specExtra?.country_code === "string" ? specExtra.country_code.trim() : "";
  const countryCode = normalizeCountryCode(countryCodeRaw) ?? "";
  const lat =
    typeof specExtra?.lat === "number" && Number.isFinite(specExtra.lat) ? specExtra.lat : null;
  const lng =
    typeof specExtra?.lng === "number" && Number.isFinite(specExtra.lng) ? specExtra.lng : null;
  const categoryParentId =
    categoryRow && typeof categoryRow.parent_id === "string" ? categoryRow.parent_id : null;
  const isUncategorizedCategory = categoryRow?.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
  const servicesInSelectedCategory = (servicesRows ?? []).filter(
    (row) => row.is_active === true && typeof row.category_id === "string" && row.category_id === categoryId,
  );
  const totalServices = Array.isArray(servicesRows) ? servicesRows.length : 0;
  const activeServices = (servicesRows ?? []).filter((row) => row.is_active === true).length;
  const hasActiveServicesAnyCategory = activeServices > 0;
  const hasValidService = hasValidServiceForPublish(servicesInSelectedCategory);

  const hasAbout = typeof profile?.about_me === "string" && profile.about_me.trim().length > 0;
  const avatarUrl =
    typeof specExtra?.avatar_url === "string" && specExtra.avatar_url.trim()
      ? specExtra.avatar_url
      : typeof profile?.photo_url === "string"
        ? profile.photo_url
        : "";
  const hasPhoto = avatarUrl.trim().length > 0;
  const hasGallery = Array.isArray(profile?.gallery_urls)
    ? profile.gallery_urls.some((value) => typeof value === "string" && value.trim().length > 0)
    : false;
  const hasWorkFormat =
    workFormat === "online" || workFormat === "offline" || workFormat === "hybrid";
  const isRootCategory = Boolean(categoryId && categoryParentId == null && !isUncategorizedCategory);
  const needsRadius = needsServiceRadius(workFormat);
  const hasPostal = Boolean(normalizePostalCode(postalCode));
  const hasCountry = countryCode === GERMANY_COUNTRY_CODE;
  const hasCity = city.length > 0;
  const hasCoordinates = areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE });
  const hasServiceRadiusOk =
    !needsRadius || isAllowedServiceRadiusKm(parseServiceRadiusKm(serviceRadiusKm));

  const validation = validatePublication({
    name,
    categoryId,
    categoryParentId,
    categorySlug: typeof categoryRow?.slug === "string" ? categoryRow.slug : null,
    categoryMissing: Boolean(categoryId) && !categoryRow,
    languages,
    workFormat,
    countryCode: countryCode || null,
    postalCode,
    city,
    lat,
    lng,
    serviceRadiusKm,
    servicesInSelectedCategory,
    hasAbout,
    hasPhoto,
    hasGallery,
  });
  const publishReady = validation.ready;
  const isAlreadyPublished = isPublishedSpecialistStatus(specialist.status);

  const servicesMismatch = hasActiveServicesAnyCategory && !hasValidService;
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
      key: "location",
      label: t(dict, "dashboard.onboarding.basicForm.locationSectionTitle"),
      done: hasCountry && hasPostal && hasCity && hasCoordinates && (!needsRadius || hasServiceRadiusOk),
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
      isAlreadyPublished={isAlreadyPublished}
      isUncategorizedCategory={isUncategorizedCategory}
      showIncompleteProfileGateNotice={showIncompleteProfileGateNotice}
      checklistItems={checklistItems}
      initialBasicData={{
        name,
        category_id: categoryId,
        work_format:
          workFormat === "online" || workFormat === "offline" || workFormat === "hybrid"
            ? workFormat
            : "online",
        country_code: countryCode || GERMANY_COUNTRY_CODE,
        postal_code: postalCode,
        city,
        lat,
        lng,
        service_radius_km: serviceRadiusKm != null ? String(serviceRadiusKm) : "",
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
      currentPhotoUrl={avatarUrl}
      reviewSummary={{
        publishReady,
        blocking: validation.blocking,
        recommendations: validation.recommendations,
        hasName: Boolean(name.trim()),
        hasCategory: Boolean(categoryId),
        hasPublishableCategory: Boolean(categoryId && categoryParentId != null && !isUncategorizedCategory),
        isUncategorizedCategory,
        isRootCategory,
        hasLanguages: languages.length > 0,
        hasWorkFormat,
        hasCountry,
        hasPostalCode: hasPostal,
        hasCity,
        hasCoordinates,
        needsServiceRadius: needsRadius,
        hasServiceRadius: hasServiceRadiusOk,
        hasActiveServicesAnyCategory,
        hasValidServiceInSelectedCategory: hasValidService,
        servicesMismatch,
        hasAbout,
        hasPhoto,
        hasGallery,
      }}
      publicProfileHref={publicProfileHref}
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
        photo_url: avatarUrl,
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
