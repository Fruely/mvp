import { notFound, permanentRedirect } from "next/navigation";
import { isSupportedLang } from "@/lib/i18n";
import { resolveCategoryAsciiSlug } from "@/lib/categories/resolvePublicCategorySlug";
import {
  appendPreservedQuery,
  decodePathSegment,
  getCategoryUrl,
  toPublicCategorySlug,
} from "@/lib/publicUrls";
import CategoryHubClient from "./CategoryHubClient";

export default async function CategorySpecialistsPage({
  params,
  searchParams,
}: {
  params: { lang: string; categorySlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const lang = isSupportedLang(params.lang) ? params.lang : null;
  if (!lang) notFound();

  const requested = decodePathSegment(params.categorySlug).trim();
  const ascii = toPublicCategorySlug(requested) ?? (await resolveCategoryAsciiSlug(requested));
  if (!ascii) notFound();

  const canonicalPath = getCategoryUrl(lang, ascii);
  if (requested !== ascii) {
    const query = new URLSearchParams();
    const open = typeof searchParams?.open === "string" ? searchParams.open : null;
    if (open?.trim()) query.set("open", open.trim());
    permanentRedirect(appendPreservedQuery(canonicalPath, query));
  }

  return <CategoryHubClient params={{ lang, slug: ascii }} />;
}
