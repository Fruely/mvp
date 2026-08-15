import type { Lang } from "@/lib/i18n";
import type { AssistedRequestPrefill } from "@/lib/search/searchContext";

export type RequestServiceHrefParams = {
  category_id?: string | null;
  category_text?: string | null;
  source_path?: string | null;
  q?: string | null;
  place?: string | null;
  preferred_language?: Lang | string | null;
  work_format?: string | null;
  radius_km?: string | number | null;
};

function appendParam(search: URLSearchParams, key: string, value: string | number | null | undefined) {
  if (value == null) return;
  const trimmed = String(value).trim();
  if (trimmed) search.set(key, trimmed);
}

export function requestServiceHref(lang: Lang, params?: RequestServiceHrefParams): string {
  const search = new URLSearchParams();
  appendParam(search, "category_id", params?.category_id);
  appendParam(search, "category_text", params?.category_text);
  appendParam(search, "source_path", params?.source_path);
  appendParam(search, "q", params?.q);
  appendParam(search, "place", params?.place);
  appendParam(search, "preferred_language", params?.preferred_language);
  appendParam(search, "work_format", params?.work_format);
  appendParam(search, "radius_km", params?.radius_km);
  const qs = search.toString();
  return `/${lang}/request-service${qs ? `?${qs}` : ""}`;
}

export function assistedPrefillToRequestHref(
  lang: Lang,
  prefill: AssistedRequestPrefill,
  opts?: { category_id?: string | null },
): string {
  return requestServiceHref(lang, {
    category_id: opts?.category_id,
    category_text: prefill.category_text,
    source_path: prefill.source_path,
    q: prefill.q,
    place: prefill.place,
    preferred_language: prefill.preferred_language,
    work_format: prefill.work_format,
    radius_km: prefill.radius_km,
  });
}
