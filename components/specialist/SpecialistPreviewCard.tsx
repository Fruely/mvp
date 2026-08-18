"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import { getSpecialistUrl } from "@/lib/urls";
import FounderBadge from "@/components/specialist/FounderBadge";
import { getPublicSpecialistLocation } from "@/lib/specialists/geography";
import { resolvePublicServicePriceView } from "@/lib/specialistServices/pricing";

type SpecialistPreview = {
  id: string;
  slug?: string | null;
  name: string | null;
  avatar_url: string | null;
  specialization_line?: string | null;
  about_line?: string | null;
  city: string | null;
  postal_code?: string | null;
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
  price_comment?: string | null;
  pricing_exception?: "THIRD_PARTY_FUNDED" | "AFTER_ASSESSMENT" | null;
  mobile_service?: boolean;
  service_radius_km?: number | null;
  founder_badge?: boolean;
};

function workFormatLabel(workFormat: SpecialistPreview["work_format"], dict: Dictionary): string {
  if (workFormat === "offline") return t(dict, "dashboard.workFormat.offline");
  if (workFormat === "hybrid") return t(dict, "dashboard.workFormat.hybrid");
  return t(dict, "specialist.workFormat.online");
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
  const specializationText =
    specialist.specialization_line
    || specialist.about_line
    || null;
  const minPrice = specialist.min_price_from;
  const minPriceTo = specialist.min_price_to;
  const pricingType = specialist.min_pricing_type;
  const currency = specialist.min_currency?.trim() || "EUR";
  const serviceCount = specialist.active_services_count ?? 0;
  const priceCommentTrimmed =
    specialist.price_comment != null && String(specialist.price_comment).trim()
      ? String(specialist.price_comment).trim()
      : null;

  const priceText = (() => {
    const view = resolvePublicServicePriceView(
      {
        price_from: minPrice,
        price_to: minPriceTo,
        pricing_type: pricingType,
        price_comment: priceCommentTrimmed,
        pricing_exception: specialist.pricing_exception,
      },
      {
        thirdPartyFunded: t(dict, "services.pricing.public.thirdPartyFunded"),
        afterAssessment: t(dict, "services.pricing.public.afterAssessment"),
      },
    );
    if (view.kind === "exception") {
      return view.main;
    }
    if (view.kind === "numeric") {
      if (serviceCount > 1) {
        return `${fromLabel(lang)} ${minPrice}${currency === "EUR" ? "€" : ` ${currency}`}`;
      }
      if (pricingType === "hourly") {
        return `${minPrice}${currency === "EUR" ? "€" : ` ${currency}`}/час`;
      }
      return view.main.replace(" €", currency === "EUR" ? "€" : ` ${currency}`);
    }
    if (view.kind === "note") return view.main;
    return null;
  })();

  const location = getPublicSpecialistLocation({
    workFormat: specialist.work_format,
    city: specialist.city,
    postalCode: specialist.postal_code,
    onlineLabel: t(dict, "specialist.workFormat.online"),
  });

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-freuly-border-default bg-freuly-surface">
      <div className="relative h-[200px] overflow-hidden bg-freuly-page">
        {specialist.avatar_url ? (
          <Image
            src={specialist.avatar_url}
            alt={specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
            fill
            sizes="(min-width: 1024px) 304px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-freuly-primary-light">
            <span className="text-4xl" aria-hidden>
              👤
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight text-freuly-text-primary">
              {specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
            </h3>
            {specialist.founder_badge === true ? <FounderBadge /> : null}
          </div>
          {categoryLabel ? (
            <p className="mt-1 text-[13px] font-medium text-freuly-text-secondary">{categoryLabel}</p>
          ) : null}
          {specialist.is_verified || isNewActive ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specialist.is_verified ? (
                <span className="rounded bg-freuly-primary-light px-2 py-0.5 text-[11px] font-semibold text-freuly-primary">
                  {t(dict, "specialist.verified")}
                </span>
              ) : null}
              {isNewActive ? (
                <span className="rounded bg-freuly-page px-2 py-0.5 text-[11px] font-semibold text-freuly-text-secondary">
                  {t(dict, "specialist.new")}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {specializationText ? (
          <p className="line-clamp-3 text-sm leading-[1.5] text-freuly-text-secondary">
            {specializationText}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {location.label ? (
            <span className="rounded bg-freuly-page px-2 py-0.5 text-[12px] font-medium text-freuly-text-secondary">
              {location.kind === "online" ? workFormatLabel(specialist.work_format, dict) : location.label}
            </span>
          ) : (
            <span className="rounded bg-freuly-page px-2 py-0.5 text-[12px] font-medium text-freuly-text-secondary">
              {workFormatLabel(specialist.work_format, dict)}
            </span>
          )}
          {priceText ? (
            <span className="text-[13px] text-freuly-text-secondary">{priceText}</span>
          ) : null}
          {chips.map((language) => (
            <span
              key={`${specialist.id}-${language}`}
              className="rounded bg-freuly-primary-light px-1.5 py-0.5 text-[11px] font-semibold uppercase text-freuly-primary"
            >
              {language}
            </span>
          ))}
          {extraLangCount > 0 ? (
            <span className="rounded bg-freuly-primary-light px-1.5 py-0.5 text-[11px] font-semibold text-freuly-primary">
              +{extraLangCount}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Link
            href={leadHref}
            className="inline-flex min-h-9 w-full items-center justify-center rounded-freuly-md bg-freuly-primary px-4 py-2.5 text-sm font-semibold text-freuly-text-on-primary transition-colors freuly-focus-ring hover:bg-freuly-primary-hover"
          >
            {t(dict, "lead.submit")}
          </Link>
          <Link
            href={detailsHref}
            className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
          >
            {t(dict, "search.results.viewProfile")} →
          </Link>
        </div>
      </div>
    </article>
  );
}
