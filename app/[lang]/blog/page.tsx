import Link from "next/link";
import { redirect } from "next/navigation";
import { getPublishedPosts } from "@/lib/content/queries";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import type { ContentType } from "@/lib/content/types";

const COPY: Record<Lang, { title: string; intro: string; empty: string }> = {
  ru: {
    title: "Полезные материалы",
    intro: "Истории специалистов, новости Freuly и полезные материалы для жизни и бизнеса в Германии.",
    empty: "Пока нет опубликованных материалов.",
  },
  ua: {
    title: "Корисні матеріали",
    intro: "Історії спеціалістів, новини Freuly та корисні матеріали для життя й бізнесу в Німеччині.",
    empty: "Поки немає опублікованих матеріалів.",
  },
  de: {
    title: "Nützliche Beiträge",
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

export default async function BlogPage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) redirect("/ua/blog");

  const lang = params.lang as Lang;
  const posts = await getPublishedPosts(lang);
  const copy = COPY[lang];

  return (
    <main className="mx-auto w-full max-w-[1312px] px-freuly-4 py-14 sm:px-freuly-6 lg:px-16">
      <header className="flex flex-col items-center text-center">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-freuly-primary">
          Freuly Journal
        </p>
        <h1 className="mt-8 text-[36px] font-semibold leading-tight text-freuly-text-primary">
          {copy.title}
        </h1>
        <p className="mt-3 text-[16px] text-freuly-text-secondary">
          {copy.intro}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-12 rounded-freuly-card border border-freuly-border-default bg-white p-6 text-center text-freuly-body text-freuly-text-secondary">
          {copy.empty}
        </div>
      ) : (
        <section className="mt-12 grid gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            const articleHref = `/${lang}/blog/${post.slug}`;

            return (
              <article
                key={post.id}
                className="flex h-[360px] flex-col overflow-hidden rounded-freuly-lg border border-freuly-border-default bg-white"
              >
                <Link href={articleHref} className="block shrink-0">
                  {post.hero_image_url ? (
                    <div
                      className="h-[180px] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.hero_image_url})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="h-[180px] w-full bg-freuly-primary-light" aria-hidden="true" />
                  )}
                </Link>

                <div className="flex min-h-0 flex-1 flex-col gap-2 p-5">
                  <span className="text-[11px] font-semibold uppercase text-freuly-primary">
                    {TYPE_LABELS[lang][post.content_type]}
                  </span>
                  <h2 className="line-clamp-2 text-[18px] font-semibold leading-[24px] text-freuly-text-primary">
                    <Link href={articleHref} className="hover:underline">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="line-clamp-2 text-freuly-body-sm leading-[18px] text-freuly-text-secondary">
                      {post.excerpt}
                    </p>
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
