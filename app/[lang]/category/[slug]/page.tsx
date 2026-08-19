import { notFound, permanentRedirect } from "next/navigation";
import { isSupportedLang } from "@/lib/i18n";
import { resolveCategoryAsciiSlug } from "@/lib/categories/resolvePublicCategorySlug";
import { appendPreservedQuery, decodePathSegment, getCategoryUrl } from "@/lib/publicUrls";

export default async function LegacyCategoryPage({
  params,
  searchParams,
}: {
  params: { lang: string; slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const lang = isSupportedLang(params.lang) ? params.lang : "ru";
  const requested = decodePathSegment(params.slug).trim();
  const ascii = await resolveCategoryAsciiSlug(requested);
  if (!ascii) notFound();

  const query = new URLSearchParams();
  const open = typeof searchParams?.open === "string" ? searchParams.open : null;
  if (open?.trim()) query.set("open", open.trim());
  permanentRedirect(appendPreservedQuery(getCategoryUrl(lang, ascii), query));
}
