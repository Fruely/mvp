import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { ContentType } from "@/lib/content/types";
import type { HomepageLatestPost } from "@/lib/homepage/types";

const COPY: Record<Lang, { title: string; viewAll: string }> = {
  ru: { title: "Полезные материалы", viewAll: "Все публикации" },
  ua: { title: "Корисні матеріали", viewAll: "Усі публікації" },
  de: { title: "Nützliche Beiträge", viewAll: "Alle Beiträge" },
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

export default function LatestContentPostsSection({
  lang,
  posts,
}: {
  lang: Lang;
  posts: HomepageLatestPost[];
}) {
  if (posts.length === 0) return null;

  const copy = COPY[lang];

  return (
    <section className="bg-freuly-page px-freuly-4 py-14 sm:px-freuly-6 sm:py-14 lg:px-16 lg:py-14">
      <div className="mx-auto w-full max-w-[1312px]">
        <p className="text-center text-[13px] font-semibold uppercase tracking-wide text-freuly-primary">
          Freuly Journal
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-freuly-page-title text-freuly-text-primary">
            {copy.title}
          </h2>
          <Link
            href={`/${lang}/blog`}
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            {copy.viewAll}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5.25 3.5L8.75 7L5.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="flex h-[360px] flex-col overflow-hidden rounded-freuly-lg border border-freuly-border-default bg-white"
            >
              <Link href={`/${lang}/blog/${post.slug}`} className="block shrink-0">
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
                <h3 className="line-clamp-2 text-[18px] font-semibold leading-[24px] text-freuly-text-primary">
                  <Link href={`/${lang}/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h3>
                {post.excerpt && (
                  <p className="line-clamp-2 text-freuly-body-sm leading-[18px] text-freuly-text-secondary">
                    {post.excerpt}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
