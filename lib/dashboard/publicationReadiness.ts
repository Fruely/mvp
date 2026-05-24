import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";

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

/** Core rules (name, category, languages, format, PLZ, at least one valid service row). */
export function isPublicationReadyCore(input: {
  name: string;
  categoryId: string;
  languages: string[];
  workFormat: string;
  postalCode: string;
  services: Array<{ title?: unknown; price_from?: unknown; is_active?: unknown }>;
}): boolean {
  const needsPostalCode = input.workFormat !== "online";
  const hasWorkFormat =
    input.workFormat === "online" ||
    input.workFormat === "offline" ||
    input.workFormat === "hybrid";
  return Boolean(
    input.name.trim() &&
      input.categoryId.trim() &&
      input.languages.length > 0 &&
      hasWorkFormat &&
      (!needsPostalCode || /^\d{5}$/.test(input.postalCode.trim())) &&
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
}): boolean {
  if (input.categoryParentId == null) return false;
  return isPublicationReadyCore({
    name: input.name,
    categoryId: input.categoryId,
    languages: input.languages,
    workFormat: input.workFormat,
    postalCode: input.postalCode,
    services: input.servicesInSelectedCategory,
  });
}
