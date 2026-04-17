"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LeadForm from "@/components/LeadForm";
import Image from "next/image";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { getSpecialistUrl } from "@/lib/urls";
import { getSupabase } from "@/lib/supabaseClient";
import uaDict from "@/locales/ua.json";
import { getSpecialistPageTranslations, getWorkFormat } from "@/lib/i18n/getTranslations";
import SectionCard from "@/components/specialist/SectionCard";
import SpecialistHero from "@/components/specialist/SpecialistHero";
import SpecialistDocumentsLightbox from "@/components/specialist/SpecialistDocumentsLightbox";
import MobileStickyCTA from "@/components/MobileStickyCTA";

const LEGACY_SLUGS: Record<string, string> = {
  "zkeiy-lbztieh": "cosmetologists-kassel-irina-melnik",
  "nhliy-oyimbzeae": "psychologists-oksana-pantelidi",
  "mymyzth-sbtbih": "business-kirchhundem-natalya-sheshenya",
};

/** Slug lookup failed — show localized not-found copy via `t(dict, …)` in the error UI. */
const SLUG_NOT_FOUND = "SLUG_NOT_FOUND";

interface Specialist {
  id: string;
  slug?: string | null;
  name: string | null;
  description?: string;
  bio?: string;
  avatar_url: string | null;
  city?: string | null;
  address?: string | null;
  category?: string;
  category_title_ru?: string | null;
  category_title_de?: string | null;
  category_title_ua?: string | null;
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
  user_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  specialist_services?: Array<{
    id: string;
    title: string;
    price_from: number;
    price_to: number | null;
    currency: string;
    price_comment?: string | null;
  }>;
}

function getSpecialistServicePriceDisplay(
  service: {
    price_from: number;
    price_to?: number | null;
    currency?: string | null;
    price_comment?: string | null;
  },
  priceOnRequestLabel: string
): { main: string; commentBelow: string | null } {
  const currency =
    typeof service.currency === "string" && service.currency.trim() ? service.currency.trim() : "EUR";
  const raw = service.price_from;
  const pf =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : typeof raw === "string" && String(raw).trim()
        ? Number(String(raw).replace(/\s/g, "").replace(",", "."))
        : NaN;
  const comment =
    service.price_comment != null && String(service.price_comment).trim()
      ? String(service.price_comment).trim()
      : null;

  if (Number.isFinite(pf) && pf > 0) {
    const to = service.price_to;
    const hasRange =
      to != null && typeof to === "number" && Number.isFinite(to) && to > 0;
    const main = hasRange ? `${pf}–${to} ${currency}` : `${pf} ${currency}`;
    return { main, commentBelow: comment };
  }

  if (pf === 0 && comment) {
    return { main: comment, commentBelow: null };
  }

  return { main: priceOnRequestLabel, commentBelow: null };
}

