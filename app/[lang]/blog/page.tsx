import { redirect } from "next/navigation";
import { getPublishedPosts } from "@/lib/content/queries";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import type { ContentType } from "@/lib/content/types";

const COPY: Record<Lang, { title: string; intro: string; empty: string }> = {
  ru: {
    title: "Материалы Freuly",
    intro: "Истории специалистов, новости Freuly и полезные материалы для жизни и бизнеса в Германии.",
    empty: "Пока нет опубликованных материалов.",
  },
  ua: {
    title: "Матеріали Freuly",
    intro: "Історії спеціалістів, новини Freuly та корисні матеріали для життя й бізнесу в Німеччині.",
    empty: "Поки немає опублікованих матеріалів.",
  },
  de: {
    title: "Freuly Magazin",
    intro: "Geschichten von Spezialisten, Freuly-News und praktische Inhalte für Leben und Business in Deutschland.",
    empty: "Noch keine veröffentlichten Beiträge.",
  },
};

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

export default async function BlogPage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) redirect("/ua/blog");

  const lang = params.lang as Lang;
  const posts = await getPublishedPosts(lang);
  const copy = COPY[lang];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="max-w-3xl">
        <h1 className="text-freuly-page-title text-freuly-text-primary">{copy.title}</h1>
        <p className="mt-3 text-freuly-page-subtitle text-freuly-text-secondary">{copy.intro}</p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-10 rounded-freuly-card border border-freuly-border-subtle bg-freuly-surface p-6 text-freuly-body text-freuly-text-secondary">
          {copy.empty}
        </div>
      ) : (
        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const publishedDate = formatDate(post.published_at, lang);

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-freuly-card border border-freuly-border-subtle bg-freuly-surface shadow-card"
              >
                {post.hero_image_url ? (
                  <div
                    className="aspect-[16/9] bg-cover bg-center"
                    style={{ backgroundImage: `url(${post.hero_image_url})` }}
                    aria-hidden="true"
                  />
                ) : (
                  <div className="aspect-[16/9] bg-freuly-primary-light" aria-hidden="true" />
                )}

                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-freuly-helper text-freuly-text-muted">
                    <span>{TYPE_LABELS[lang][post.content_type]}</span>
                    {publishedDate && (
                      <>
                        <span aria-hidden="true">·</span>
                        <time dateTime={post.published_at ?? undefined}>{publishedDate}</time>
                      </>
                    )}
                  </div>

                  <h2 className="mt-3 text-freuly-card-title text-freuly-text-primary">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 text-freuly-body text-freuly-text-secondary">{post.excerpt}</p>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
