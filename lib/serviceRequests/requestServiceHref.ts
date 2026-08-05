import type { Lang } from "@/lib/i18n";

export function requestServiceHref(
  lang: Lang,
  params?: {
    category_id?: string | null;
    category_text?: string | null;
    source_path?: string | null;
  },
): string {
  const search = new URLSearchParams();
  if (params?.category_id) search.set("category_id", params.category_id);
  if (params?.category_text) search.set("category_text", params.category_text);
  if (params?.source_path) search.set("source_path", params.source_path);
  const qs = search.toString();
  return `/${lang}/request-service${qs ? `?${qs}` : ""}`;
}
