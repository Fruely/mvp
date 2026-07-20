import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import {
  hasValidServiceForPublish,
  validatePublication,
  type PublicationValidatorInput,
} from "@/lib/dashboard/publicationValidator";

export { hasValidServiceForPublish };

/**
 * Server-side checks aligned with client publication readiness
 * and with `app/api/specialist/dashboard/publish/route.ts`.
 */

export type PublishableCategoryCheck = {
  ok: boolean;
  reason?: "missing" | "not_found" | "root" | "uncategorized";
};

export function checkPublishableCategory(category: {
  id?: unknown;
  parent_id?: unknown;
  slug?: unknown;
} | null | undefined): PublishableCategoryCheck {
  if (!category) return { ok: false, reason: "not_found" };
  if (typeof category.id !== "string" || category.id.trim().length === 0) {
    return { ok: false, reason: "not_found" };
  }
  if (category.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
    return { ok: false, reason: "uncategorized" };
  }
  if (typeof category.parent_id !== "string" || category.parent_id.trim().length === 0) {
    return { ok: false, reason: "root" };
  }
  return { ok: true };
}

/** @deprecated Prefer validatePublication — kept for call-site compatibility. */
export function isPublicationReadyCore(input: {
  name: string;
  categoryId: string;
  languages: string[];
  workFormat: string;
  postalCode: string;
  services: Array<{ title?: unknown; price_from?: unknown; is_active?: unknown }>;
  serviceRadiusKm?: number | string | null;
  city?: string | null;
  countryCode?: string | null;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  return validatePublication({
    name: input.name,
    categoryId: input.categoryId,
    categoryParentId: "parent",
    languages: input.languages,
    workFormat: input.workFormat,
    postalCode: input.postalCode,
    city: input.city,
    countryCode: input.countryCode ?? "DE",
    lat: input.lat,
    lng: input.lng,
    serviceRadiusKm: input.serviceRadiusKm,
    servicesInSelectedCategory: input.services,
  }).ready;
}

/**
 * Full readiness for dashboard / onboarding: subcategory + services + location.
 */
export function isPublicationReadyForDashboard(
  input: Omit<PublicationValidatorInput, "hasAbout" | "hasPhoto" | "hasGallery">
): boolean {
  return validatePublication(input).ready;
}
