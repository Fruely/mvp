"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import { getSpecialistUrl } from "@/lib/urls";

type SpecialistPreview = {
  id: string;
  slug?: string | null;
  name: string | null;
  avatar_url: string | null;
  specialization_line?: string | null;
  about_line?: string | null;
  city: string | null;
  work_format: "online" | "offline" | "hybrid";
  languages?: string[];
  is_verified: boolean;
  rating?: number | null;
  reviews_count?: number | null;
  years_of_experience?: number | null;
  is_new: boolean;
  new_until?: string | null;
  min_price_from?: number | null;
  min_price_to?: number | null;
  min_pricing_type?: "fixed" | "range" | "hourly" | null;
  min_currency?: string | null;
  active_services_count?: number | null;
};

function workFormatLabel(workFormat: SpecialistPreview["work_format"]): string {
  if (workFormat === "offline") return "Офлайн";
  if (workFormat === "hybrid") return "Гібрид";
  return "Онлайн";
}

function fromLabel(lang: string): string {
  if (lang === "ru") return "от";
  if (lang === "de") return "ab";
  return "від";
}

export default function SpecialistPreviewCard({
  specialist,
  lang,
  dict,
  categoryLabel,
}: {
  specialist: SpecialistPreview;
  lang: string;
  dict: Dictionary;
  categoryLabel?: string | null;
}) {
  const [saved, setSaved] = useState(false);
  const languageList = Array.isArray(specialist.languages) ? specialist.languages : [];
  const chips = languageList.slice(0, 3);
  const extraLangCount = Math.max(languageList.length - chips.length, 0);
  const detailsHref = getSpecialistUrl(lang, specialist);
  const leadHref = `${getSpecialistUrl(lang, specialist)}?open=form`;
  const isNewActive = useMemo(() => {
    if (!specialist.is_new || !specialist.new_until) return false;
    const untilTs = Date.parse(specialist.new_until);
    return Number.isFinite(untilTs) && Date.now() < untilTs;
  }, [specialist.is_new, specialist.new_until]);
  const socialProofVisible =
    specialist.rating != null
    && specialist.reviews_count != null
    && specialist.reviews_count >= 3;
  const starsFilled = specialist.rating == null ? 0 : Math.max(0, Math.min(5, Math.round(specialist.rating)));
  const starsText = "★".repeat(starsFilled) + "☆".repeat(5 - starsFilled);
  const experienceText =
    specialist.years_of_experience != null && specialist.years_of_experience > 0
      ? `${specialist.years_of_experience} ${t(dict, "specialist.yearsExperience")}`
      : null;
  const specializationText =
    specialist.specialization_line
    || specialist.about_line
    || experienceText
    || null;
  const minPrice = specialist.min_price_from;
  const minPriceTo = specialist.min_price_to;
  const pricingType = specialist.min_pricing_type;
  const currency = specialist.min_currency?.trim() || "EUR";
  const serviceCount = specialist.active_services_count ?? 0;
  const priceText =
    typeof minPrice === "number" && Number.isFinite(minPrice)
      ? serviceCount > 1
        ? `${fromLabel(lang)} ${minPrice}${currency === "EUR" ? "€" : ` ${currency}`}`
        : pricingType === "range" && typeof minPriceTo === "number" && Number.isFinite(minPriceTo)
          ? `${minPrice}–${minPriceTo}${currency === "EUR" ? "€" : ` ${currency}`}`
          : pricingType === "hourly"
            ? `${minPrice}${currency === "EUR" ? "€" : ` ${currency}`}/час`
            : `${minPrice}${currency === "EUR" ? "€" : ` ${currency}`}`
      : null;

  return (
    <article className="group overflow-hidden rounded-md border border-black/5 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden">
        {specialist.avatar_url ? (
          <Image
            src={specialist.avatar_url}
            alt={specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
            <span className="text-4xl" aria-hidden>
              👤
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setSaved((value) => !value)}
          className="group absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-textSecondary shadow-card ring-1 ring-black/10 transition hover:bg-white"
          aria-label={saved ? "Unsave specialist" : "Save specialist"}
          title={saved ? t(dict, "specialist.unsaveTooltip") : t(dict, "specialist.saveTooltip")}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 ${saved ? "fill-rose-500 text-rose-500" : "fill-transparent text-textSecondary"}`}
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 21s-6.5-3.9-9.2-8a5.7 5.7 0 0 1 .7-7.1A5.6 5.6 0 0 1 12 6a5.6 5.6 0 0 1 8.5-.1 5.7 5.7 0 0 1 .7 7.1C18.5 17.1 12 21 12 21Z" />
          </svg>
          <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
            {saved ? t(dict, "specialist.unsave") : t(dict, "specialist.save")}
          </span>
        </button>

        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {specialist.is_verified ? (
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
              {t(dict, "specialist.verified")}
            </span>
          ) : null}
          {isNewActive ? (
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
              {t(dict, "specialist.new")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-textPrimary">{specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}</h3>
            {socialProofVisible ? (
              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold text-amber-600">{starsText}</div>
                <div className="text-[11px] font-medium text-textSecondary">
                  {specialist.rating?.toFixed(1)} ({specialist.reviews_count})
                </div>
              </div>
            ) : null}
          </div>
          {categoryLabel ? (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 line-clamp-1">
              {categoryLabel}
            </p>
          ) : null}
          {specializationText ? (
            <p className="mt-1 line-clamp-1 text-sm font-normal text-textSecondary">{specializationText}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-normal text-textSecondary">
          {specialist.city ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>📍</span>
              {specialist.city}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <span aria-hidden>{specialist.work_format === "online" ? "💻" : "🏢"}</span>
            {workFormatLabel(specialist.work_format)}
          </span>
          {experienceText ? (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>🧭</span>
              {experienceText}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((language) => (
            <span
              key={`${specialist.id}-${language}`}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {language}
            </span>
          ))}
          {extraLangCount > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              +{extraLangCount}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {priceText ? (
            <div className="rounded-lg bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
              {priceText}
            </div>
          ) : (
            <span />
          )}
          <Link
            href={leadHref}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition hover:from-blue-700 hover:to-indigo-700 hover:shadow-floating"
          >
            <span aria-hidden>⚡</span>
            {t(dict, "lead.submit")}
          </Link>
          <Link
            href={detailsHref}
            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            {t(dict, "common.more")} →
          </Link>
        </div>
      </div>
    </article>
  );
}
