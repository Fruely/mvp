import { notFound, permanentRedirect } from "next/navigation";
import { getDictionary, getDictValue, isSupportedLang } from "@/lib/i18n";
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

  const dict = await getDictionary(lang);
  const labels = getDictValue(dict, "categories") as Record<string, unknown> | undefined;
  const label = typeof labels?.[ascii] === "string" ? String(labels[ascii]) : ascii;
  const heading = lang === "ru"
    ? `${label} в Германии на вашем языке`
    : lang === "de"
      ? `${label} in Deutschland – in Ihrer Sprache`
      : `${label} в Німеччині вашою мовою`;

  return <CategoryHubClient params={{ lang, slug: ascii }} initialDict={dict} initialHeading={heading} />;
}
