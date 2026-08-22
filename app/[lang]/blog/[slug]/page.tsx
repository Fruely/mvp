import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { getPublishedPost } from "@/lib/content/queries";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import type { ContentCtaType, ContentType } from "@/lib/content/types";

const TYPE_LABELS: Record<Lang, Record<ContentType, string>> = {
  ru: {
    specialist_story: "История специалиста",
    freuly_news: "Новости Freuly",
    guide: "Полезный материал",
    entrepreneur_life: "Бизнес и жизнь",
  },
  ua: {
    specialist_story: "Історія спеціаліста",
    freuly_news: "Новини Freuly",
    guide: "Корисний матеріал",
    entrepreneur_life: "Бізнес і життя",
  },
  de: {
    specialist_story: "Spezialisten-Story",
    freuly_news: "Freuly News",
    guide: "Ratgeber",
    entrepreneur_life: "Business & Leben",
  },
};

const BACK_LABEL: Record<Lang, string> = {
  ru: "Все публикации",
  ua: "Усі публікації",
  de: "Alle Beiträge",
};

const CTA_LABELS: Record<Lang, Record<Exclude<ContentCtaType, "none">, string>> = {
  ru: {
    search: "Найти специалиста",
    specialist: "Открыть профиль специалиста",
    become_specialist: "Стать специалистом на Freuly",
  },
  ua: {
    search: "Знайти спеціаліста",
    specialist: "Відкрити профіль спеціаліста",
    become_specialist: "Стати спеціалістом на Freuly",
  },
  de: {
    search: "Spezialisten finden",
    specialist: "Spezialistenprofil öffnen",
    become_specialist: "Spezialist bei Freuly werden",
  },
};

function formatDate(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const locale = lang === "de" ? "de-DE" : lang === "ua" ? "uk-UA" : "ru-RU";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function safeCtaHref(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function articleUrl(lang: Lang, slug: string): string {
  return `${SITE_DOMAIN}/${lang}/blog/${slug}`;
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string; slug: string };
}): Promise<Metadata> {
  if (!isSupportedLang(params.lang)) return {};

  const lang = params.lang as Lang;
  const post = await getPublishedPost(lang, params.slug);
  if (!post) return {};

  const url = articleUrl(lang, post.slug);
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: post.hero_image_url ? [{ url: post.hero_image_url }] : undefined,
      siteName: "Freuly",
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: { lang: string; slug: string };
}) {
  if (!isSupportedLang(params.lang)) redirect("/ua/blog");

  const lang = params.lang as Lang;
  const post = await getPublishedPost(lang, params.slug);
  if (!post) notFound();

  const publishedDate = formatDate(post.published_at, lang);
  const ctaHref = safeCtaHref(post.cta_href);
  const showCta = post.cta_type !== "none" && ctaHref;
  const ctaLabel =
    post.cta_type !== "none"
      ? post.cta_label || CTA_LABELS[lang][post.cta_type]
      : null;
  const url = articleUrl(lang, post.slug);
  const description = post.seo_description || post.excerpt;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seo_title || post.title,
    description: description || undefined,
    image: post.hero_image_url ? [post.hero_image_url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: "Freuly",
      url: SITE_DOMAIN,
    },
    publisher: {
      "@type": "Organization",
      name: "Freuly",
      url: SITE_DOMAIN,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };

  return (
    <main className="mx-auto w-full max-w-[720px] px-freuly-4 pb-20 pt-14 sm:px-freuly-6 lg:px-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article>
        <header className="pb-4">
          <span className="text-[12px] font-semibold uppercase text-freuly-primary">
            {TYPE_LABELS[lang][post.content_type]}
          </span>
          <h1 className="mt-3 text-[32px] font-semibold leading-[1.3] text-freuly-text-primary">
            {post.title}
          </h1>
        </header>

        {post.excerpt && (
          <p className="pb-8 text-[18px] leading-[1.6] text-freuly-text-secondary">
            {post.excerpt}
          </p>
        )}

        {publishedDate && (
          <p className="pb-8 text-[13px] text-[#9b9b9b]">
            <time dateTime={post.published_at ?? undefined}>{publishedDate}</time>
          </p>
        )}

        {post.hero_image_url && (
          <div className="mb-10 overflow-hidden rounded-freuly-lg">
            <img
              src={post.hero_image_url}
              alt=""
              className="h-[400px] w-full object-cover"
            />
          </div>
        )}

        <div className="pb-14">
          <MarkdownContent source={post.body_markdown} />
        </div>

        {showCta && ctaLabel && (
          <div className="mb-8 rounded-freuly-lg bg-freuly-page p-8">
            {post.cta_label && (
              <p className="text-[18px] font-semibold text-freuly-text-primary">
                {post.cta_label}
              </p>
            )}
            <div className="mt-4">
              <a
                href={ctaHref}
                className="inline-flex rounded-freuly-button bg-freuly-primary px-6 py-3.5 text-[15px] font-semibold text-freuly-text-on-primary hover:bg-freuly-primary-hover"
              >
                {ctaLabel}
              </a>
            </div>
          </div>
        )}
      </article>

      <Link
        href={`/${lang}/blog`}
        className="mt-8 inline-flex items-center gap-2 text-[14px] font-semibold text-freuly-primary hover:underline"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {BACK_LABEL[lang]}
      </Link>
    </main>
  );
}
