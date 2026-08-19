import type { Lang } from "../i18n";
import { tryGetCategoryUrl } from "@/lib/publicUrls";

const PLZ_PATTERN = /^\d{5}$/;

export type SearchContextParams = {
  lang?: string | null;
  place?: string | null;
  q?: string | null;
  category?: string | null;
  mode?: string | null;
  radius?: string | null;
};

export type SearchContext = {
  q: string | null;
  category: string | null;
  place: string | null;
  searchLang: string | null;
  mode: string | null;
  radius: string | null;
  sourcePath: string;
};

export type AssistedRequestPrefill = {
  q?: string | null;
  place?: string | null;
  preferred_language?: Lang | null;
  work_format?: "online" | "offline" | "hybrid" | null;
  radius_km?: string | null;
  category_text?: string | null;
  source_path?: string | null;
};

/** Map search `lang` query (uk/ru/de) to UI locale for the request form. */
export function searchLangToPreferredLanguage(lang: string | null | undefined): Lang | null {
  if (!lang?.trim()) return null;
  const lower = lang.trim().toLowerCase();
  if (lower === "uk" || lower === "ua") return "ua";
  if (lower === "ru") return "ru";
  if (lower === "de") return "de";
  return null;
}

/** Infer work format from search mode and location. */
export function inferWorkFormatFromSearch(
  mode: string | null | undefined,
  place: string | null | undefined,
): "online" | "offline" | "hybrid" | null {
  if (mode?.trim().toLowerCase() === "online") return "online";
  if (place?.trim()) return "offline";
  return null;
}

export function buildSpecialistsSourcePath(params: SearchContextParams): string {
  const search = new URLSearchParams();
  if (params.lang?.trim()) search.set("lang", params.lang.trim());
  if (params.place?.trim()) search.set("place", params.place.trim());
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.category?.trim()) search.set("category", params.category.trim());
  if (params.mode?.trim()) search.set("mode", params.mode.trim());
  if (params.radius?.trim()) search.set("radius", params.radius.trim());
  const qs = search.toString();
  return qs ? `/specialists?${qs}` : "/specialists";
}

export function parseSearchContext(params: SearchContextParams): SearchContext {
  return {
    q: params.q?.trim() || null,
    category: params.category?.trim() || null,
    place: params.place?.trim() || null,
    searchLang: params.lang?.trim() || null,
    mode: params.mode?.trim().toLowerCase() || null,
    radius: params.radius?.trim() || null,
    sourcePath: buildSpecialistsSourcePath(params),
  };
}

export function searchContextToAssistedPrefill(
  ctx: SearchContext,
  opts?: { categoryText?: string | null },
): AssistedRequestPrefill {
  return {
    q: ctx.q,
    place: ctx.place,
    preferred_language: searchLangToPreferredLanguage(ctx.searchLang),
    work_format: inferWorkFormatFromSearch(ctx.mode, ctx.place),
    radius_km: ctx.radius,
    category_text: opts?.categoryText ?? ctx.category,
    source_path: ctx.sourcePath,
  };
}

/** Split a place string into postal code or city for form prefill. */
export function splitPlaceForPrefill(place: string | null | undefined): {
  city: string;
  postal_code: string;
} {
  const trimmed = place?.trim() ?? "";
  if (!trimmed) return { city: "", postal_code: "" };
  if (PLZ_PATTERN.test(trimmed)) return { city: "", postal_code: trimmed };
  return { city: trimmed, postal_code: "" };
}

/** Canonical public category URL. Query-based `/specialists?category=` is search-only. */
export function buildCategorySearchHref(lang: Lang, categorySlug: string): string {
  return tryGetCategoryUrl(lang, categorySlug) ?? `/${lang}/service-search`;
}
