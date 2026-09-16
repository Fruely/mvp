import { notFound, permanentRedirect } from "next/navigation";
import { getDictionary, getDictValue, isSupportedLang } from "@/lib/i18n";
import { resolveCategoryAsciiSlug } from "@/lib/categories/resolvePublicCategorySlug";
import {
  appendPreservedQuery,
  decodePathSegment,
  getCategoryUrl,
  toPublicCategorySlug,
} from "@/lib/publicUrls";
import { getSeoSpecialists } from "@/lib/servicesSeo";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import CategoryHubClient from "./CategoryHubClient";

function uniqueNonEmpty(values: Array<string | null | undefined>, limit: number): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  ).slice(0, limit);
}

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

  const seoSpecialists = await getSeoSpecialists({ category: ascii }).catch((error) => {
    console.error("[category page] SEO specialist context unavailable", error);
    return [];
  });

  const cities = uniqueNonEmpty(seoSpecialists.map((item) => item.city), 5);
  const languages = uniqueNonEmpty(seoSpecialists.flatMap((item) => item.languages), 5);
  const services = uniqueNonEmpty(seoSpecialists.flatMap((item) => item.services), 6);

  const contextTitle =
    lang === "de"
      ? `${label} bei Freuly`
      : lang === "ua"
        ? `${label} на Freuly`
        : `${label} на Freuly`;

  const contextText =
    lang === "de"
      ? `Auf Freuly finden Sie aktuell ${seoSpecialists.length} öffentlich sichtbare Profile in dieser Kategorie. Sie können Spezialisten nach Sprache, Ort und Arbeitsformat vergleichen und direkt das passende Profil öffnen.${cities.length ? ` Vertretene Orte sind unter anderem ${cities.join(", ")}.` : ""}${languages.length ? ` Verfügbare Sprachen umfassen unter anderem ${languages.join(", ")}.` : ""}`
      : lang === "ua"
        ? `На Freuly зараз доступно ${seoSpecialists.length} публічних профілів у цій категорії. Ви можете порівняти спеціалістів за мовою, містом і форматом роботи та відкрити відповідний профіль.${cities.length ? ` Серед представлених міст: ${cities.join(", ")}.` : ""}${languages.length ? ` Серед доступних мов: ${languages.join(", ")}.` : ""}`
        : `На Freuly сейчас доступно ${seoSpecialists.length} публичных профилей в этой категории. Можно сравнить специалистов по языку, городу и формату работы и перейти в подходящий профиль.${cities.length ? ` Среди представленных городов: ${cities.join(", ")}.` : ""}${languages.length ? ` Среди доступных языков: ${languages.join(", ")}.` : ""}`;

  const servicesText =
    services.length === 0
      ? null
      : lang === "de"
        ? `Beispiele für angebotene Leistungen: ${services.join(", ")}.`
        : lang === "ua"
          ? `Приклади доступних послуг: ${services.join(", ")}.`
          : `Примеры доступных услуг: ${services.join(", ")}.`;

  const itemListJsonLd = seoSpecialists.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: heading,
        numberOfItems: seoSpecialists.length,
        itemListElement: seoSpecialists.slice(0, 12).map((specialist, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: specialist.name || label,
          url: specialist.slug
            ? `${SITE_DOMAIN}/${lang}/specialist/${specialist.slug}`
            : canonicalPath,
        })),
      }
    : null;

  return (
    <>
      <CategoryHubClient params={{ lang, slug: ascii }} initialDict={dict} initialHeading={heading} />

      {seoSpecialists.length > 0 && (
        <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-black/5 bg-white p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-freuly-text-primary">{contextTitle}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-freuly-text-secondary">
              {contextText}
            </p>
            {servicesText && (
              <p className="mt-2 max-w-4xl text-sm leading-6 text-freuly-text-secondary">
                {servicesText}
              </p>
            )}
          </div>
        </section>
      )}

      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </>
  );
}
