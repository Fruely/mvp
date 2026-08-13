import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui";
import {
  publicCardClass,
  publicLinkOutlineClass,
  publicLinkPrimaryClass,
} from "@/components/public/publicStyles";
import { t, type Dictionary } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import type { SpecialistResult } from "@/lib/search/specialistSearch";

type SpecialistResultCardProps = {
  specialist: SpecialistResult;
  lang: string;
  dict: Dictionary;
  profileHref: string;
  leadHref: string;
};

export default function SpecialistResultCard({
  specialist,
  lang,
  dict,
  profileHref,
  leadHref,
}: SpecialistResultCardProps) {
  const categoryLabel = getCategoryTitle(
    {
      title: specialist.category_title,
      title_ru: specialist.category_title_ru,
      title_de: specialist.category_title_de,
      title_ua: specialist.category_title_ua,
    },
    toCategoryTitleLang(lang),
  );
  const languages = Array.isArray(specialist.languages) ? specialist.languages.filter(Boolean).slice(0, 3) : [];

  return (
    <article className={`${publicCardClass} overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]`}>
      <div className="flex flex-col gap-freuly-5 p-freuly-5 sm:flex-row sm:p-freuly-6">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-freuly-md bg-freuly-border-subtle sm:h-32 sm:w-32">
          {specialist.avatar_url ? (
            <Image
              src={specialist.avatar_url}
              alt={specialist.name ?? t(dict, "specialist.fallback")}
              fill
              sizes="128px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl text-freuly-text-muted" aria-hidden>
              👤
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-freuly-card-title text-freuly-text-primary">{specialist.name}</h2>
          {categoryLabel ? (
            <p className="mt-0.5 text-freuly-body-sm text-freuly-text-muted">{categoryLabel}</p>
          ) : null}
          <p className="mt-freuly-2 line-clamp-2 text-freuly-body-sm leading-relaxed text-freuly-text-secondary">
            {specialist.bio || t(dict, "search.results.specialistFallbackBio")}
          </p>

          <div className="mt-freuly-3 flex flex-wrap items-center gap-2 text-freuly-helper text-freuly-text-muted">
            {specialist.postal_code ? <span>{specialist.postal_code}</span> : null}
            {typeof specialist.distance === "number" && Number.isFinite(specialist.distance) ? (
              <span>{specialist.distance} km</span>
            ) : null}
            {specialist.work_format && specialist.work_format !== "online" ? (
              <span>{specialist.work_format}</span>
            ) : null}
            {languages.map((code) => (
              <Badge key={code} variant="neutral" className="px-2 py-0.5 text-[11px]">
                {code}
              </Badge>
            ))}
          </div>

          <div className="mt-freuly-4 flex flex-wrap gap-freuly-3">
            <Link href={leadHref} className={publicLinkPrimaryClass}>
              {t(dict, "search.results.sendRequest")}
            </Link>
            <Link href={profileHref} className={publicLinkOutlineClass}>
              {t(dict, "search.results.viewProfile")} →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
