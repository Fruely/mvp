import Link from "next/link";
import Image from "next/image";
import { t, type Dictionary } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import type { SpecialistResult } from "@/lib/search/specialistSearch";
import {
  resolveLiveSpecialistPhotoFit,
  specialistMainPhotoFitClass,
} from "@/components/specialist/specialistMainPhotoFit";
import { resolvePublicMainPhotoView } from "@/lib/specialists/publicMainPhoto";

type SpecialistResultCardProps = {
  specialist: SpecialistResult;
  lang: string;
  dict: Dictionary;
  profileHref: string;
  leadHref: string;
};

function workFormatLabel(dict: Dictionary, workFormat: string | null): string | null {
  if (!workFormat) return null;
  if (workFormat === "online") return t(dict, "specialist.workFormat.online");
  if (workFormat === "offline") return t(dict, "dashboard.workFormat.offline");
  if (workFormat === "hybrid") return t(dict, "dashboard.workFormat.hybrid");
  return workFormat;
}

function formatDistanceKm(distance: number): string {
  const rounded = Math.round(distance * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-freuly-text-secondary" aria-hidden>
      <path
        d="M6 11s3.5-3.2 3.5-6A3.5 3.5 0 0 0 2.5 5C2.5 7.8 6 11 6 11Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="5" r="1.15" fill="currentColor" />
    </svg>
  );
}

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
  const languages = Array.isArray(specialist.languages)
    ? specialist.languages.filter(Boolean).slice(0, 3)
    : [];
  const formatLabel = workFormatLabel(dict, specialist.work_format);
  const hasDistance = typeof specialist.distance === "number" && Number.isFinite(specialist.distance);
  const mainPhoto = resolvePublicMainPhotoView({
    src: specialist.avatar_url,
    storedPhotoFocus: specialist.photo_focus,
    specialistId: specialist.id,
  });
  const photoFit = resolveLiveSpecialistPhotoFit({
    focus: mainPhoto.photoFocus,
    imageAspect: mainPhoto.imageAspect,
    surface: "thumb",
  });
  const name = specialist.name?.trim() || t(dict, "specialist.fallback");

  return (
    <article className="overflow-hidden rounded-2xl border border-freuly-border-default bg-freuly-surface">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <div className="flex items-center gap-4 sm:contents">
          <div className="relative h-[54px] w-[54px] shrink-0 overflow-hidden rounded-freuly-md bg-freuly-page sm:h-24 sm:w-24">
            {specialist.avatar_url ? (
              <Image
                src={specialist.avatar_url}
                alt={name}
                fill
                sizes="96px"
                unoptimized
                className={specialistMainPhotoFitClass(photoFit)}
                style={{ objectPosition: photoFit.objectPosition }}
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center text-2xl text-freuly-text-muted sm:text-3xl"
                aria-hidden
              >
                👤
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 sm:hidden">
            <h2 className="text-[16px] font-bold leading-tight text-freuly-text-primary">{name}</h2>
            {categoryLabel ? (
              <p className="mt-0.5 text-[13px] font-medium text-freuly-text-secondary">{categoryLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="hidden items-center gap-3 sm:flex">
            <h2 className="text-[18px] font-bold leading-tight text-freuly-text-primary">{name}</h2>
            {categoryLabel ? (
              <>
                <span className="text-sm text-[#9B9B9B]" aria-hidden>
                  •
                </span>
                <p className="text-sm font-medium text-freuly-text-secondary">{categoryLabel}</p>
              </>
            ) : null}
          </div>

          <p className="mt-0 line-clamp-3 text-sm leading-[1.5] text-freuly-text-secondary sm:mt-3 sm:line-clamp-2">
            {specialist.bio || t(dict, "search.results.specialistFallbackBio")}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {specialist.postal_code ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-freuly-text-secondary">
                <MapPinIcon />
                {specialist.postal_code}
              </span>
            ) : null}
            {hasDistance ? (
              <span className="text-[13px] text-freuly-text-secondary">
                {formatDistanceKm(specialist.distance as number)}
              </span>
            ) : null}
            {formatLabel ? (
              <span className="rounded bg-freuly-page px-2 py-0.5 text-xs font-medium text-freuly-text-secondary">
                {formatLabel}
              </span>
            ) : null}
            {languages.length > 0 ? (
              <span className="hidden flex-wrap gap-1.5 sm:inline-flex">
                {languages.map((code) => (
                  <span
                    key={code}
                    className="rounded bg-freuly-primary-light px-1.5 py-0.5 text-[11px] font-semibold uppercase text-freuly-primary"
                  >
                    {code}
                  </span>
                ))}
              </span>
            ) : null}
          </div>

          {languages.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
              {languages.map((code) => (
                <span
                  key={code}
                  className="rounded bg-freuly-primary-light px-1.5 py-0.5 text-[11px] font-semibold uppercase text-freuly-primary"
                >
                  {code}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-freuly-border-default pt-3 sm:w-40 sm:shrink-0 sm:items-end sm:border-0 sm:pt-0">
          <Link
            href={leadHref}
            className="inline-flex min-h-9 w-full items-center justify-center rounded-freuly-md bg-freuly-primary px-4 py-3 text-sm font-semibold text-freuly-text-on-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-hover"
          >
            {t(dict, "search.results.sendRequest")}
          </Link>
          <Link
            href={profileHref}
            className="text-center text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover sm:text-right"
          >
            {t(dict, "search.results.viewProfile")} →
          </Link>
        </div>
      </div>
    </article>
  );
}
