import Link from "next/link";
import { SEO_CATEGORY_SLUGS } from "@/content/seo/categories";
import type { Lang } from "@/lib/i18n";
import type { ReactNode } from "react";

export type LangLabel = { de: string; ru: string; ua: string };

export type CategorySeoMeta = {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  areasTitle: string;
  specialistsTitle: string;
  specialistsEmpty: string;
  ctaHeading: string;
  ctaText: string;
  ctaButton: string;
  otherTitle: string;
  seeAlso: string;
  home: string;
  allSpecialists: string;
  becomeSpecialist: string;
};

export type CategorySeoSpec = {
  id: string;
  slug?: string | null;
  name: string;
  city: string;
  postal_code?: string;
  bio?: string;
};

type Props = {
  lang: Lang;
  slug: string;
  copy: CategorySeoMeta;
  subcategories: (LangLabel & { slug: string })[];
  crossLinks: (LangLabel & { href: string })[];
  specialists: CategorySeoSpec[];
  seoContent: ReactNode;
};

function lbl(item: LangLabel, lang: Lang) {
  if (lang === "de") return item.de;
  if (lang === "ua") return item.ua;
  return item.ru;
}

export default function CategorySeoPage({
  lang,
  slug,
  copy,
  subcategories,
  crossLinks,
  specialists,
  seoContent,
}: Props) {
  const currentSlug = slug;
  const otherCategories = SEO_CATEGORY_SLUGS.filter(
    (s) => s !== currentSlug
  ).slice(0, 4);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {copy.h1}
      </h1>

      <p className="mt-6 text-base leading-relaxed text-gray-700">{copy.intro}</p>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.areasTitle}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subcategories.map((sub) => (
            <Link
              key={sub.slug}
              href={`/${lang}/search?category=${sub.slug}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition-shadow hover:shadow-md"
            >
              {lbl(sub, lang)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.specialistsTitle}</h2>
        {specialists.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {specialists.map((s) => (
              <Link
                key={s.id}
                href={`/${lang}/specialist/${s.slug || s.id}`}
                className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                  {(s.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{s.name}</p>
                  <p className="text-sm text-gray-500">
                    {s.city}{s.postal_code ? `, ${s.postal_code}` : ""}
                  </p>
                  {s.bio && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{s.bio}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-gray-500 italic">{copy.specialistsEmpty}</p>
        )}
      </section>

      <article className="mt-14 space-y-8 text-base leading-relaxed text-gray-700">
        {seoContent}
      </article>

      <div className="mt-10">
        <h3 className="text-lg font-semibold mb-4">
          {lang === "de"
            ? "Ähnliche Kategorien"
            : lang === "ua"
              ? "Схожі категорії"
              : "Похожие категории"}
        </h3>

        <div className="flex flex-wrap gap-3">
          {otherCategories.map((catSlug) => (
            <a
              key={catSlug}
              href={`/${lang}/${catSlug}`}
              className="px-4 py-2 rounded-xl border hover:shadow-md transition"
            >
              {catSlug}
            </a>
          ))}
        </div>
      </div>

      <section className="mt-12 rounded-2xl bg-teal-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">{copy.ctaHeading}</h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">{copy.ctaText}</p>
        <Link
          href={`/${lang}/search?category=${slug}`}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          {copy.ctaButton}
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-gray-900">{copy.otherTitle}</h2>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {crossLinks.map((link) => (
            <li key={link.href}>
              <Link href={`/${lang}/${link.href}`} className="text-blue-600 hover:underline">
                {lbl(link, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10 border-t border-gray-200 pt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {copy.seeAlso}
        </h3>
        <nav className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={`/${lang}`} className="text-blue-600 hover:underline">{copy.home}</Link>
          <Link href="/specialists" className="text-blue-600 hover:underline">{copy.allSpecialists}</Link>
          <Link href="/for-specialists" className="text-blue-600 hover:underline">{copy.becomeSpecialist}</Link>
        </nav>
      </section>
    </main>
  );
}
