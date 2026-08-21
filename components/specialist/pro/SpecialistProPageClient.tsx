"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import LeadForm from "@/components/LeadForm";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import SpecialistDocumentsLightbox from "@/components/specialist/SpecialistDocumentsLightbox";
import ProPageBadge from "@/components/specialist/pro/ProPageBadge";
import ProPageShare from "@/components/specialist/pro/ProPageShare";
import Button from "@/components/ui/Button";
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

type SpecialistProPageClientProps = {
  lang: Lang;
  id: string;
  proContent: PublicProPageContent;
  initialSpecialist?: Specialist | null;
};

function formatLanguages(languages: string[]): string {
  return languages
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean)
    .join(" • ");
}

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

export default function SpecialistProPageClient({
  lang,
  id,
  proContent,
  initialSpecialist = null,
}: SpecialistProPageClientProps) {
  const [specialist, setSpecialist] = useState<Specialist | null>(initialSpecialist);
  const [loading, setLoading] = useState(!initialSpecialist);
  const [showForm, setShowForm] = useState(true);
  const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
  const [formInView, setFormInView] = useState(false);
  const [documentLightboxIndex, setDocumentLightboxIndex] = useState<number | null>(null);
  const [reviews, setReviews] = useState<
    Array<{ id: string; author_name: string; rating: number; comment: string; created_at: string }>
  >([]);
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
        if (!response.ok) return;
        setSpecialist(result.data);
      } finally {
        setLoading(false);
      }
    };
    void fetchSpecialist();
  }, [id, lang]);

  useEffect(() => {
    if (!specialist?.id) return;
    let cancelled = false;
    fetch(`/api/specialists/${specialist.id}/reviews`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !Array.isArray(json?.data)) return;
        setReviews(json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [specialist?.id]);

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
    if (!specialist) return null;
    const path = getSpecialistUrl(lang, specialist);
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : `https://freuly.de${path}`;
    const name =
      resolveProPageDisplayName(specialist.name, proContent.displayName) || "Freuly";
    return {
      url,
      title: `${name} | Freuly`,
      text: proContent.positioning ?? t(dict, "specialistPage.shareText"),
    };
  }, [specialist, lang, proContent.displayName, proContent.positioning, dict]);

  if (loading && !specialist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-freuly-page">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-freuly-primary" />
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-freuly-page px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-freuly-text-primary">{t(dict, "specialist.notFound")}</h1>
          <Link href={langPrefix} className="mt-4 inline-block text-freuly-primary underline">
            {t(dict, "common.toHome")}
          </Link>
        </div>
      </div>
    );
  }

  const displayName =
    resolveProPageDisplayName(specialist.name, proContent.displayName) ||
    t(dict, "specialist.fallback");
  const categoryTitle =
    getCategoryTitle(
      {
        title: specialist.category ?? null,
        title_ru: specialist.category_title_ru ?? null,
        title_de: specialist.category_title_de ?? null,
        title_ua: specialist.category_title_ua ?? null,
      },
      toCategoryTitleLang(lang),
    ) || null;
  const professionLabel = proContent.professionLabel || categoryTitle;
  const workMode =
    getWorkFormat(specialist.format) ??
    getWorkFormat(specialist.work_format) ??
    (specialist.is_online ? "online" : null);
  const workModeLabel = workMode ? sectionText.work_format[workMode] : null;
  const publicLocation = getPublicSpecialistLocation({
    workFormat: workMode,
    city: specialist.city,
    onlineLabel: t(dict, "specialist.workFormat.online"),
  });
  const languages = Array.isArray(specialist.languages) ? specialist.languages : [];
  const certificateUrls = Array.isArray(specialist.certificate_urls)
    ? specialist.certificate_urls.filter((url) => typeof url === "string" && url.trim())
    : [];
  const services = Array.isArray(specialist.specialist_services) ? specialist.specialist_services : [];
  const priceOnRequestLabel = t(dict, "services.pricing.public.onRequest");
  const heroLocationLabel = publicLocation.label || workModeLabel;

  return (
    <div className="min-h-screen bg-freuly-page pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-freuly-text-primary md:pb-0">
      <section className="border-b border-[#E3DDD5]">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-5 py-10 md:flex-row md:items-center md:gap-20 md:px-20 md:py-[100px]">
          <div className="order-2 flex min-w-0 flex-1 flex-col gap-8 md:order-1">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-freuly-text-secondary">
                <ProPageBadge />
                {heroLocationLabel ? (
                  <>
                    <span aria-hidden>•</span>
                    <span>{heroLocationLabel}</span>
                  </>
                ) : null}
              </div>
              <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight md:text-[64px]">
                {displayName}
              </h1>
              {professionLabel ? (
                <p className="text-base font-semibold uppercase tracking-[0.08em] text-[#4A5840] md:text-lg">
                  {professionLabel}
                </p>
              ) : null}
            </div>

            {proContent.positioning ? (
              <p className="max-w-2xl text-base leading-relaxed text-freuly-text-secondary md:text-lg md:leading-[1.6]">
                {proContent.positioning}
              </p>
            ) : null}

            {(languages.length > 0 || heroLocationLabel) && (
              <div className="flex flex-col gap-3 border-y border-[#E3DDD5] py-4 md:flex-row md:justify-between">
                {languages.length > 0 ? (
                  <div>
                    <p className="text-xs text-freuly-text-secondary">Языки сессий</p>
                    <p className="mt-1 text-[15px] font-semibold">{formatLanguages(languages)}</p>
                  </div>
                ) : null}
                {heroLocationLabel ? (
                  <div>
                    <p className="text-xs text-freuly-text-secondary">Формат</p>
                    <p className="mt-1 text-[15px] font-semibold">{heroLocationLabel}</p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                variant="primary"
                onClick={scrollToLeadForm}
                className="h-auto min-h-[46px] rounded-full px-7 py-3.5 text-sm font-semibold"
              >
                {PRO_CTA_LABEL}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
              {shareMeta ? (
                <ProPageShare
                  url={shareMeta.url}
                  title={shareMeta.title}
                  text={shareMeta.text}
                  label="Поделиться в соцсетях"
                  copiedLabel={t(dict, "specialistPage.copyLink")}
                />
              ) : null}
            </div>
          </div>

          <div className="order-1 md:order-2 md:w-[420px] md:shrink-0">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-freuly-primary-light md:aspect-square">
              {specialist.avatar_url ? (
                <Image
                  src={specialist.avatar_url}
                  alt={displayName}
                  fill
                  priority
                  className="object-cover object-[50%_20%]"
                  sizes="(max-width: 768px) 100vw, 420px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-5xl text-freuly-primary">
                  👤
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {proContent.clientRequests.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold md:text-[40px]">С чем можно обратиться</h2>
              <p className="mt-4 text-base leading-relaxed text-freuly-text-secondary md:text-lg">
                Можно начать с одной конкретной ситуации — не обязательно разбирать сразу всю жизнь.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {proContent.clientRequests.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[20px] border border-[#E3DDD5] bg-[#F3F1EE] p-6"
                >
                  <h3 className="text-lg font-semibold leading-snug">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-freuly-text-secondary md:text-[15px]">
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {proContent.workProcess.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-surface">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-freuly-primary">Методика</p>
              <h2 className="mt-3 text-3xl font-bold md:text-[40px]">Как проходит работа</h2>
              <p className="mt-4 text-base leading-relaxed text-freuly-text-secondary md:text-lg">
                Структурированный формат консультирования с фокусом на вашем запросе.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {proContent.workProcess.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[20px] border border-[#E3DDD5] bg-freuly-page p-6"
                >
                  <p className="text-[40px] font-bold leading-none text-freuly-primary/30">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-4 text-lg font-semibold leading-snug">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-freuly-text-secondary">
                      {item.description}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {proContent.whyMe.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-freuly-primary">О специалисте</p>
            <h2 className="mt-3 text-3xl font-bold md:text-[40px]">
              Почему {displayName.split(" ")[0] ?? displayName}?
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {proContent.whyMe.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[20px] border border-[#E3DDD5] bg-freuly-surface p-6"
                >
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-freuly-text-secondary md:text-[15px]">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {proContent.story ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-surface">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <div className="max-w-4xl">
              <p className="text-xl font-medium italic leading-relaxed text-freuly-text-primary md:text-2xl">
                «{proContent.story.split(".")[0]}.»
              </p>
              <p className="mt-6 text-base leading-relaxed text-freuly-text-secondary md:text-lg">
                {proContent.story}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {services.length > 0 ? (
        <section id="services" className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-freuly-primary">Цены</p>
            <h2 className="mt-3 text-3xl font-bold md:text-[40px]">{sectionText.servicesAndPricesTitle}</h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {services.map((service) => (
                <article
                  key={service.id}
                  className="flex flex-col justify-between rounded-[20px] border border-[#E3DDD5] bg-freuly-surface p-6"
                >
                  <div>
                    <h3 className="text-xl font-semibold leading-snug">{service.title}</h3>
                    {service.price_comment ? (
                      <p className="mt-3 text-sm leading-relaxed text-freuly-text-secondary">
                        {service.price_comment}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <p className="text-2xl font-bold text-freuly-primary">
                      {getServicePriceDisplay(service, dict, priceOnRequestLabel)}
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={scrollToLeadForm}
                      className="rounded-full px-5 py-2.5 text-sm"
                    >
                      {PRO_CTA_LABEL}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {certificateUrls.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-surface">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <h2 className="text-3xl font-bold md:text-[40px]">{sectionText.certificatesTitle}</h2>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {certificateUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setDocumentLightboxIndex(index)}
                  className="overflow-hidden rounded-[16px] border border-[#E3DDD5] bg-freuly-page freuly-focus-ring"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="border-b border-[#E3DDD5] bg-freuly-page">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-20">
            <h2 className="text-3xl font-bold md:text-[40px]">{sectionText.reviewsTitle}</h2>
            <div className="mt-8 space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-[20px] border border-[#E3DDD5] bg-freuly-surface p-6"
                >
                  <p className="font-semibold">{review.author_name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-freuly-text-secondary">{review.comment}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {(workModeLabel || languages.length > 0) && (
        <section className="border-b border-[#E3DDD5] bg-freuly-surface">
          <div className="mx-auto w-full max-w-[1280px] px-5 py-14 md:px-20 md:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-freuly-primary">Формат работы</p>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {workModeLabel ? (
                <div>
                  <p className="text-xs text-freuly-text-secondary">Формат</p>
                  <p className="mt-1 font-semibold">{workModeLabel}</p>
                </div>
              ) : null}
              {languages.length > 0 ? (
                <div>
                  <p className="text-xs text-freuly-text-secondary">Языки</p>
                  <p className="mt-1 font-semibold">{formatLanguages(languages)}</p>
                </div>
              ) : null}
              {specialist.city ? (
                <div>
                  <p className="text-xs text-freuly-text-secondary">Локация</p>
                  <p className="mt-1 font-semibold">{specialist.city}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#242220] text-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-5 py-14 md:flex-row md:items-center md:justify-between md:px-20 md:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold md:text-[40px]">Не обязательно точно знать, с чего начать</h2>
            <p className="mt-4 text-base leading-relaxed text-white/75 md:text-lg">
              Иногда достаточно описать ситуацию своими словами — дальше можно уточнить запрос вместе.
            </p>
          </div>
          <Button
            type="button"
            variant="outlinePrimary"
            onClick={scrollToLeadForm}
            className="h-auto min-h-[46px] shrink-0 rounded-full border-white/30 bg-transparent px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {PRO_CTA_LABEL}
          </Button>
        </div>
      </section>

      <section className="bg-freuly-page">
        <div className="mx-auto w-full max-w-[720px] px-5 py-14 md:px-8 md:py-20">
          <div
            id="lead-form"
            className="scroll-mt-24 rounded-[24px] border border-[#E3DDD5] bg-freuly-surface p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold md:text-3xl">{sectionText.leadFormTitle}</h2>
            {leadSuccessMessage && !showForm ? (
              <p className="mt-4 rounded-freuly-md border border-freuly-success-border bg-freuly-success-light px-3 py-2 text-sm font-medium text-freuly-success">
                {leadSuccessMessage}
              </p>
            ) : (
              <div className="mt-6">
                <LeadForm
                  specialistId={specialist.id}
                  onSuccess={(message) => {
                    setShowForm(false);
                    setLeadSuccessMessage(message);
                  }}
                />
              </div>
            )}
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
