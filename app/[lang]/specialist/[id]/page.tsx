"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { useEffect, useMemo, useState } from "react";
import LeadForm from "@/components/LeadForm";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";
import SectionCard from "@/components/specialist/SectionCard";
import SpecialistHero from "@/components/specialist/SpecialistHero";
import MobileStickyCTA from "@/components/MobileStickyCTA";

interface Specialist {
  id: string;
  slug?: string | null;
  name: string;
  description?: string;
  bio?: string;
  avatar_url: string | null;
  city?: string | null;
  category?: string;
  category_id?: string;
  video_url?: string | null;
  gallery_urls?: string[];
  certificate_urls?: string[];
  portfolio_images?: string[];
  works?: string[];
  rating?: number | null;
  reviews_count?: number | null;
  plan_code?: string | null;
  plan_status?: string | null;
  services?: string[] | string | null;
  directions?: string[] | string | null;
  languages: string[];
  created_at: string;
  is_online?: boolean;
  online?: boolean;
  format?: string | null;
  work_format?: string | null;
}

export default function SpecialistPage({ params }: { params: { id: string } }) {
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const lang = useMemo<Lang>(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? (seg as Lang) : "ua";
  }, [pathname]);
  const langPrefix = `/${lang}`;

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

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
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/specialists/${params.id}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || null);
          return;
        }

        setSpecialist(result.data);
        const canonicalSlug =
          result?.data && typeof result.data.slug === "string"
            ? result.data.slug.trim()
            : "";
        if (canonicalSlug && canonicalSlug !== params.id) {
          router.replace(`/${lang}/specialist/${encodeURIComponent(canonicalSlug)}`);
        }
      } catch (err: any) {
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialist();
  }, [params.id, router, lang]);

  // Auto-open form by query param
  useEffect(() => {
    const open = searchParams?.get("open");
    if (open === "form") {
      setShowForm(true);
      setTimeout(() => {
        const el = document.getElementById("lead-form");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">{t(dict, "specialist.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {t(dict, "specialist.notFound")}
          </h1>
          <p className="text-gray-600 mb-6">{error || t(dict, "common.tryLater")}</p>
          <Link
            href={langPrefix}
            className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:shadow-lg transition"
          >
            {t(dict, "common.toHome")}
          </Link>
        </div>
      </div>
    );
  }

  const isNewActive = (() => {
    const createdTs = Date.parse(specialist.created_at);
    if (!Number.isFinite(createdTs)) return false;
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    return Date.now() - createdTs <= twoWeeksMs;
  })();
  const aboutText = (specialist.description ?? specialist.bio)?.trim() || "";
  const specializationText = specialist.category || t(dict, "specialist.about", { defaultValue: "Спеціаліст" });
  const galleryPlaceholders = Array.from({ length: 4 }, (_, idx) => idx);
  const workMode = (() => {
    if (typeof specialist.format === "string") {
      const normalized = specialist.format.trim().toLowerCase();
      if (normalized === "online" || normalized === "offline" || normalized === "hybrid") return normalized;
    }
    if (typeof specialist.work_format === "string") {
      const normalized = specialist.work_format.trim().toLowerCase();
      if (normalized === "online" || normalized === "offline" || normalized === "hybrid") return normalized;
    }
    if (typeof specialist.is_online === "boolean") return specialist.is_online ? "online" : "offline";
    if (typeof specialist.online === "boolean") return specialist.online ? "online" : "offline";
    return null;
  })();
  const parseList = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (typeof value === "string" && value.trim()) {
      return value
        .split(/[\n,;•]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };
  const servicesList = Array.from(new Set([...parseList(specialist.services), ...parseList(specialist.directions)])).slice(0, 8);
  const asRecord = specialist as unknown as Record<string, unknown>;
  const parseImageList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  };
  const portfolioImages = Array.from(
    new Set([
      ...parseImageList(specialist.gallery_urls),
      ...parseImageList(specialist.portfolio_images),
      ...parseImageList(specialist.works),
      ...parseImageList(asRecord.portfolioImages),
      ...parseImageList(asRecord.work_images),
      ...parseImageList(asRecord.works_images),
    ])
  ).slice(0, 8);
  const hasPortfolio = portfolioImages.length > 0;
  const portfolioCount = portfolioImages.length;
  const normalizedActivePortfolioIndex = portfolioCount > 0 ? Math.min(activePortfolioIndex, portfolioCount - 1) : 0;
  const activePortfolioImage = portfolioCount > 0 ? portfolioImages[normalizedActivePortfolioIndex] : null;
  const hasRating = specialist.rating != null && Number.isFinite(specialist.rating);
  const reviewsCount = specialist.reviews_count ?? 0;
  const normalizedRating = hasRating ? Math.max(0, Math.min(5, specialist.rating ?? 0)) : 0;
  const sectionText = {
    ua: {
      topGalleryTitle: "Галерея робіт",
      topGallerySubtitle: "Приклади робіт та матеріали спеціаліста",
      profilePhotoTitle: "Фото спеціаліста",
      profilePhotoSubtitle: "Портфоліо поки не додано",
      leadFormTitle: "Швидка заявка",
      galleryTitle: "Галерея і відео",
      gallerySubtitle: "Розділ підготовлено для майбутнього медіа-контенту",
      reviewsTitle: "Відгуки і рейтинг",
      reviewsSubtitle: "Досвід клієнтів та соціальний доказ",
      noReviews: "Відгуки поки не додані.",
      reviewsWord: "відгуків",
      servicesTitle: "Послуги",
      servicesSubtitle: "Список послуг з'явиться після наступного оновлення профілю",
      contactsTitle: "Додаткова інформація",
      contactsSubtitle: "Ключові деталі профілю",
      contactsLineLocation: "Локація",
      contactsLineLanguages: "Мови",
      contactsLineFormat: "Формат роботи",
      online: "Онлайн",
      offline: "Офлайн",
      hybrid: "Онлайн • Офлайн",
      readMore: "Читати повністю",
      newBadge: "Новий",
    },
    ru: {
      topGalleryTitle: "Галерея работ",
      topGallerySubtitle: "Примеры работ и материалы специалиста",
      profilePhotoTitle: "Фото специалиста",
      profilePhotoSubtitle: "Портфолио пока не добавлено",
      leadFormTitle: "Быстрая заявка",
      galleryTitle: "Галерея и видео",
      gallerySubtitle: "Раздел подготовлен для будущего медиа-контента",
      reviewsTitle: "Отзывы и рейтинг",
      reviewsSubtitle: "Опыт клиентов и социальное доказательство",
      noReviews: "Отзывы пока не добавлены.",
      reviewsWord: "отзывов",
      servicesTitle: "Услуги",
      servicesSubtitle: "Список услуг появится после следующего обновления профиля",
      contactsTitle: "Дополнительная информация",
      contactsSubtitle: "Ключевые детали профиля",
      contactsLineLocation: "Локация",
      contactsLineLanguages: "Языки",
      contactsLineFormat: "Формат работы",
      online: "Онлайн",
      offline: "Офлайн",
      hybrid: "Онлайн • Офлайн",
      readMore: "Читать полностью",
      newBadge: "Новый",
    },
    de: {
      topGalleryTitle: "Galerie der Arbeiten",
      topGallerySubtitle: "Arbeitsbeispiele und Materialien des Spezialisten",
      profilePhotoTitle: "Foto des Spezialisten",
      profilePhotoSubtitle: "Portfolio noch nicht hinzugefügt",
      leadFormTitle: "Schnellanfrage",
      galleryTitle: "Galerie und Video",
      gallerySubtitle: "Dieser Bereich ist für künftige Medieninhalte vorbereitet",
      reviewsTitle: "Bewertungen und Rating",
      reviewsSubtitle: "Kundenerfahrung und sozialer Nachweis",
      noReviews: "Noch keine Bewertungen vorhanden.",
      reviewsWord: "Bewertungen",
      servicesTitle: "Leistungen",
      servicesSubtitle: "Die Liste der Leistungen erscheint nach dem nächsten Profil-Update",
      contactsTitle: "Zusätzliche Informationen",
      contactsSubtitle: "Wichtige Profildetails",
      contactsLineLocation: "Standort",
      contactsLineLanguages: "Sprachen",
      contactsLineFormat: "Arbeitsformat",
      online: "Online",
      offline: "Offline",
      hybrid: "Online • Offline",
      readMore: "Vollständig lesen",
      newBadge: "Neu",
    },
  }[lang];

  const goToPrevPortfolio = () => {
    if (portfolioCount <= 1) return;
    setActivePortfolioIndex((prev) => (prev - 1 + portfolioCount) % portfolioCount);
  };

  const goToNextPortfolio = () => {
    if (portfolioCount <= 1) return;
    setActivePortfolioIndex((prev) => (prev + 1) % portfolioCount);
  };

  const onTouchStartPortfolio = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const onTouchEndPortfolio = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX == null || portfolioCount <= 1) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    const threshold = 40;
    if (Math.abs(delta) >= threshold) {
      if (delta < 0) goToNextPortfolio();
      if (delta > 0) goToPrevPortfolio();
    }
    setTouchStartX(null);
  };
  const scrollToLeadForm = () => {
    const el = document.getElementById("lead-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const workModeLabel =
    workMode === "online"
      ? sectionText.online
      : workMode === "offline"
        ? sectionText.offline
        : workMode === "hybrid"
          ? sectionText.hybrid
          : null;
  const canonicalSlug = typeof specialist.slug === "string" && specialist.slug.trim().length > 0 ? specialist.slug : specialist.id;
  const specialistUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${lang}/specialist/${encodeURIComponent(canonicalSlug)}`
      : `https://freuly.de/${lang}/specialist/${encodeURIComponent(canonicalSlug)}`;
  const planCode = typeof specialist.plan_code === "string" ? specialist.plan_code : "free";
  const isProPlan = planCode.toLowerCase() === "pro";
  const handleShare = async (channel: "copy" | "whatsapp" | "telegram" | "instagram") => {
    if (channel === "copy") {
      try {
        await navigator.clipboard.writeText(specialistUrl);
      } catch {
        // no-op
      }
      return;
    }
    const text = encodeURIComponent(`Профиль специалиста: ${specialistUrl}`);
    if (channel === "whatsapp") window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    if (channel === "telegram") window.open(`https://t.me/share/url?url=${encodeURIComponent(specialistUrl)}`, "_blank", "noopener,noreferrer");
    if (channel === "instagram") window.open(`https://www.instagram.com/`, "_blank", "noopener,noreferrer");
  };
  const renderStar = (fillRatio: number, idx: number) => {
    const clamped = Math.max(0, Math.min(1, fillRatio));
    return (
      <span key={idx} className="relative inline-block h-5 w-5">
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-gray-300" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.5 5.07 5.6.81-4.05 3.95.96 5.58L10 14.27 5 16.91l.96-5.58L1.9 7.38l5.6-.81L10 1.5z" />
        </svg>
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${clamped * 100}%` }}>
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-amber-400" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5l2.5 5.07 5.6.81-4.05 3.95.96 5.58L10 14.27 5 16.91l.96-5.58L1.9 7.38l5.6-.81L10 1.5z" />
          </svg>
        </span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:py-8 pb-24 md:pb-0">
      <div className="mx-auto max-w-6xl md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] md:gap-6 md:items-start">
        {hasPortfolio ? (
          <section className="md:col-start-1">
            <SectionCard title={sectionText.topGalleryTitle} subtitle={sectionText.topGallerySubtitle}>
              <div className="relative group overflow-hidden rounded-xl bg-slate-100 aspect-[16/10]">
                {activePortfolioImage ? (
                  <div onTouchStart={onTouchStartPortfolio} onTouchEnd={onTouchEndPortfolio} className="h-full w-full">
                    <Image
                      src={activePortfolioImage}
                      alt={`${specialist.name} work ${normalizedActivePortfolioIndex + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(min-width: 768px) 66vw, 100vw"
                    />
                  </div>
                ) : null}

                {portfolioCount > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={goToPrevPortfolio}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition md:opacity-0 md:group-hover:opacity-100"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={goToNextPortfolio}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition md:opacity-0 md:group-hover:opacity-100"
                    >
                      →
                    </button>
                    <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
                      {normalizedActivePortfolioIndex + 1} / {portfolioCount}
                    </div>
                  </>
                ) : null}
              </div>
            </SectionCard>
          </section>
        ) : (
          <section className="md:col-start-1">
            <SectionCard title={sectionText.profilePhotoTitle} subtitle={sectionText.profilePhotoSubtitle}>
              {specialist.avatar_url ? (
                <div className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3] sm:aspect-[16/10]">
                  <Image src={specialist.avatar_url} alt={specialist.name} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {galleryPlaceholders.map((item) => (
                    <div
                      key={item}
                      className={item === 0 ? "col-span-2 aspect-[16/10] rounded-xl border border-dashed border-slate-300 bg-slate-100/70" : "aspect-[4/3] rounded-xl border border-dashed border-slate-300 bg-slate-100/70"}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        )}

        <aside className="mt-6 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-start md:sticky md:top-6">
          <SpecialistHero
            name={specialist.name}
            specialization={specializationText}
            city={specialist.city ?? null}
            languages={Array.isArray(specialist.languages) ? specialist.languages : []}
            workModeText={workModeLabel}
            isNew={isNewActive}
            newBadgeLabel={sectionText.newBadge}
            successMessage={leadSuccessMessage}
            aboutPreview={aboutText || null}
            aboutHref="#about"
            readMoreLabel={sectionText.readMore}
            showForm={showForm}
            formTitle={sectionText.leadFormTitle}
            formNode={
              <LeadForm
                specialistId={specialist.id}
                onSuccess={(message) => {
                  setShowForm(false);
                  setLeadSuccessMessage(message);
                }}
              />
            }
          />
        </aside>

        <main className="mt-6 space-y-6 md:col-start-1 md:mt-6">
          {aboutText ? (
            <SectionCard title={t(dict, "specialist.about")} subtitle={lang === "ru" ? "Опыт, подход и ключевые компетенции" : lang === "de" ? "Erfahrung, Ansatz und Schlüsselkompetenzen" : "Досвід, підхід та ключові компетенції"}>
              <div id="about" className="scroll-mt-24">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{aboutText}</p>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title={sectionText.reviewsTitle} subtitle={sectionText.reviewsSubtitle}>
            <div className="flex flex-wrap items-center gap-3 text-gray-800">
              <div className="flex items-center gap-1" aria-label={`rating ${normalizedRating.toFixed(1)} out of 5`}>
                {Array.from({ length: 5 }, (_, idx) => renderStar(normalizedRating - idx, idx))}
              </div>
              {hasRating ? <p className="text-2xl font-bold">{specialist.rating?.toFixed(1)}</p> : null}
              {reviewsCount > 0 ? (
                <p className="text-sm text-gray-600">
                  ({reviewsCount} {sectionText.reviewsWord})
                </p>
              ) : null}
            </div>
            {!hasRating && reviewsCount === 0 ? (
              <p className="text-sm text-gray-600">{sectionText.noReviews}</p>
            ) : null}
          </SectionCard>

          {servicesList.length > 0 ? (
            <SectionCard title={sectionText.servicesTitle} subtitle={sectionText.servicesSubtitle}>
              <div className="flex flex-wrap gap-2">
                {servicesList.map((service) => (
                  <span key={service} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                    {service}
                  </span>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {(specialist.city || (specialist.languages && specialist.languages.length > 0) || workModeLabel) ? (
            <SectionCard title={sectionText.contactsTitle} subtitle={sectionText.contactsSubtitle}>
              <div className="space-y-2 text-sm text-gray-700">
                {specialist.city ? (
                  <p>
                    <span className="font-medium">{sectionText.contactsLineLocation}: </span>
                    {specialist.city}
                  </p>
                ) : null}
                {specialist.languages && specialist.languages.length > 0 ? (
                  <p>
                    <span className="font-medium">{sectionText.contactsLineLanguages}: </span>
                    {specialist.languages.join(", ")}
                  </p>
                ) : null}
                {workModeLabel ? (
                  <p>
                    <span className="font-medium">{sectionText.contactsLineFormat}: </span>
                    {workModeLabel}
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare("copy")}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Copy link
                </button>
                {isProPlan ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleShare("whatsapp")}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare("telegram")}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Telegram
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShare("instagram")}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Instagram
                    </button>
                  </>
                ) : null}
              </div>
            </SectionCard>
          ) : null}

          {hasPortfolio ? (
            <SectionCard title={sectionText.galleryTitle} subtitle={sectionText.gallerySubtitle}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {portfolioImages.map((src, idx) => (
                  <div key={`${src}-${idx}`} className="relative overflow-hidden rounded-xl bg-slate-100 aspect-[4/3]">
                    <Image src={src} alt={`${specialist.name} work ${idx + 1}`} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}

        </main>
      </div>
      <MobileStickyCTA
        onClick={() => {
          setLeadSuccessMessage(null);
          setShowForm(true);
          scrollToLeadForm();
        }}
        label={t(dict, "specialist.sendRequest")}
        isHidden={showForm}
      />
    </div>
  );
}

