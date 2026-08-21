import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getSpecialistUrl } from "@/lib/urls";
import FounderBadge from "@/components/specialist/FounderBadge";
import { publicCardClass } from "@/components/public/publicStyles";

export type VariantCSpecialist = {
  id: string;
  slug: string | null;
  name: string | null;
  avatar_url: string | null;
  homepage_card_image_url?: string | null;
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
  const languageList = specialist.languages.filter(Boolean);
  const languages = languageList.slice(0, 3);
  const extraLanguageCount = Math.max(0, languageList.length - languages.length);
  const imageSrc =
    typeof specialist.avatar_url === "string" && specialist.avatar_url.trim()
      ? specialist.avatar_url.trim()
      : null;

  return (
    <Link
      href={profileHref}
      aria-label={name}
      className={`${publicCardClass} flex flex-col overflow-hidden outline-none transition-colors freuly-focus-ring hover:border-freuly-primary/30`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-freuly-border-subtle">
        {specialist.founder_badge ? (
          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <FounderBadge />
          </div>
        ) : null}
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
            className="object-cover object-[50%_20%]"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-freuly-border-subtle" aria-hidden />
        )}
      </div>

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex flex-col gap-1">
          <p className="truncate text-[20px] font-bold leading-6 text-freuly-text-primary">{name}</p>
          <p className="truncate text-sm leading-[17px] text-freuly-text-secondary">{categoryLabel}</p>
        </div>
        <div className="flex h-7 min-h-7 flex-nowrap items-center gap-2 overflow-hidden">
          {languages.map((code, idx) => (
            <span
              key={code}
              className={[
                "inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[11px] font-medium",
                idx === 0
                  ? "bg-[#eaf6f5] text-freuly-primary"
                  : "bg-[#f8f7f5] text-freuly-text-secondary",
              ].join(" ")}
            >
              {code}
            </span>
          ))}
          {extraLanguageCount > 0 ? (
            <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-[#f8f7f5] px-2 text-[11px] font-medium text-freuly-text-secondary">
              +{extraLanguageCount}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
