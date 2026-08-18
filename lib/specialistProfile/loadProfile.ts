import type { SupabaseClient } from "@supabase/supabase-js";

import { isPublicLeadTargetSpecialist } from "@/lib/specialists/status";
import {
  getSpecialistOnboardingGateState,
  type SpecialistRow,
} from "@/lib/specialists/server";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { getDashboardCategoryOptions } from "@/lib/categories/dashboardCategoryOptions";
import {
  PUBLIC_SERVICE_RADII_KM,
} from "@/lib/specialists/geography";
import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES,
  type SpecialistEditableProfileDto,
  type SpecialistProfileCategoryOption,
  type SpecialistProfileReadResponse,
} from "@/lib/specialistProfile/types";

function toWorkFormat(value: unknown): SpecialistEditableProfileDto["work_format"] {
  if (value === "online" || value === "offline" || value === "hybrid") return value;
  return null;
}

export async function loadSpecialistEditableProfile(
  service: SupabaseClient,
  specialistId: string,
  lang: AccountCapabilitiesLang,
): Promise<SpecialistProfileReadResponse> {
  const [specResult, profileResult, categories] = await Promise.all([
    service
      .from("specialists")
      .select(
        "id, name, category_id, work_format, languages, postal_code, country_code, lat, lng, service_radius_km, status, is_active, is_visible, billing_visibility_blocked, is_test, slug",
      )
      .eq("id", specialistId)
      .maybeSingle(),
    service
      .from("specialist_profiles")
      .select("about_me, city")
      .eq("specialist_id", specialistId)
      .maybeSingle(),
    getDashboardCategoryOptions(),
  ]);

  if (specResult.error || !specResult.data?.id) {
    throw new Error("specialist_not_found");
  }

  const row = specResult.data as Record<string, unknown>;
  const profile = profileResult.data;

  const categoryId = typeof row.category_id === "string" ? row.category_id : null;
  let categorySlug: string | null = null;
  let categoryLabel: string | null = null;

  if (categoryId) {
    const { data: categoryRow } = await service
      .from("categories")
      .select("slug, title, title_ru, title_de, title_ua")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryRow && typeof categoryRow === "object") {
      categorySlug = typeof categoryRow.slug === "string" ? categoryRow.slug : null;
      categoryLabel = getCategoryTitle(categoryRow, lang) || null;
    }
  }

  const specialistRow: SpecialistRow = {
    id: specialistId,
    user_id: null,
    first_name: typeof row.name === "string" ? row.name : null,
    name: typeof row.name === "string" ? row.name : null,
    email: null,
    phone: null,
    category_id: categoryId,
    status: typeof row.status === "string" ? row.status : null,
  };

  const gate = await getSpecialistOnboardingGateState(specialistRow, service);
  const slug = typeof row.slug === "string" && row.slug.trim() ? row.slug.trim() : null;
  const publicProfileAvailable =
    Boolean(slug) &&
    isPublicLeadTargetSpecialist({
      status: typeof row.status === "string" ? row.status : null,
      is_active: row.is_active === true,
      is_visible: row.is_visible === true,
      billing_visibility_blocked: row.billing_visibility_blocked === true,
      is_test: row.is_test === true,
    });

  const languages = Array.isArray(row.languages)
    ? (row.languages as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
    : [];

  const specialist: SpecialistEditableProfileDto = {
    id: specialistId,
    name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : null,
    category_id: categoryId,
    category_slug: categorySlug,
    category_label: categoryLabel,
    languages,
    work_format: toWorkFormat(row.work_format),
    country_code: typeof row.country_code === "string" ? row.country_code : null,
    postal_code: typeof row.postal_code === "string" ? row.postal_code : null,
    city: typeof profile?.city === "string" ? profile.city : null,
    lat: typeof row.lat === "number" && Number.isFinite(row.lat) ? row.lat : null,
    lng: typeof row.lng === "number" && Number.isFinite(row.lng) ? row.lng : null,
    service_radius_km:
      typeof row.service_radius_km === "number" && Number.isFinite(row.service_radius_km)
        ? row.service_radius_km
        : null,
    about: typeof profile?.about_me === "string" ? profile.about_me : null,
    onboarding_gate: gate.state,
    publication_ready: gate.publicationReady,
    public_profile_available: publicProfileAvailable,
  };

  const categoryOptions: SpecialistProfileCategoryOption[] = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    label: getCategoryTitle(category, lang) || category.title,
    parent_id: category.parent_id,
  }));

  return {
    specialist,
    category_options: categoryOptions,
    allowed_service_radii_km: [...PUBLIC_SERVICE_RADII_KM],
    allowed_language_codes: SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES,
  };
}
