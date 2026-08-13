import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getSpecialistUrl } from "@/lib/urls";
import { publicCardClass } from "@/components/public/publicStyles";
import FounderBadge from "@/components/specialist/FounderBadge";

export type HomeSpecialistCardData = {
  id: string;
  slug: string | null;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  languages: string[];
  category_title: string | null;
  category_title_ru: string | null;
  category_title_de: string | null;
  category_title_ua: string | null;
  about_line?: string | null;
  founder_badge?: boolean;
  badges?: string[];
  placement_group?: string;
};

type HomeSpecialistCardProps = {
  lang: Lang;
  dict: Dictionary;
  specialist: HomeSpecialistCardData;
};

function languageLabel(code: string, dict: Dictionary): string {
  const normalized = code.toLowerCase();
  if (normalized === "ru") return t(dict, "home.heroLang.ru");
  if (normalized === "uk" || normalized === "ua") return t(dict, "home.heroLang.uk");
  if (normalized === "de") return t(dict, "home.heroLang.de");
  return code.toUpperCase();
}

export default function HomeSpecialistCard({ lang, dict, specialist }: HomeSpecialistCardProps) {
  const profileHref = getSpecialistUrl(lang, specialist);
  const categoryLabel =
    getCategoryTitle(
      {
        title: specialist.category_title,
        title_ru: specialist.category_title_ru,
        title_de: specialist.category_title_de,
        title_ua: specialist.category_title_ua,
      },
      toCategoryTitleLang(lang),
    ) || t(dict, "home.recommended.defaultCategory");
  const displayName = specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback");
  const languages = specialist.languages.slice(0, 2);

  return (
    <article className={`${publicCardClass} flex h-full flex-col overflow-hidden rounded-freuly-xl`}>
      <div className="relative h-[200px] w-full overflow-hidden bg-freuly-border-subtle sm:h-[220px]">
        {specialist.founder_badge ? (
          <div className="absolute left-4 top-4 z-10">
            <FounderBadge />
          </div>
        ) : null}
        {specialist.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={specialist.avatar_url}
            alt={displayName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-freuly-border-subtle" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1.5">
          <span className="inline-flex rounded-freuly-pill bg-freuly-primary-light px-2.5 py-1 text-[11px] font-semibold text-freuly-primary">
            {t(dict, "home.recommended.verifiedBadge")}
          </span>
          <p className="text-lg font-bold leading-tight text-freuly-text-primary line-clamp-1">
            {displayName}
          </p>
          <p className="text-sm text-freuly-text-secondary line-clamp-1">{categoryLabel}</p>
        </div>

        {languages.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-freuly-text-muted">
              {t(dict, "home.recommended.speaksLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {languages.map((code, index) => (
                <span
                  key={code}
                  className={[
                    "inline-flex items-center rounded-freuly-pill px-2.5 py-1 text-xs font-semibold",
                    index === 0
                      ? "bg-freuly-primary-light text-freuly-primary"
                      : "bg-freuly-page text-freuly-text-primary",
                  ].join(" ")}
                >
                  {languageLabel(code, dict)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {specialist.about_line ? (
          <>
            <div className="border-t border-freuly-border-default" />
            <p className="min-h-[60px] text-[13px] italic leading-relaxed text-freuly-text-secondary line-clamp-3">
              &ldquo;{specialist.about_line}&rdquo;
            </p>
          </>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-freuly-text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {specialist.city || t(dict, "home.recommended.newSpecialist")}
            </span>
          </span>
          <Link
            href={profileHref}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            {t(dict, "search.results.viewProfile")}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
