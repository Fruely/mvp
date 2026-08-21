"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, FileText } from "lucide-react";
import LeadForm from "@/components/LeadForm";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import SpecialistDocumentsLightbox from "@/components/specialist/SpecialistDocumentsLightbox";
import ProPageBadge from "@/components/specialist/pro/ProPageBadge";
import ProPageShare from "@/components/specialist/pro/ProPageShare";
import ProPrimaryButton from "@/components/specialist/pro/ProPrimaryButton";
import ProSectionLabel from "@/components/specialist/pro/ProSectionLabel";
import {
  formatProLanguages,
  PRO_PAGE_MAX,
  PRO_PAGE_PAD_X,
  PRO_TEXT_SECONDARY,
  splitStoryForQuote,
} from "@/components/specialist/pro/proPageStyles";
import type { Specialist } from "@/components/specialist/SpecialistProfileClient";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getSpecialistPageTranslations, getWorkFormat } from "@/lib/i18n/getTranslations";
import { getPublicSpecialistLocation } from "@/lib/specialists/geography";
import { resolvePublicServicePriceView } from "@/lib/specialistServices/pricing";
import { resolveProPageDisplayName } from "@/lib/specialists/proPage/entitlement";
import type { PublicProPageContent } from "@/lib/specialists/proPage/types";
import { getSpecialistUrl } from "@/lib/urls";
import uaDict from "@/locales/ua.json";

const PRO_CTA_LABEL = "Рассказать о своём запросе";
const ISSUES_INTRO =
  "Мы фокусируемся на конкретных запросах, чтобы вы почувствовали результат и вернули контроль над своей жизнью.";
const PROCESS_INTRO =
  "Понятный, бережный и структурированный процесс взаимодействия без лишней теории.";
const PRICING_INTRO =
  "Выберите подходящий формат взаимодействия. Все сессии проходят в бережной, конфиденциальной атмосфере.";
const FINAL_CTA_BODY =
  "Иногда достаточно просто понять, что вы больше не хотите оставлять всё как есть. Расскажите коротко, что сейчас происходит, и мы подберем бережный путь решения.";

type SpecialistProPageClientProps = {
  lang: Lang;
  id: string;
  proContent: PublicProPageContent;
  initialSpecialist?: Specialist | null;
};

type FormatColumn = {
  label: string;
  value: string;
};

function getServicePriceDisplay(
  service: NonNullable<Specialist["specialist_services"]>[number],
  dict: Dictionary,
  priceOnRequestLabel: string,
): string {
  const view = resolvePublicServicePriceView(service, {
    thirdPartyFunded: t(dict, "services.pricing.public.thirdPartyFunded"),
    afterAssessment: t(dict, "services.pricing.public.afterAssessment"),
  });
  if (view.kind === "empty") return priceOnRequestLabel;
  return view.main;
}

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

function buildFormatColumns(input: {
  workMode: "online" | "offline" | "hybrid" | null;
  workModeLabel: string | null;
  city: string | null | undefined;
  languagesLabel: string;
  languagesCount: number;
}): FormatColumn[] {
  const columns: FormatColumn[] = [];

  if (input.workMode === "online") {
    columns.push({ label: "Формат", value: input.workModeLabel ?? "Онлайн" });
  } else if (input.city && input.workModeLabel) {
    columns.push({ label: "Локация", value: `${input.city} | ${input.workModeLabel}` });
  } else if (input.city) {
    columns.push({ label: "Локация", value: input.city });
  } else if (input.workModeLabel) {
    columns.push({ label: "Формат", value: input.workModeLabel });
  }

  if (input.languagesCount > 0) {
    columns.push({ label: "Языки", value: input.languagesLabel });
  }

  return columns;
}

