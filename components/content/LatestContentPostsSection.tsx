import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { HomepageLatestPost } from "@/lib/homepage/types";

const COPY: Record<Lang, { title: string; viewAll: string }> = {
  ru: { title: "Последние публикации", viewAll: "Все материалы" },
  ua: { title: "Останні публікації", viewAll: "Усі матеріали" },
  de: { title: "Neueste Beiträge", viewAll: "Alle Beiträge" },
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
    <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1312px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary sm:text-[32px]">
            {copy.title}
          </h2>
          <Link
            href={`/${lang}/blog`}
            className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            {copy.viewAll} →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {posts.slice(0, 3).map((post) => {
            const publishedDate = formatDate(post.published_at, lang);
            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-freuly-card border border-freuly-border-subtle bg-freuly-surface shadow-card"
              >
                <Link href={`/${lang}/blog/${post.slug}`} className="block">
                  {post.hero_image_url ? (
                    <div
                      className="aspect-[16/9] bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.hero_image_url})` }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="aspect-[16/9] bg-freuly-primary-light" aria-hidden="true" />
                  )}
                </Link>

                <div className="p-5">
                  {publishedDate && (
                    <time
                      dateTime={post.published_at ?? undefined}
                      className="text-freuly-helper text-freuly-text-muted"
                    >
                      {publishedDate}
                    </time>
                  )}
                  <h3 className="mt-2 text-freuly-card-title text-freuly-text-primary">
                    <Link href={`/${lang}/blog/${post.slug}`} className="hover:underline">
                      {post.title}
                    </Link>
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-freuly-body text-freuly-text-secondary">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
