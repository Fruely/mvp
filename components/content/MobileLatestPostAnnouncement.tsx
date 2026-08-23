import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { HomepageLatestPost } from "@/lib/homepage/types";

const COPY: Record<Lang, { eyebrow: string; cta: string }> = {
  ru: { eyebrow: "Новое в Freuly Journal", cta: "Читать" },
  ua: { eyebrow: "Нове у Freuly Journal", cta: "Читати" },
  de: { eyebrow: "Neu im Freuly Journal", cta: "Lesen" },
};

export default function MobileLatestPostAnnouncement({
  lang,
  post,
}: {
  lang: Lang;
  post?: HomepageLatestPost | null;
}) {
  if (!post) return null;

  const copy = COPY[lang];

  return (
    <div className="border-b border-freuly-border-subtle bg-white px-freuly-4 py-3 md:hidden">
      <Link
        href={`/${lang}/blog/${post.slug}`}
        className="mx-auto flex max-w-7xl items-center gap-3 rounded-freuly-button bg-freuly-primary-light px-4 py-3 transition-colors hover:bg-[#ece8ff]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-freuly-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              New
            </span>
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-freuly-primary">
              {copy.eyebrow}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[19px] text-freuly-text-primary">
            {post.title}
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-semibold text-freuly-primary">
          {copy.cta} →
        </span>
      </Link>
    </div>
  );
}
