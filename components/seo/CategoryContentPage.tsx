import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { SeoCategoryContent } from "@/lib/seo/content";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
} from "@/lib/seo/jsonLd";

export type CategoryContentSpec = {
  id: string;
  slug?: string | null;
  name: string | null;
  city: string | null;
  postal_code?: string | null;
  bio?: string | null;
};

type Props = {
  lang: Lang;
  content: SeoCategoryContent;
  specialists: CategoryContentSpec[];
};

function toParagraphs(body: string | readonly string[] | undefined): string[] {
  if (!body) return [];
  return Array.isArray(body) ? [...body] : [body as string];
}

/**
 * Reusable template for Freuly SEO category landing pages.
 *
 * This template:
 *  - renders all SSR content (intro, sections, FAQ) in the initial HTML,
 *    so crawlers and AI retrieval do not depend on hydration;
 *  - emits BreadcrumbList + CollectionPage JSON-LD, and FAQPage JSON-LD
 *    only when the page actually renders an FAQ section;
 *  - supports both "parent" and "child" category roles through the
 *    `SeoCategoryContent.categoryType` + `parentSlug` fields.
 *
 * Canonical / hreflang metadata remains the responsibility of the page's
 * `generateMetadata` export — same contract as the existing SEO pages.
 */
export default function CategoryContentPage({
  lang,
  content,
  specialists,
}: Props) {
  const introParagraphs = toParagraphs(content.intro);
  const ctaHref =
    content.cta.ctaHref ?? `/${lang}/category/${content.slug}`;

  const breadcrumbJsonLd = buildBreadcrumbListJsonLd({ lang, content });
  const collectionJsonLd = buildCollectionPageJsonLd({ lang, content });
  const faqJsonLd = buildFaqPageJsonLd({ content });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href={`/${lang}`} className="hover:underline">
              {content.homeLabel}
            </Link>
          </li>
          {content.parentSlug && content.parentLabel ? (
            <>
              <li aria-hidden className="px-1">/</li>
              <li>
                <Link
                  href={`/${lang}/${content.parentSlug}`}
                  className="hover:underline"
                >
                  {content.parentLabel}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden className="px-1">/</li>
          <li aria-current="page" className="text-gray-700">
            {content.breadcrumbsLabel}
          </li>
        </ol>
      </nav>

      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        {content.h1}
      </h1>

      {introParagraphs.length > 0 ? (
        <div className="mt-6 space-y-4 text-base leading-relaxed text-gray-700">
          {introParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : null}

      {content.subcategories && content.subcategories.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-gray-900">
            {content.subcategoriesTitle ?? ""}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {content.subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={`/${lang}/category/${sub.slug}`}
                className="block rounded-lg border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-md"
              >
                <span className="block text-sm font-semibold text-gray-900">
                  {sub.label}
                </span>
                {sub.description ? (
                  <span className="mt-1 block text-sm text-gray-600">
                    {sub.description}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900">
          {content.specialistsTitle}
        </h2>
        {specialists.length > 0 ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {specialists.map((s) => (
              <Link
                key={s.id}
                href={`/${lang}/specialist/${s.slug || s.id}`}
                className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500">
                  {(s.name ?? "?")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {s.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.city}
                    {s.postal_code ? `, ${s.postal_code}` : ""}
                  </p>
                  {s.bio ? (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {s.bio}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 italic text-gray-500">
            {content.specialistsEmpty}
          </p>
        )}
      </section>

      <div className="mt-14 space-y-10 text-base leading-relaxed text-gray-700">
        {content.sections.map((section, idx) => {
          const paragraphs = toParagraphs(section.body);
          return (
            <section key={idx}>
              <h2 className="text-2xl font-semibold text-gray-900">
                {section.heading}
              </h2>
              {paragraphs.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              ) : null}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5">
                  {section.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>

      {content.faq && content.faq.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-2xl font-semibold text-gray-900">
            {content.faqTitle ?? "FAQ"}
          </h2>
          <div className="mt-4 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
            {content.faq.map((item, idx) => (
              <details key={idx} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-base font-medium text-gray-900">
                  <span>{item.question}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 text-gray-400 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12 rounded-2xl bg-teal-50 px-6 py-10 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {content.cta.heading}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-gray-600">
          {content.cta.body}
        </p>
        <Link
          href={ctaHref}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-teal-600 px-8 text-base font-semibold text-white transition hover:bg-teal-700"
        >
          {content.cta.buttonLabel}
        </Link>
      </section>

      {content.relatedLinks.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900">
            {content.relatedTitle}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {content.relatedLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={`/${lang}/${link.href}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-md"
                >
                  <span className="block text-sm font-semibold text-blue-600">
                    {link.label}
                  </span>
                  {link.description ? (
                    <span className="mt-1 block text-sm text-gray-600">
                      {link.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd),
        }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd),
          }}
        />
      ) : null}
    </main>
  );
}
