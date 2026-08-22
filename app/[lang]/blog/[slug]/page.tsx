import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { getPublishedPost } from "@/lib/content/queries";
import { isSupportedLang, type Lang } from "@/lib/i18n";
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
  ru: "Все материалы",
  ua: "Усі матеріали",
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href={`/${lang}/blog`}
        className="text-freuly-body-sm font-medium text-freuly-primary hover:underline"
      >
        ← {BACK_LABEL[lang]}
      </Link>

      <article className="mt-8">
        <header>
          <div className="flex flex-wrap items-center gap-2 text-freuly-helper text-freuly-text-muted">
            <span>{TYPE_LABELS[lang][post.content_type]}</span>
            {publishedDate && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.published_at ?? undefined}>{publishedDate}</time>
              </>
            )}
          </div>

          <h1 className="mt-4 text-freuly-page-title text-freuly-text-primary">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-4 text-freuly-page-subtitle text-freuly-text-secondary">{post.excerpt}</p>
          )}
        </header>

        {post.hero_image_url && (
          <div className="mt-8 overflow-hidden rounded-freuly-card border border-freuly-border-subtle bg-freuly-surface">
            <img src={post.hero_image_url} alt="" className="h-auto w-full" />
          </div>
        )}

        <div className="mt-10">
          <MarkdownContent source={post.body_markdown} />
        </div>

        {showCta && ctaLabel && (
          <aside className="mt-12 rounded-freuly-card border border-freuly-border-subtle bg-freuly-primary-light p-6">
            <a
              href={ctaHref}
              className="inline-flex rounded-freuly-button bg-freuly-primary px-5 py-3 text-freuly-button text-freuly-text-on-primary hover:bg-freuly-primary-hover"
            >
              {ctaLabel}
            </a>
          </aside>
        )}
      </article>
    </main>
  );
}