export default function SpecialistProPageClient({
  lang,
  id,
  proContent,
  initialSpecialist = null,
}: SpecialistProPageClientProps) {
  const [specialist, setSpecialist] = useState<Specialist | null>(initialSpecialist);
  const [specialistFetchSettled, setSpecialistFetchSettled] = useState(Boolean(initialSpecialist));
  const [showForm, setShowForm] = useState(true);
  const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
  const [formInView, setFormInView] = useState(false);
  const [documentLightboxIndex, setDocumentLightboxIndex] = useState<number | null>(null);
  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);
  const profileViewReportedForIdRef = useRef<string | null>(null);
  const langPrefix = `/${lang}`;
  const sectionText = getSpecialistPageTranslations(lang);

  useEffect(() => {
    let cancelled = false;
    getDictionary(lang)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(uaDict as unknown as Dictionary);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const fetchSpecialist = async () => {
      try {
        const response = await fetch(
          `/api/specialists/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`,
          { cache: "no-store" },
        );
        const result = await response.json();
        if (response.ok && result.data) {
          setSpecialist(result.data);
        }
      } finally {
        setSpecialistFetchSettled(true);
      }
    };
    void fetchSpecialist();
  }, [id, lang]);

  useEffect(() => {
    if (!specialist?.id) return;
    const el = document.getElementById("lead-form");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFormInView(entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [specialist?.id, showForm, leadSuccessMessage]);

  useEffect(() => {
    if (!specialist?.id) return;
    if (profileViewReportedForIdRef.current === specialist.id) return;
    profileViewReportedForIdRef.current = specialist.id;
    void fetch(`/api/specialists/${specialist.id}/view`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }, [specialist?.id]);

  const scrollToLeadForm = () => {
    setLeadSuccessMessage(null);
    setShowForm(true);
    const el = document.getElementById("lead-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shareMeta = useMemo(() => {
    const path = getSpecialistUrl(
      lang,
      specialist ?? { id, slug: typeof id === "string" ? id : undefined },
    );
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : `https://freuly.de${path}`;
    const name = resolveProPageDisplayName(specialist?.name, proContent.displayName) || "Freuly";
    return {
      url,
      title: `${name} | Freuly`,
      text: proContent.positioning ?? t(dict, "specialistPage.shareText"),
    };
  }, [specialist, lang, id, proContent.displayName, proContent.positioning, dict]);

  if (specialistFetchSettled && !specialist?.id) {
    return (
      <div className="w-full bg-freuly-page px-4 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-bold text-freuly-text-primary">{t(dict, "specialist.notFound")}</h1>
          <Link href={langPrefix} className="mt-4 inline-block text-freuly-primary underline">
            {t(dict, "common.toHome")}
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    resolveProPageDisplayName(specialist?.name, proContent.displayName) ||
    t(dict, "specialist.fallback");
  const categoryTitle = specialist
    ? getCategoryTitle(
        {
          title: specialist.category ?? null,
          title_ru: specialist.category_title_ru ?? null,
          title_de: specialist.category_title_de ?? null,
          title_ua: specialist.category_title_ua ?? null,
        },
        toCategoryTitleLang(lang),
      ) || null
    : null;
  const professionLabel = proContent.professionLabel || categoryTitle;
  const workMode = specialist
    ? getWorkFormat(specialist.format) ??
      getWorkFormat(specialist.work_format) ??
      (specialist.is_online ? "online" : null)
    : null;
  const workModeLabel = workMode ? sectionText.work_format[workMode] : null;
  const publicLocation = getPublicSpecialistLocation({
    workFormat: workMode,
    city: specialist?.city ?? null,
    onlineLabel: t(dict, "specialist.workFormat.online"),
  });
  const languages = Array.isArray(specialist?.languages) ? specialist.languages : [];
  const languagesLabel = formatProLanguages(languages, lang);
  const certificateUrls = Array.isArray(specialist?.certificate_urls)
    ? specialist.certificate_urls.filter((url) => typeof url === "string" && url.trim())
    : [];
  const galleryUrls = Array.isArray(specialist?.gallery_urls)
    ? specialist.gallery_urls.filter((url) => typeof url === "string" && url.trim())
    : [];
  const whyMeImageUrl = galleryUrls[0] ?? null;
  const finalCtaImageUrl = galleryUrls[1] ?? null;
  const services = Array.isArray(specialist?.specialist_services) ? specialist.specialist_services : [];
  const specialistId = specialist?.id ?? null;
  const priceOnRequestLabel = t(dict, "services.pricing.public.onRequest");
  const heroLocationLabel = publicLocation.label || workModeLabel;
  const storyParts = proContent.story ? splitStoryForQuote(proContent.story) : null;
  const issueRows = chunkRows(proContent.clientRequests, 3);
  const formatColumns = buildFormatColumns({
    workMode,
    workModeLabel,
    city: specialist?.city,
    languagesLabel,
    languagesCount: languages.length,
  });

  return (
    <div className="w-full bg-freuly-page pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-freuly-text-primary md:pb-0">
      <section className="border-b border-[#E3DDD5]">
        <div
          className={`${PRO_PAGE_MAX} flex flex-col gap-6 px-5 pb-10 pt-8 md:flex-row md:items-center md:gap-20 md:px-20 md:py-[100px]`}
        >
          <div className="order-1 md:order-2 md:h-[600px] md:w-[520px] md:shrink-0">
            <div className="flex h-[360px] flex-col items-center justify-end overflow-hidden rounded-[20px] border border-[#E3DDD5] bg-[#F4EFEA] px-3 pt-3 md:h-[600px] md:rounded-[24px] md:px-5 md:pt-5">
              <div className="relative h-[348px] w-full max-w-[326px] shrink-0 overflow-hidden rounded-tl-xl rounded-tr-xl md:h-[580px] md:max-w-[480px]">
                {specialist?.avatar_url ? (
                  <Image
                    src={specialist.avatar_url}
                    alt={displayName}
                    fill
                    priority
                    className="object-cover object-center"
                    sizes="(max-width: 768px) 100vw, 520px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-5xl text-freuly-primary">
                    👤
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-2 flex min-w-0 flex-1 flex-col gap-5 md:order-1 md:gap-8">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#5C5651] md:gap-3 md:text-sm">
                <ProPageBadge />
                {heroLocationLabel ? (
                  <>
                    <span aria-hidden>•</span>
                    <span>{heroLocationLabel}</span>
                  </>
                ) : null}
              </div>
              <h1 className="text-[36px] font-bold leading-[1.15] tracking-tight text-[#242220] md:text-[64px] md:leading-[1.1]">
                {displayName}
              </h1>
              {professionLabel ? (
                <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-[#4A5840] md:text-lg">
                  {professionLabel}
                </p>
              ) : null}
            </div>

            {proContent.positioning ? (
              <p className="text-[15px] leading-[1.5] text-[#5C5651] md:text-lg md:leading-[1.6]">
                {proContent.positioning}
              </p>
            ) : null}

            {(languages.length > 0 || heroLocationLabel) && (
              <div className="flex flex-col gap-2 md:gap-3">
                <div className="h-px w-full bg-[#E3DDD5]" />
                <div className="flex items-start justify-between gap-4">
                  {languages.length > 0 ? (
                    <div>
                      <p className="text-xs text-[#5C5651]">Языки сессий</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#242220] md:text-[15px]">
                        {languagesLabel}
                      </p>
                    </div>
                  ) : null}
                  {heroLocationLabel ? (
                    <div className={languages.length > 0 ? "text-right md:text-left" : ""}>
                      <p className="text-xs text-[#5C5651]">Локация</p>
                      <p className="mt-1 text-[13px] font-semibold text-[#242220] md:text-[15px]">
                        {heroLocationLabel}
                      </p>
                    </div>
                  ) : null}
                </div>
                <div className="h-px w-full bg-[#E3DDD5]" />
              </div>
            )}

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <ProPrimaryButton onClick={scrollToLeadForm} fullWidthMobile>
                {PRO_CTA_LABEL}
              </ProPrimaryButton>
              <ProPageShare
                url={shareMeta.url}
                title={shareMeta.title}
                text={shareMeta.text}
                label="Поделиться в соцсетях"
                copiedLabel={t(dict, "specialistPage.copyLink")}
              />
            </div>
          </div>
        </div>
      </section>

      {proContent.clientRequests.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-[#F4EFEA] md:bg-freuly-page">
          <div className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} py-12 md:py-[100px]`}>
            <div className="flex flex-col gap-3 md:gap-4">
              <ProSectionLabel tone="accent">Области работы</ProSectionLabel>
              <h2 className="text-[28px] font-bold leading-[1.2] text-[#242220] md:text-[40px]">
                С чем можно обратиться
              </h2>
              <p className={`text-sm leading-[1.5] md:text-base md:leading-[1.6] ${PRO_TEXT_SECONDARY}`}>
                {ISSUES_INTRO}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 md:mt-12 md:gap-6">
              {issueRows.map((row, rowIndex) => (
                <div key={`issues-row-${rowIndex}`} className="flex flex-col gap-3 md:flex-row md:gap-6">
                  {row.map((item) => (
                    <article
                      key={item.title}
                      className="flex min-h-0 flex-1 flex-col gap-2.5 rounded-xl border border-[#E3DDD5] bg-[#FAF7F2] p-5 md:h-[220px] md:gap-4 md:p-8"
                    >
                      <h3 className="text-base font-semibold leading-snug text-[#242220] md:text-xl">
                        {item.title}
                      </h3>
                      {item.description ? (
                        <p className="text-[13px] leading-[1.4] text-[#5C5651] md:text-sm md:leading-[1.5]">
                          {item.description}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {proContent.workProcess.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} py-12 md:py-[100px]`}>
            <div className="flex flex-col gap-3 md:gap-4">
              <ProSectionLabel tone="accent">Методология</ProSectionLabel>
              <h2 className="text-[28px] font-bold leading-[1.2] text-[#242220] md:text-[40px]">
                Как проходит работа
              </h2>
              <p className={`text-sm leading-[1.5] md:text-base md:leading-[1.6] ${PRO_TEXT_SECONDARY}`}>
                {PROCESS_INTRO}
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 md:mt-14 md:flex-row md:gap-6">
              {proContent.workProcess.map((item, index) => (
                <article
                  key={item.title}
                  className="flex flex-1 flex-col gap-4 rounded-2xl border border-[#E3DDD5] bg-[#FAF7F2] p-5 md:gap-5 md:p-8"
                >
                  <p className="text-[40px] font-bold leading-none text-freuly-primary md:text-[48px]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold leading-snug text-[#242220] md:text-lg">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="text-[13px] leading-[1.4] text-[#5C5651] md:text-sm md:leading-[1.5]">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {proContent.whyMe.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div
            className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} flex flex-col gap-8 py-12 md:flex-row md:items-start md:gap-20 md:py-[100px]`}
          >
            <div
              className={`flex w-full flex-col gap-6 md:shrink-0 md:gap-6 ${
                whyMeImageUrl ? "md:w-[480px]" : "md:w-[480px]"
              }`}
            >
              <div className="flex flex-col gap-3 md:gap-4">
                <ProSectionLabel tone="accent">Уникальность</ProSectionLabel>
                <h2 className="text-[28px] font-bold leading-[1.2] text-[#242220] md:text-[40px]">
                  Почему мне доверяют
                </h2>
              </div>
              {whyMeImageUrl ? (
                <div className="relative hidden h-[260px] w-full shrink-0 overflow-hidden rounded-2xl border border-[#E3DDD5] bg-[#FAF7F2] md:block md:w-[480px]">
                  <Image
                    src={whyMeImageUrl}
                    alt=""
                    fill
                    className="object-contain object-center"
                    sizes="480px"
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-1 flex-col gap-3 md:gap-6">
              {proContent.whyMe.map((item) => (
                <article
                  key={item.title}
                  className="flex flex-col gap-2 rounded-xl border border-[#E3DDD5] bg-[#FAF7F2] p-5 md:gap-2 md:p-7"
                >
                  <h3 className="text-base font-semibold text-[#242220] md:text-xl">{item.title}</h3>
                  <p className="text-[13px] leading-[1.4] text-[#5C5651] md:text-sm md:leading-[1.5]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            {whyMeImageUrl ? (
              <div className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-2xl border border-[#E3DDD5] bg-[#FAF7F2] md:hidden">
                <Image
                  src={whyMeImageUrl}
                  alt=""
                  fill
                  className="object-contain object-center"
                  sizes="100vw"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {proContent.story && storyParts ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div
            className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} flex flex-col gap-8 py-12 md:flex-row md:gap-20 md:py-[120px]`}
          >
            <div className="flex flex-1 flex-col gap-6">
              <p
                className="text-[64px] font-extrabold leading-[0.3] text-[#4A5840] opacity-15 md:text-[96px]"
                aria-hidden
              >
                “
              </p>
              <blockquote className="text-xl font-semibold leading-[1.4] text-[#242220] md:text-[32px]">
                {storyParts.quote}
              </blockquote>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-[#5C5651]" aria-hidden />
                <cite className="text-sm font-semibold not-italic text-[#5C5651]">{displayName}</cite>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-6 text-sm leading-[1.8] text-[#5C5651] md:text-base">
              {storyParts.remainder ? (
                storyParts.remainder.split(/\n\n+/).map((paragraph, index) => (
                  <p key={`story-p-${index}`}>{paragraph.trim()}</p>
                ))
              ) : (
                <p>{proContent.story}</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {services.length > 0 ? (
        <section id="services" className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} py-12 md:py-[100px]`}>
            <div className="flex flex-col gap-3 md:gap-4">
              <ProSectionLabel tone="accent">Тарифы</ProSectionLabel>
              <h2 className="text-[28px] font-bold leading-[1.2] text-[#242220] md:text-[40px]">
                {sectionText.servicesAndPricesTitle}
              </h2>
              <p className={`text-sm leading-[1.5] md:text-base md:leading-[1.6] ${PRO_TEXT_SECONDARY}`}>
                {PRICING_INTRO}
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-4 md:mt-12 md:flex-row md:gap-6">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="flex w-full flex-col gap-5 rounded-[20px] border border-[#E3DDD5] bg-[#FAF7F2] p-6 md:max-w-[calc((100%-48px)/3)] md:flex-1 md:gap-8 md:rounded-3xl md:p-10"
                >
                  <div className="flex flex-col gap-1.5 md:gap-3">
                    <h3 className="text-lg font-bold text-[#242220] md:text-2xl">{service.title}</h3>
                    {service.price_comment ? (
                      <p className="text-[13px] font-semibold text-freuly-primary md:text-sm">
                        {service.price_comment}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex flex-col gap-4 md:gap-5">
                    <div className="h-px w-full bg-[#E3DDD5]" />
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-2xl font-bold text-[#242220] md:text-[32px]">
                        {getServicePriceDisplay(service, dict, priceOnRequestLabel)}
                      </p>
                      <ProPrimaryButton
                        onClick={scrollToLeadForm}
                        className="px-5 py-2.5 text-[13px] md:px-7 md:text-sm"
                      >
                        {PRO_CTA_LABEL}
                      </ProPrimaryButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {certificateUrls.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className={`${PRO_PAGE_MAX} ${PRO_PAGE_PAD_X} py-12 md:py-[100px]`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-3 md:gap-4">
                <ProSectionLabel tone="accent">Квалификация</ProSectionLabel>
                <h2 className="text-[28px] font-bold leading-[1.2] text-[#242220] md:text-[40px]">
                  {sectionText.certificatesTitle}
                </h2>
              </div>
              {specialist?.founder_badge ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#E3DDD5] bg-freuly-primary-light px-3 py-2 md:border-freuly-primary md:px-4 md:py-2">
                  <BadgeCheck className="size-3.5 shrink-0 text-freuly-primary md:size-4" aria-hidden />
                  <span className="text-xs font-semibold text-[#242220] md:text-[13px] md:text-freuly-primary">
                    Freuly Verified Specialist
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col gap-3 md:mt-12 md:flex-row md:gap-6">
              {certificateUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setDocumentLightboxIndex(index)}
                  className="flex flex-1 items-center gap-4 rounded-xl border border-[#E3DDD5] bg-[#FAF7F2] p-5 text-left freuly-focus-ring md:gap-5 md:rounded-2xl md:p-8"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-3xl bg-freuly-primary-light md:size-12">
                    <FileText className="size-4 text-freuly-primary md:size-5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5 md:gap-1">
                    <span className="text-[15px] font-semibold text-[#242220] md:text-lg">
                      {sectionText.certificatesTitle} {index + 1}
                    </span>
                    <span className="text-xs text-[#5C5651] md:text-sm">Открыть скан</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {formatColumns.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-[#F4EFEA] md:bg-freuly-page">
          <div className={`${PRO_PAGE_MAX} p-10 md:p-20`}>
            <ProSectionLabel tone="accent" className="mb-6 md:mb-8">
              Условия и формат
            </ProSectionLabel>
            <div className="flex flex-col gap-4 font-semibold md:flex-row md:gap-10">
              {formatColumns.map((column) => (
                <div key={column.label} className="flex flex-1 flex-col gap-1 md:gap-2">
                  <p className="text-[11px] uppercase text-[#5C5651] md:text-xs">{column.label}</p>
                  <p className="text-[15px] text-[#242220] md:text-lg">{column.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-[#1E241E] md:bg-freuly-primary">
        <div
          className={`${PRO_PAGE_MAX} flex flex-col gap-7 px-5 py-12 md:flex-row md:items-center md:gap-20 md:px-20 md:py-[120px] ${
            finalCtaImageUrl ? "" : "md:justify-start"
          }`}
        >
          <div className="flex flex-1 flex-col gap-5 md:max-w-2xl md:gap-8">
            <div className="flex flex-col gap-3 md:gap-4">
              <ProSectionLabel tone="onPrimary">Сделать шаг</ProSectionLabel>
              <h2 className="text-[28px] font-bold leading-[1.2] text-white md:text-[40px]">
                Не обязательно точно знать, с чего начать
              </h2>
            </div>
            <p className="text-sm leading-[1.5] text-[#F4EFEA] md:text-base md:leading-[1.6] md:text-white">
              {FINAL_CTA_BODY}
            </p>
            <ProPrimaryButton onClick={scrollToLeadForm} fullWidthMobile>
              {PRO_CTA_LABEL}
            </ProPrimaryButton>
          </div>
          {finalCtaImageUrl ? (
            <div className="relative h-[220px] w-full shrink-0 overflow-hidden rounded-2xl md:h-[320px] md:w-[480px] md:rounded-3xl md:border md:border-freuly-primary">
              <Image
                src={finalCtaImageUrl}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 100vw, 480px"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="bg-freuly-page">
        <div className={`${PRO_PAGE_MAX} px-5 py-12 md:px-8 md:py-20`}>
          <div
            id="lead-form"
            className="scroll-mt-24 rounded-3xl border border-[#E3DDD5] bg-[#FAF7F2] p-6 md:mx-auto md:max-w-[720px] md:p-8"
          >
            <h2 className="text-2xl font-bold md:text-3xl">{sectionText.leadFormTitle}</h2>
            {leadSuccessMessage && !showForm ? (
              <p className="mt-4 rounded-freuly-md border border-freuly-success-border bg-freuly-success-light px-3 py-2 text-sm font-medium text-freuly-success">
                {leadSuccessMessage}
              </p>
            ) : specialistId ? (
              <div className="mt-6">
                <LeadForm
                  specialistId={specialistId}
                  onSuccess={(message) => {
                    setShowForm(false);
                    setLeadSuccessMessage(message);
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <SpecialistDocumentsLightbox
        urls={certificateUrls}
        activeIndex={documentLightboxIndex}
        onClose={() => setDocumentLightboxIndex(null)}
        onGoPrev={() =>
          setDocumentLightboxIndex((prev) =>
            prev === null ? null : (prev - 1 + certificateUrls.length) % certificateUrls.length,
          )
        }
        onGoNext={() =>
          setDocumentLightboxIndex((prev) =>
            prev === null ? null : (prev + 1) % certificateUrls.length,
          )
        }
        ariaLabel={sectionText.certificatesTitle}
      />

      <MobileStickyCTA
        label={PRO_CTA_LABEL}
        onClick={scrollToLeadForm}
        isHidden={formInView || !showForm}
      />
    </div>
  );
}
