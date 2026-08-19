import type { Lang } from "@/lib/i18n";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

/** Canonical public category/profile slug: lowercase ASCII kebab-case. */
export const ASCII_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CYRILLIC_PERCENT = /%(?:D0|D1)/i;
const NON_ASCII = /[^\x00-\x7F]/;

export function isAsciiSlug(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return ASCII_SLUG_PATTERN.test(value.trim());
}

export function isAsciiPublicPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? "";
  return pathname.length > 0 && !NON_ASCII.test(pathname) && !CYRILLIC_PERCENT.test(pathname);
}

export function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Category identifiers must already be canonical ASCII slugs.
 * Do not transliterate localized titles — that would invent a different identifier.
 */
export function toPublicCategorySlug(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = decodePathSegment(value).trim().toLowerCase();
  return isAsciiSlug(trimmed) ? trimmed : null;
}

export function getCategoryUrl(lang: string, categorySlug: string): string {
  const slug = toPublicCategorySlug(categorySlug);
  if (!slug) {
    throw new Error(`Refusing non-ASCII category slug: ${categorySlug}`);
  }
  return `/${lang}/specialists/${slug}`;
}

export function tryGetCategoryUrl(lang: string, categorySlug: string | null | undefined): string | null {
  const slug = toPublicCategorySlug(categorySlug);
  return slug ? `/${lang}/specialists/${slug}` : null;
}

export function getSpecialistPublicSlug(specialist: {
  id: string;
  slug?: string | null;
}): string {
  const slug = specialist.slug;
  if (typeof slug === "string" && isAsciiSlug(slug)) return slug.trim();
  return specialist.id;
}

export function getSpecialistUrl(
  lang: string,
  specialist: { id: string; slug?: string | null },
): string {
  return `/${lang}/specialist/${getSpecialistPublicSlug(specialist)}`;
}

export function getSpecialistUrlWithQuery(
  lang: string,
  specialist: { id: string; slug?: string | null },
  query?: string | null,
): string {
  const path = getSpecialistUrl(lang, specialist);
  if (!query?.trim()) return path;
  const trimmed = query.trim().replace(/^\?/, "");
  return trimmed ? `${path}?${trimmed}` : path;
}

export function hreflangSpecialist(slug: string): Record<"ru" | "uk" | "de" | "x-default", string> {
  const segment = isAsciiSlug(slug) ? slug.trim() : slug;
  return {
    ru: `${SITE_DOMAIN}/ru/specialist/${segment}`,
    uk: `${SITE_DOMAIN}/ua/specialist/${segment}`,
    de: `${SITE_DOMAIN}/de/specialist/${segment}`,
    "x-default": `${SITE_DOMAIN}/ru/specialist/${segment}`,
  };
}

export function hreflangCategory(slug: string): Record<"ru" | "uk" | "de" | "x-default", string> {
  const segment = toPublicCategorySlug(slug) ?? slug;
  return {
    ru: `${SITE_DOMAIN}/ru/specialists/${segment}`,
    uk: `${SITE_DOMAIN}/ua/specialists/${segment}`,
    de: `${SITE_DOMAIN}/de/specialists/${segment}`,
    "x-default": `${SITE_DOMAIN}/ru/specialists/${segment}`,
  };
}

export function categoryCanonicalUrl(lang: Lang, slug: string): string {
  return `${SITE_DOMAIN}${getCategoryUrl(lang, slug)}`;
}

export function specialistCanonicalUrl(
  lang: Lang,
  specialist: { id: string; slug?: string | null },
): string {
  return `${SITE_DOMAIN}${getSpecialistUrl(lang, specialist)}`;
}

/**
 * Category-only query URLs (`/specialists?category=psychologists`) can be
 * promoted to the canonical path. Free-text `q`, place, and mode stay on search.
 */
export function categorySlugForCanonicalSearch(params: {
  category?: string | null;
  q?: string | null;
  place?: string | null;
  mode?: string | null;
}): string | null {
  if (params.q?.trim()) return null;
  if (params.place?.trim()) return null;
  if (params.mode?.trim()) return null;
  return toPublicCategorySlug(params.category);
}

/** Preserve UX query keys such as open=form on canonical redirects. */
export function appendPreservedQuery(path: string, searchParams?: URLSearchParams | null): string {
  if (!searchParams) return path;
  const kept = new URLSearchParams();
  const open = searchParams.get("open");
  if (open?.trim()) kept.set("open", open.trim());
  const qs = kept.toString();
  return qs ? `${path}?${qs}` : path;
}
