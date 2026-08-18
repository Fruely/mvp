/**
 * Single structured publication validator for onboarding, editor, and publish API.
 * Location is required for all work formats; service radius only for offline/hybrid.
 */

import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { isValidPublishableServicePricing } from "@/lib/specialistServices/pricing";
import {
  areValidCoordinates,
  isAllowedServiceRadiusKm,
  normalizeCountryCode,
  normalizePostalCode,
  normalizeWorkFormat,
  parseServiceRadiusKm,
  type WorkFormat,
} from "@/lib/specialists/geography";
export type PublicationStep = "basic" | "services" | "about" | "photos" | "review";

export type PublishableServiceRow = {
  title?: unknown;
  price_from?: unknown;
  price_to?: unknown;
  pricing_type?: unknown;
  price_comment?: unknown;
  pricing_exception?: unknown;
  is_active?: unknown;
};

export function hasValidServiceForPublish(services: PublishableServiceRow[]): boolean {
  return services.some((s) => {
    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (!title) return false;
    if (s.is_active === false) return false;
    return isValidPublishableServicePricing(s);
  });
}

export type PublicationIssueCode =
  | "name_required"
  | "category_required"
  | "category_root"
  | "category_uncategorized"
  | "category_not_found"
  | "languages_required"
  | "work_format_required"
  | "country_required"
  | "country_not_supported"
  | "postal_code_required"
  | "city_required"
  | "coordinates_required"
  | "service_radius_required"
  | "service_radius_invalid"
  | "services_required";

export type PublicationIssue = {
  code: PublicationIssueCode;
  field: string;
  step: PublicationStep;
};

export type PublicationRecommendationCode = "about_recommended" | "photo_recommended" | "gallery_recommended";

export type PublicationRecommendation = {
  code: PublicationRecommendationCode;
  field: string;
  step: PublicationStep;
};

export type PublicationValidationResult = {
  ready: boolean;
  blocking: PublicationIssue[];
  recommendations: PublicationRecommendation[];
};

export type PublicationValidatorInput = {
  name: string | null | undefined;
  categoryId: string | null | undefined;
  /** categories.parent_id — null means root (not publishable). */
  categoryParentId: string | null | undefined;
  categorySlug?: string | null;
  categoryMissing?: boolean;
  languages: string[] | null | undefined;
  workFormat: string | null | undefined;
  countryCode: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  serviceRadiusKm: number | string | null | undefined;
  servicesInSelectedCategory: PublishableServiceRow[];
  hasAbout?: boolean;
  hasPhoto?: boolean;
  hasGallery?: boolean;
};

function push(
  list: PublicationIssue[],
  code: PublicationIssueCode,
  field: string,
  step: PublicationStep = "basic"
) {
  list.push({ code, field, step });
}

/**
 * Canonical publication rules. Gallery never blocks.
 */
export function validatePublication(input: PublicationValidatorInput): PublicationValidationResult {
  const blocking: PublicationIssue[] = [];
  const recommendations: PublicationRecommendation[] = [];

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) push(blocking, "name_required", "name");

  const categoryId = typeof input.categoryId === "string" ? input.categoryId.trim() : "";
  if (!categoryId || input.categoryMissing) {
    push(blocking, "category_required", "category_id");
  } else if (input.categorySlug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
    push(blocking, "category_uncategorized", "category_id");
  } else if (input.categoryParentId == null) {
    push(blocking, "category_root", "category_id");
  }

  const languages = Array.isArray(input.languages)
    ? input.languages.filter((l) => typeof l === "string" && l.trim().length > 0)
    : [];
  if (languages.length === 0) push(blocking, "languages_required", "languages");

  const workFormat = normalizeWorkFormat(input.workFormat);
  if (!workFormat) push(blocking, "work_format_required", "work_format");

  const countryCode = normalizeCountryCode(input.countryCode);
  if (!countryCode) {
    push(blocking, "country_required", "country_code");
  } else if (countryCode !== "DE") {
    push(blocking, "country_not_supported", "country_code");
  }

  const postalCode = normalizePostalCode(input.postalCode);
  if (!postalCode) push(blocking, "postal_code_required", "postal_code");

  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (!city) push(blocking, "city_required", "city");

  if (!areValidCoordinates(input.lat, input.lng, { countryCode: countryCode ?? "DE" })) {
    push(blocking, "coordinates_required", "coordinates");
  }

  if (workFormat === "offline" || workFormat === "hybrid") {
    const radius = parseServiceRadiusKm(input.serviceRadiusKm);
    if (radius == null) {
      push(blocking, "service_radius_required", "service_radius_km");
    } else if (!isAllowedServiceRadiusKm(radius)) {
      push(blocking, "service_radius_invalid", "service_radius_km");
    }
  }

  if (!hasValidServiceForPublish(input.servicesInSelectedCategory ?? [])) {
    push(blocking, "services_required", "services", "services");
  }

  if (!input.hasAbout) {
    recommendations.push({ code: "about_recommended", field: "about_me", step: "about" });
  }
  if (!input.hasPhoto) {
    recommendations.push({ code: "photo_recommended", field: "photo", step: "photos" });
  }
  if (!input.hasGallery) {
    recommendations.push({ code: "gallery_recommended", field: "gallery", step: "photos" });
  }

  return {
    ready: blocking.length === 0,
    blocking,
    recommendations,
  };
}

/** Map geo-only codes used by older helpers onto validator codes. */
export function geoCodeToIssueCode(
  code: string
): Extract<
  PublicationIssueCode,
  | "country_required"
  | "country_not_supported"
  | "postal_code_required"
  | "city_required"
  | "coordinates_required"
  | "service_radius_required"
  | "service_radius_invalid"
> {
  switch (code) {
    case "publication_country_required":
      return "country_required";
    case "publication_country_not_supported":
      return "country_not_supported";
    case "publication_postal_code_required":
      return "postal_code_required";
    case "publication_city_required":
      return "city_required";
    case "publication_coordinates_required":
      return "coordinates_required";
    case "publication_service_radius_required":
      return "service_radius_required";
    case "publication_service_radius_invalid":
      return "service_radius_invalid";
    default:
      return "coordinates_required";
  }
}

export function needsServiceRadius(workFormat: WorkFormat | string | null | undefined): boolean {
  const wf = normalizeWorkFormat(workFormat);
  return wf === "offline" || wf === "hybrid";
}
