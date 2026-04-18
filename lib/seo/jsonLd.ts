import type { Lang } from "@/lib/i18n";
import type { SeoCategoryContent } from "@/lib/seo/content";

/**
 * Minimal JSON-LD builders for Freuly SEO category pages.
 *
 * Only shapes that are actually represented on the page are emitted:
 *   - BreadcrumbList: always useful.
 *   - CollectionPage: category pages list specialists, so this fits.
 *   - FAQPage: only when `content.faq` actually renders on the page.
 *
 * No @type is emitted speculatively; we keep the schema aligned with
 * the DOM.
 */

type JsonLd = Record<string, unknown>;

const DOMAIN = process.env.APP_URL || "https://freuly.de";

function absoluteUrl(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${DOMAIN}${trimmed}`;
}

export function buildBreadcrumbListJsonLd(args: {
  lang: Lang;
  content: SeoCategoryContent;
}): JsonLd {
  const { lang, content } = args;

  const items: JsonLd[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: content.homeLabel,
      item: absoluteUrl(`/${lang}`),
    },
  ];

  let position = 2;

  if (content.parentSlug && content.parentLabel) {
    items.push({
      "@type": "ListItem",
      position,
      name: content.parentLabel,
      item: absoluteUrl(`/${lang}/${content.parentSlug}`),
    });
    position += 1;
  }

  items.push({
    "@type": "ListItem",
    position,
    name: content.breadcrumbsLabel,
    item: absoluteUrl(`/${lang}/${content.slug}`),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function buildCollectionPageJsonLd(args: {
  lang: Lang;
  content: SeoCategoryContent;
}): JsonLd {
  const { lang, content } = args;
  const url = absoluteUrl(`/${lang}/${content.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url,
    name: content.metaTitle,
    description: content.metaDescription,
    inLanguage: lang,
    isPartOf: {
      "@type": "WebSite",
      url: DOMAIN,
      name: "Freuly",
    },
  };
}

export function buildFaqPageJsonLd(args: {
  content: SeoCategoryContent;
}): JsonLd | null {
  const { content } = args;
  if (!content.faq || content.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
