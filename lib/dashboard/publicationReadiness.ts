import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import {
  isAllowedServiceRadiusKm,
  parseServiceRadiusKm,
} from "@/lib/specialists/geography";

/**
 * Server-side checks aligned with client `publicationReady` in SpecialistDashboardEditor
 * and with `app/api/specialist/dashboard/publish/route.ts` (subcategory + services in category).
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

export function hasValidServiceForPublish(
  services: Array<{
    title?: unknown;
    price_from?: unknown;
    is_active?: unknown;
  }>,
): boolean {
  return services.some((s) => {
    const title = typeof s.title === "string" ? s.title.trim() : "";
    if (!title) return false;
    if (s.is_active === false) return false;
    const raw = String(s.price_from ?? "").trim();
    if (!raw) return false;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n > 0;
  });
}

/** Core rules (name, category, languages, format, DE geo, radius for offline/hybrid, services). */
export function isPublicationReadyCore(input: {
  name: string;
  categoryId: string;
  languages: string[];
  workFormat: string;
  postalCode: string;
  services: Array<{ title?: unknown; price_from?: unknown; is_active?: unknown }>;
  /** Required (allowlisted) for offline/hybrid. Ignored for online. */
  serviceRadiusKm?: number | string | null;
  /** Required for all formats (online included — admin geo, not venue). */
  city?: string | null;
}): boolean {
  const needsServiceRadius =
    input.workFormat === "offline" || input.workFormat === "hybrid";
  const hasWorkFormat =
    input.workFormat === "online" ||
    input.workFormat === "offline" ||
    input.workFormat === "hybrid";
  const hasPostalCode = /^\d{5}$/.test(input.postalCode.trim());
  const hasServiceRadius =
    !needsServiceRadius ||
    isAllowedServiceRadiusKm(parseServiceRadiusKm(input.serviceRadiusKm));
  const hasCity = typeof input.city === "string" && input.city.trim().length > 0;
  return Boolean(
    input.name.trim() &&
      input.categoryId.trim() &&
      input.languages.length > 0 &&
      hasWorkFormat &&
      hasPostalCode &&
      hasServiceRadius &&
      hasCity &&
      hasValidServiceForPublish(input.services),
  );
}

/**
 * Full readiness for publish API: subcategory (parent category must exist) and
 * services validated against the selected category, matching publish route.
 */
export function isPublicationReadyForDashboard(input: {
  name: string;
  categoryId: string;
  /** From categories.parent_id — must be set (subcategory chosen). */
  categoryParentId: string | null;
  languages: string[];
  workFormat: string;
  postalCode: string;
  servicesInSelectedCategory: Array<{ title?: unknown; price_from?: unknown; is_active?: unknown }>;
  serviceRadiusKm?: number | string | null;
  city?: string | null;
}): boolean {
  if (input.categoryParentId == null) return false;
  return isPublicationReadyCore({
    name: input.name,
    categoryId: input.categoryId,
    languages: input.languages,
    workFormat: input.workFormat,
    postalCode: input.postalCode,
    services: input.servicesInSelectedCategory,
    serviceRadiusKm: input.serviceRadiusKm,
    city: input.city,
  });
}
