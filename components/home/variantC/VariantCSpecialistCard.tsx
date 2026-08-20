import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getSpecialistUrl } from "@/lib/urls";
import FounderBadge from "@/components/specialist/FounderBadge";
import {
  resolveLiveSpecialistPhotoFit,
  specialistMainPhotoFitClass,
} from "@/components/specialist/specialistMainPhotoFit";
import { publicCardClass } from "@/components/public/publicStyles";
import { resolvePublicMainPhotoView } from "@/lib/specialists/publicMainPhoto";

export type VariantCSpecialist = {
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
  photo_focus?: unknown;
};

export default function VariantCSpecialistCard({
  specialist,
  lang,
  dict,
}: {
  specialist: VariantCSpecialist;
  lang: Lang;
  dict: Dictionary;
}) {
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

  const name = specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback");
  const profileHref = getSpecialistUrl(lang, specialist);
  const languages = specialist.languages.filter(Boolean).slice(0, 3);
  const mainPhoto = resolvePublicMainPhotoView({
    src: specialist.avatar_url,
    storedPhotoFocus: specialist.photo_focus,
    specialistId: specialist.id,
  });
  const photoFit = resolveLiveSpecialistPhotoFit({
    focus: mainPhoto.photoFocus,
    imageAspect: mainPhoto.imageAspect,
    surface: "card",
  });

  return (
    <article className={`${publicCardClass} flex h-full flex-col overflow-hidden`}>
      <div className="relative h-[200px] w-full overflow-hidden bg-freuly-border-subtle">
        {specialist.founder_badge ? (
          <div className="absolute left-4 top-4 z-10">
            <FounderBadge />
          </div>
        ) : null}
        {specialist.avatar_url ? (
          <Image
            src={specialist.avatar_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
            className={specialistMainPhotoFitClass(photoFit)}
            style={{ objectPosition: photoFit.objectPosition }}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-freuly-border-subtle" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <p className="line-clamp-1 text-[20px] font-bold leading-6 text-freuly-text-primary">{name}</p>
          <p className="line-clamp-1 text-sm leading-[17px] text-freuly-text-secondary">{categoryLabel}</p>
        </div>

        {languages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase leading-[13px] tracking-wide text-freuly-text-muted">
              {t(dict, "home.variantC.recommended.speaks")}
            </p>
            <div className="flex flex-wrap gap-2">
              {languages.map((code, idx) => (
                <span
                  key={code}
                  className={[
                    "inline-flex h-7 items-center rounded-full px-3 text-[11px] font-medium",
                    idx === 0
                      ? "bg-[#eaf6f5] text-freuly-primary"
                      : "bg-[#f8f7f5] text-freuly-text-secondary",
                  ].join(" ")}
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {specialist.about_line ? (
          <>
            <div className="h-0 w-full border-t border-freuly-border-default" aria-hidden />
            <p className="text-[13px] italic leading-[1.6] text-freuly-text-secondary line-clamp-3">
              {specialist.about_line}
            </p>
          </>
        ) : null}

        <div className="mt-auto flex min-w-0 items-center gap-1 text-[12px] leading-[15px] text-freuly-text-muted">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate">
            {specialist.city || t(dict, "home.recommended.newSpecialist")}
          </span>
        </div>
        <div className="flex w-full justify-end">
          <Link
            href={profileHref}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold leading-4 text-freuly-primary hover:text-freuly-primary-hover"
          >
            {t(dict, "search.results.viewProfile")}
            <ChevronRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