export default function SpecialistPage() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
  const [activePortfolioIndex, setActivePortfolioIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [reviews, setReviews] = useState<Array<{ id: string; author_name: string; rating: number; comment: string; created_at: string }>>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 0, comment: "" });
  const [documentLightboxIndex, setDocumentLightboxIndex] = useState<number | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const redirected = useRef(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const searchParams = useSearchParams();
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
    if (id in LEGACY_SLUGS) {
      redirected.current = true;
      window.location.replace(`/${lang}/specialist/${LEGACY_SLUGS[id]}`);
    }
  }, [id, lang]);

  useEffect(() => {
    if (redirected.current) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);

    const fetchSpecialist = async () => {
      try {
        let resolvedId = id;

        if (!isUuid) {
          const { data: row } = await getSupabase()
            .from("specialists")
            .select("id")
            .eq("slug", id)
            .maybeSingle();

          if (row?.id) {
            resolvedId = row.id;
          } else {
            setError(SLUG_NOT_FOUND);
            return;
          }
        }

        const response = await fetch(
          `/api/specialists/${resolvedId}?lang=${encodeURIComponent(lang)}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!response.ok) {
          setError(result.error || null);
          return;
        }

        const data = result.data;
        setSpecialist(data);
      } catch (err: any) {
        setError(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialist();
  }, [id, lang]);

  useEffect(() => {
    if (redirected.current) return;
    if (specialist?.slug && id !== specialist.slug) {
      redirected.current = true;
      window.location.replace(`/${lang}/specialist/${specialist.slug}`);
    }
  }, [specialist, id, lang]);

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

  useEffect(() => {
    if (!specialist) return;

    if (specialist.lat != null && specialist.lng != null) {
      setMapCoords({ lat: Number(specialist.lat), lon: Number(specialist.lng) });
      return;
    }

    const query = specialist.address
      ? [specialist.address, specialist.city].filter(Boolean).join(", ")
      : specialist.city || "";
    if (!query) return;

    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((results: Array<{ lat: string; lon: string }>) => {
        if (cancelled || !results?.[0]) return;
        setMapCoords({ lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [specialist?.lat, specialist?.lng, specialist?.address, specialist?.city]);

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
    return () => { cancelled = true; };
  }, [specialist?.id]);

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
          <p className="text-gray-600 mb-6">
            {error === SLUG_NOT_FOUND
              ? t(dict, "specialist.slugNotFound")
              : error || t(dict, "common.tryLater")}
          </p>
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
  const displayName = specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback");
  const aboutText = (specialist.description ?? specialist.bio)?.trim() || "";
  const specializationText = getCategoryTitle(
    {
      title: specialist.category ?? null,
      title_ru: specialist.category_title_ru ?? null,
      title_de: specialist.category_title_de ?? null,
      title_ua: specialist.category_title_ua ?? null,
    },
    toCategoryTitleLang(lang)
  ) || t(dict, "specialist.about", { defaultValue: "Спеціаліст" });
  const galleryPlaceholders = Array.from({ length: 4 }, (_, idx) => idx);
  const workMode = getWorkFormat(specialist.format)
    ?? getWorkFormat(specialist.work_format)
    ?? (typeof specialist.is_online === "boolean" ? (specialist.is_online ? "online" : "offline") : null)
    ?? (typeof specialist.online === "boolean" ? (specialist.online ? "online" : "offline") : null);
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
  const parseImageList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  };
  /** Gallery slider + grid: only marketing photos from `gallery_urls` (not certificates or legacy merged fields). */
  const portfolioImages = parseImageList(specialist.gallery_urls).slice(0, 8);
  const certificateUrls = parseImageList(specialist.certificate_urls).slice(0, 10);
  const hasPortfolio = portfolioImages.length > 0;
  const portfolioCount = portfolioImages.length;
  const normalizedActivePortfolioIndex = portfolioCount > 0 ? Math.min(activePortfolioIndex, portfolioCount - 1) : 0;
  const activePortfolioImage = portfolioCount > 0 ? portfolioImages[normalizedActivePortfolioIndex] : null;
  const hasRating = specialist.rating != null && Number.isFinite(specialist.rating);
  const reviewsCount = specialist.reviews_count ?? 0;
  const normalizedRating = hasRating ? Math.max(0, Math.min(5, specialist.rating ?? 0)) : 0;
  const sectionText = getSpecialistPageTranslations(lang);

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

  const parseVideoEmbedUrl = (url: string | null | undefined): string | null => {
    if (!url || typeof url !== "string") return null;
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();

      // YouTube
      if (host.includes("youtube.com") || host.includes("youtu.be")) {
        let videoId: string | null = null;

        if (host.includes("youtu.be")) {
          videoId = parsed.pathname.slice(1);
        }
        if (parsed.searchParams.get("v")) {
          videoId = parsed.searchParams.get("v");
        }
        if (parsed.pathname.includes("/shorts/")) {
          videoId = parsed.pathname.split("/shorts/")[1] ?? null;
        }
        if (parsed.pathname.includes("/embed/")) {
          videoId = parsed.pathname.split("/embed/")[1] ?? null;
        }

        if (videoId) {
          videoId = videoId.split("?")[0].split("&")[0];
          return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
        }
      }

      // Vimeo
      if (host.includes("vimeo.com")) {
        const parts = parsed.pathname.split("/");
        const id = parts.find((p) => /^\d+$/.test(p));
        if (id) return `https://player.vimeo.com/video/${id}`;
      }
    } catch {
      return null;
    }
    return null;
  };

  const videoEmbedUrl = parseVideoEmbedUrl(specialist?.video_url);

  const goPrevDocument = () => {
    if (certificateUrls.length === 0) return;
    setDocumentLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + certificateUrls.length) % certificateUrls.length;
    });
  };

  const goNextDocument = () => {
    if (certificateUrls.length === 0) return;
    setDocumentLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % certificateUrls.length;
    });
  };

  const workModeLabel = workMode ? sectionText.work_format[workMode] : null;
  const specialistPath = getSpecialistUrl(lang, specialist);
  const specialistUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${specialistPath}`
      : `https://freuly.de${specialistPath}`;
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
    const text = encodeURIComponent(`${t(dict, "specialistPage.shareText")}: ${specialistUrl}`);
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
      <div className="mx-auto max-w-6xl flex flex-col md:grid md:grid-cols-[minmax(0,1.45fr)_minmax(320px,1fr)] md:gap-6 md:items-start">
        <aside className="order-1 mt-6 md:order-none md:col-start-2 md:row-start-1 md:mt-0 md:self-start md:sticky md:top-6">
          <SpecialistHero
            name={displayName}
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

        <main className="order-2 mt-6 space-y-6 md:order-none md:col-start-1 md:row-start-1 md:mt-0">
          {aboutText ? (
            <SectionCard title={t(dict, "specialist.about")} subtitle={lang === "ru" ? "Опыт, подход и ключевые компетенции" : lang === "de" ? "Erfahrung, Ansatz und Schlüsselkompetenzen" : "Досвід, підхід та ключові компетенції"}>
              <div id="about" className="scroll-mt-24">
                <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{aboutText}</p>
              </div>
            </SectionCard>
          ) : null}

          {certificateUrls.length > 0 ? (
            <SectionCard title={sectionText.certificatesTitle} subtitle={sectionText.certificatesSubtitle}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {certificateUrls.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setDocumentLightboxIndex(idx)}
                    className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-neutral-100 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={src}
                        alt={`${sectionText.certificatesTitle} ${idx + 1}`}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 45vw, 200px"
                        unoptimized
                      />
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {hasPortfolio ? (
            <section>
              <SectionCard title={sectionText.topGalleryTitle} subtitle={sectionText.topGallerySubtitle}>
                <div className="relative group overflow-hidden rounded-xl bg-slate-100 aspect-[16/10]">
                  {activePortfolioImage ? (
                    <div onTouchStart={onTouchStartPortfolio} onTouchEnd={onTouchEndPortfolio} className="h-full w-full">
                      <Image
                        src={activePortfolioImage}
                        alt={`${displayName} work ${normalizedActivePortfolioIndex + 1}`}
                        fill
                        className="object-cover"
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
            <section>
              <SectionCard title={sectionText.profilePhotoTitle} subtitle={sectionText.profilePhotoSubtitle}>
                {!hasPortfolio && specialist.avatar_url && (
                  <div className="relative rounded-xl bg-slate-100 aspect-[4/3] flex items-center justify-center">
                    <Image
                      src={specialist.avatar_url}
                      alt={displayName}
                      fill
                      className="object-contain object-center"
                    />
                    {(() => {
                      const authUserId = typeof window !== "undefined" ? window.localStorage.getItem("authUserId") : null;
                      const handleAddPhotos = () => {
                        // Placeholder: open upload dialog or similar
                        alert("Добавить фото: функция в разработке");
                      };
                      return authUserId === specialist.user_id && (
                        <button
                          className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow text-sm font-medium"
                          type="button"
                          onClick={handleAddPhotos}
                        >
                          Добавить фото
                        </button>
                      );
                    })()}
                  </div>
                )}
                {!hasPortfolio && !specialist.avatar_url && (
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

          {videoEmbedUrl ? (
            <SectionCard title={sectionText.videoTitle} subtitle="">
              <div className="relative w-full overflow-hidden rounded-xl bg-slate-100 aspect-video">
                <iframe
                  src={videoEmbedUrl}
                  className="absolute inset-0 h-full w-full rounded-xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={t(dict, "specialistPage.videoTitle")}
                />
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title={sectionText.reviewsTitle} subtitle={sectionText.reviewsSubtitle}>
            <div className="flex flex-wrap items-center gap-3 text-gray-800">
              <div className="flex items-center gap-1" aria-label={`rating ${normalizedRating.toFixed(1)} out of 5`}>
                {Array.from({ length: 5 }, (_, idx) => renderStar(normalizedRating - idx, idx))}
              </div>
              {hasRating ? <p className="text-2xl font-bold">{specialist.rating?.toFixed(1)}</p> : null}
              {(reviewsCount > 0 || reviews.length > 0) ? (
                <p className="text-sm text-gray-600">
                  ({reviews.length || reviewsCount} {sectionText.reviewsWord})
                </p>
              ) : null}
            </div>
            {reviews.length > 0 ? (
              <div className="mt-4 space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{review.author_name}</p>
                      <time className="text-xs text-gray-500" dateTime={review.created_at}>
                        {new Date(review.created_at).toLocaleDateString(lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                      </time>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, idx) => (
                        <span key={idx} className={idx < review.rating ? "text-yellow-400" : "text-gray-300"}>★</span>
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{sectionText.noReviews}</p>
            )}

            <div className="mt-4">
              {reviewMsg ? (
                <p className={`mb-3 text-sm ${reviewMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>{reviewMsg.text}</p>
              ) : null}

              {!showReviewForm ? (
                <button
                  type="button"
                  onClick={() => { setShowReviewForm(true); setReviewMsg(null); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  {sectionText.leaveReview}
                </button>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-gray-700">{sectionText.reviewName}</span>
                    <input
                      value={reviewForm.author_name}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, author_name: e.target.value.slice(0, 100) }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </label>
                  <div className="space-y-1 text-sm">
                    <span className="font-medium text-gray-700">{sectionText.reviewRating}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: idx + 1 }))}
                          className={`text-2xl transition ${idx < reviewForm.rating ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-gray-700">{sectionText.reviewComment}</span>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value.slice(0, 1000) }))}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={reviewSubmitting}
                      onClick={async () => {
                        setReviewMsg(null);
                        if (!reviewForm.author_name.trim() || reviewForm.rating < 1 || !reviewForm.comment.trim()) {
                          setReviewMsg({ type: "err", text: sectionText.reviewFillAll });
                          return;
                        }
                        setReviewSubmitting(true);
                        try {
                          const res = await fetch(`/api/specialists/${specialist.id}/reviews`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              author_name: reviewForm.author_name.trim(),
                              rating: reviewForm.rating,
                              comment: reviewForm.comment.trim(),
                            }),
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setReviewMsg({ type: "err", text: sectionText.reviewError });
                            return;
                          }
                          if (json.data) {
                            setReviews((prev) => [json.data, ...prev]);
                          }
                          setReviewForm({ author_name: "", rating: 0, comment: "" });
                          setShowReviewForm(false);
                          setReviewMsg({ type: "ok", text: sectionText.reviewSuccess });
                        } catch {
                          setReviewMsg({ type: "err", text: sectionText.reviewError });
                        } finally {
                          setReviewSubmitting(false);
                        }
                      }}
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {reviewSubmitting ? "..." : sectionText.reviewSubmit}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowReviewForm(false); setReviewMsg(null); }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
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

          {(Array.isArray(specialist?.specialist_services) && specialist.specialist_services.length > 0) && (
            <SectionCard title={sectionText.servicesTitle} subtitle={sectionText.servicesSubtitle}>
              <div className="space-y-3">
                {(specialist.specialist_services ?? []).map((service) => {
                  const { main, commentBelow } = getSpecialistServicePriceDisplay(
                    service,
                    sectionText.servicePriceOnRequest
                  );
                  return (
                    <div key={service.id} className="flex justify-between gap-3 border-b pb-2">
                      <span className="min-w-0">{service.title}</span>
                      <div className="shrink-0 max-w-[min(100%,18rem)] text-right">
                        <span className="font-medium text-textPrimary">{main}</span>
                        {commentBelow ? (
                          <p className="mt-0.5 text-xs font-normal text-gray-500">{commentBelow}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {(specialist.city || (specialist.languages && specialist.languages.length > 0) || workModeLabel) ? (
            <SectionCard title={sectionText.contactsTitle} subtitle={sectionText.contactsSubtitle}>
              <div className="space-y-2 text-sm text-gray-700">
                {specialist.city ? (
                  <p>
                    <span className="font-medium">{sectionText.contactsLineLocation}: </span>
                    {specialist.city}
                  </p>
                ) : null}
                {specialist.address ? (
                  <p>
                    <span className="font-medium">{t(dict, "specialistPage.contactsLineAddress")}: </span>
                    {specialist.address}
                  </p>
                ) : null}
                {(specialist.address || specialist.city) ? (() => {
                  const destination = [specialist.address, specialist.city].filter(Boolean).join(", ");
                  return (
                    <>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        {t(dict, "specialistPage.buildRoute")}
                      </a>
                      {mapCoords ? (
                        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                          <iframe
                            title={t(dict, "specialistPage.mapEmbedTitle")}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.007},${mapCoords.lon + 0.01},${mapCoords.lat + 0.007}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`}
                            width="100%"
                            height="200"
                            style={{ border: 0 }}
                            loading="lazy"
                          />
                        </div>
                      ) : null}
                    </>
                  );
                })() : null}
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
                  {t(dict, "specialistPage.copyLink")}
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

        </main>
      </div>

      <SpecialistDocumentsLightbox
        urls={certificateUrls}
        activeIndex={documentLightboxIndex}
        onClose={() => setDocumentLightboxIndex(null)}
        onGoPrev={goPrevDocument}
        onGoNext={goNextDocument}
        ariaLabel={sectionText.certificatesTitle}
      />

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

