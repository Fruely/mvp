"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import LeadForm from "@/components/LeadForm";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import InstallFreuly from "@/components/pwa/InstallFreuly";
import { getPublicSpecialistLocation } from "@/lib/specialists/geography";
import { publicFieldClass } from "@/components/public/publicStyles";

const LEGACY_SLUGS: Record<string, string> = {
  "zkeiy-lbztieh": "cosmetologists-kassel-irina-melnik",
  "nhliy-oyimbzeae": "psychologists-oksana-pantelidi",
  "mymyzth-sbtbih": "business-kirchhundem-natalya-sheshenya",
};

/** Slug lookup failed — show localized not-found copy via `t(dict, …)` in the error UI. */
const SLUG_NOT_FOUND = "SLUG_NOT_FOUND";

export interface Specialist {
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
  founder_badge?: boolean;
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
    const main = hasRange ? `${pf}–${to} €` : `${pf} €`;
    return { main, commentBelow: comment };
  }

  if (pf === 0 && comment) {
    return { main: comment, commentBelow: null };
  }

  return { main: priceOnRequestLabel, commentBelow: null };
}

export default function SpecialistProfileClient({
  lang,
  id,
  hideHero = false,
  initialSpecialist = null,
}: {
  lang: "ru" | "ua" | "de";
  id: string;
  hideHero?: boolean;
  initialSpecialist?: Specialist | null;
}) {
  const [specialist, setSpecialist] = useState<Specialist | null>(initialSpecialist);
  const [loading, setLoading] = useState(!initialSpecialist);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [leadSuccessMessage, setLeadSuccessMessage] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [formInView, setFormInView] = useState(false);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState<number | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [reviews, setReviews] = useState<Array<{ id: string; author_name: string; rating: number; comment: string; created_at: string }>>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ author_name: "", rating: 0, comment: "" });
  const [documentLightboxIndex, setDocumentLightboxIndex] = useState<number | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const redirected = useRef(false);
  const profileViewReportedForIdRef = useRef<string | null>(null);
  const [reviewMsg, setReviewMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const searchParams = useSearchParams();
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

  const specialistLat = specialist?.lat;
  const specialistLng = specialist?.lng;
  const specialistAddress = specialist?.address;
  const specialistCity = specialist?.city;

  useEffect(() => {
    if (specialistLat != null && specialistLng != null) {
      setMapCoords({ lat: Number(specialistLat), lon: Number(specialistLng) });
      return;
    }

    const query = specialistAddress
      ? [specialistAddress, specialistCity].filter(Boolean).join(", ")
      : specialistCity || "";
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
  }, [specialistLat, specialistLng, specialistAddress, specialistCity]);

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

  useEffect(() => {
    if (!specialist?.id) return;
    const el = document.getElementById("lead-form");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFormInView(entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [specialist?.id, showForm, hideHero, leadSuccessMessage]);

  useEffect(() => {
    if (!specialist?.id) return;
    const routeId = id.trim();
    if (!routeId) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(routeId);
    const routeMatchesSpecialist =
      (isUuid && specialist.id.toLowerCase() === routeId.toLowerCase()) ||
      (!isUuid && String(specialist.slug ?? "") === routeId);
    if (!routeMatchesSpecialist) return;
    if (profileViewReportedForIdRef.current === specialist.id) return;
    profileViewReportedForIdRef.current = specialist.id;

    void fetch(`/api/specialists/${specialist.id}/view`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => {});
  }, [id, specialist?.id, specialist?.slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-freuly-primary"></div>
          <p className="text-freuly-text-secondary">{t(dict, "specialist.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-freuly-text-primary mb-2">
            {t(dict, "specialist.notFound")}
          </h1>
          <p className="text-freuly-text-secondary mb-6">
            {error === SLUG_NOT_FOUND
              ? t(dict, "specialist.slugNotFound")
              : error || t(dict, "common.tryLater")}
          </p>
          <Link
            href={langPrefix}
            className="inline-block rounded-freuly-md bg-freuly-primary px-6 py-3 text-freuly-text-on-primary transition hover:bg-freuly-primary-hover"
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
  const workMode = getWorkFormat(specialist.format)
    ?? getWorkFormat(specialist.work_format)
    ?? (typeof specialist.is_online === "boolean" ? (specialist.is_online ? "online" : "offline") : null)
    ?? (typeof specialist.online === "boolean" ? (specialist.online ? "online" : "offline") : null);
  const publicLocation = getPublicSpecialistLocation({
    workFormat: workMode,
    city: specialist.city,
    onlineLabel: t(dict, "specialist.workFormat.online"),
  });
  const publicLocationLabel = publicLocation.label || null;
  const showPhysicalAddress = workMode !== "online" && Boolean(specialist.address?.trim());
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
  /** Gallery slider + grid: server already applies plan-based limits on `gallery_urls`. */
  const portfolioImages = parseImageList(specialist.gallery_urls);
  const certificateUrls = parseImageList(specialist.certificate_urls).slice(0, 10);
  const hasPortfolio = portfolioImages.length > 0;
  const hasPricedServices = Array.isArray(specialist.specialist_services) && specialist.specialist_services.length > 0;
  const hasRating = specialist.rating != null && Number.isFinite(specialist.rating);
  const normalizedRating = hasRating ? Math.max(0, Math.min(5, specialist.rating ?? 0)) : 0;
  const sectionText = getSpecialistPageTranslations(lang);

  const scrollToLeadForm = () => {
    const el = document.getElementById("lead-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToServices = () => {
    const el = document.getElementById("services");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const aboutNeedsCollapse = aboutText.length > 220;

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
        <svg viewBox="0 0 20 20" className="h-5 w-5 text-freuly-border-default" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5l2.5 5.07 5.6.81-4.05 3.95.96 5.58L10 14.27 5 16.91l.96-5.58L1.9 7.38l5.6-.81L10 1.5z" />
        </svg>
        <span className="absolute inset-0 overflow-hidden" style={{ width: `${clamped * 100}%` }}>
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-freuly-warning" fill="currentColor" aria-hidden="true">
            <path d="M10 1.5l2.5 5.07 5.6.81-4.05 3.95.96 5.58L10 14.27 5 16.91l.96-5.58L1.9 7.38l5.6-.81L10 1.5z" />
          </svg>
        </span>
      </span>
    );
  };

  const requestFormCard = (
    <div
      id="lead-form"
      className="scroll-mt-24 rounded-freuly-card border border-freuly-border-default bg-freuly-surface p-6 sm:p-8"
    >
      <h2 className="text-freuly-card-title text-freuly-text-primary">{sectionText.leadFormTitle}</h2>
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
  );

  const showLocationSection =
    workMode !== "online" && Boolean(publicLocationLabel || specialist.address?.trim());
  const destination = [specialist.address, specialist.city].filter(Boolean).join(", ");
  const isOnlineOnly = workMode === "online";
  const heroCityLabel = isOnlineOnly ? null : publicLocationLabel;
  const showHeroServicesCta =
    !isOnlineOnly && (hasPricedServices || servicesList.length > 0);

  const utilityRow =
    specialist.languages?.length || workModeLabel ? (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-freuly-border-default py-4 text-sm text-freuly-text-secondary">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {specialist.languages && specialist.languages.length > 0 ? (
            <p>
              {sectionText.contactsLineLanguages}: {specialist.languages.join(" • ")}
            </p>
          ) : null}
          {workModeLabel ? (
            <p>
              {sectionText.contactsLineFormat}: {workModeLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleShare("copy")}
            className="text-sm font-medium text-freuly-primary"
          >
            {t(dict, "specialistPage.copyLink")}
          </button>
          {isProPlan ? (
            <>
              <button type="button" onClick={() => void handleShare("whatsapp")} className="text-sm font-medium text-freuly-primary">
                WhatsApp
              </button>
              <button type="button" onClick={() => void handleShare("telegram")} className="text-sm font-medium text-freuly-primary">
                Telegram
              </button>
              <button type="button" onClick={() => void handleShare("instagram")} className="text-sm font-medium text-freuly-primary">
                Instagram
              </button>
            </>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-freuly-page pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
      {!hideHero ? (
        <SpecialistHero
          avatarUrl={specialist.avatar_url}
          avatarAlt={displayName}
          name={displayName}
          specialization={specializationText}
          city={heroCityLabel}
          languages={Array.isArray(specialist.languages) ? specialist.languages : []}
          workModeText={workModeLabel}
          isNew={isNewActive}
          newBadgeLabel={sectionText.newBadge}
          showFounderBadge={specialist.founder_badge === true}
          successMessage={null}
          aboutPreview={aboutText || null}
          requestLabel={t(dict, "specialist.sendRequest")}
          servicesLabel={sectionText.servicesAndPricesTitle}
          onRequestClick={() => {
            setLeadSuccessMessage(null);
            setShowForm(true);
            scrollToLeadForm();
          }}
          onServicesClick={scrollToServices}
          showServicesCta={showHeroServicesCta}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[1280px] px-5 py-5 md:px-20 md:py-14">
        <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,832px)_400px] md:items-start md:gap-12">
          <main className="order-1 space-y-10 md:space-y-14">
          {hasPricedServices || servicesList.length > 0 ? (
            <SectionCard id="services" title={sectionText.servicesAndPricesTitle}>
              <div>
                {hasPricedServices
                  ? (specialist.specialist_services ?? []).map((service, index) => {
                      const { main, commentBelow } = getSpecialistServicePriceDisplay(
                        service,
                        sectionText.servicePriceOnRequest
                      );
                      return (
                        <div
                          key={service.id}
                          className={`flex items-center justify-between gap-3 py-4 ${index > 0 ? "border-t border-freuly-border-default" : ""}`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-[15px] font-semibold text-freuly-text-primary">{service.title}</p>
                            {commentBelow ? (
                              <p className="text-[13px] text-freuly-text-secondary">{commentBelow}</p>
                            ) : null}
                          </div>
                          <p className="shrink-0 text-base font-bold text-freuly-primary">{main}</p>
                        </div>
                      );
                    })
                  : servicesList.map((service, index) => (
                      <div
                        key={service}
                        className={`flex items-center justify-between gap-3 py-4 ${index > 0 ? "border-t border-freuly-border-default" : ""}`}
                      >
                        <p className="min-w-0 text-[15px] font-semibold text-freuly-text-primary">{service}</p>
                      </div>
                    ))}
              </div>
            </SectionCard>
          ) : null}

          {aboutText ? (
            <SectionCard id="about" title={t(dict, "specialist.about")}>
              <p
                className={`whitespace-pre-wrap text-[15px] leading-[1.7] text-freuly-text-primary ${
                  aboutNeedsCollapse && !aboutExpanded ? "line-clamp-5" : ""
                }`}
              >
                {aboutText}
              </p>
              {aboutNeedsCollapse && !aboutExpanded ? (
                <button
                  type="button"
                  onClick={() => setAboutExpanded(true)}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary"
                >
                  {sectionText.readMore}
                  <span aria-hidden>›</span>
                </button>
              ) : null}
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
                    className="group relative overflow-hidden rounded-freuly-lg border border-freuly-border-default bg-freuly-page transition hover:border-freuly-primary/40 focus:outline-none freuly-focus-ring"
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
            <section className="space-y-4 sm:space-y-6">
              <header>
                <h2 className="text-freuly-section-title text-freuly-text-primary">{sectionText.topGalleryTitle}</h2>
                {sectionText.topGallerySubtitle ? (
                  <p className="mt-1 text-sm text-freuly-text-secondary">{sectionText.topGallerySubtitle}</p>
                ) : null}
              </header>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                {portfolioImages.map((src, idx) => (
                  <button
                    key={`${src}-${idx}`}
                    type="button"
                    onClick={() => setGalleryLightboxIndex(idx)}
                    className="relative h-[140px] w-[140px] shrink-0 overflow-hidden rounded-freuly-lg bg-freuly-page md:h-[220px] md:w-auto"
                  >
                    <Image
                      src={src}
                      alt={`${displayName} ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 140px, 267px"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {videoEmbedUrl ? (
            <SectionCard title={sectionText.videoTitle} subtitle="">
              <div className="relative aspect-video w-full overflow-hidden rounded-freuly-lg bg-freuly-page">
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

          <SectionCard title={sectionText.reviewsTitle}>
            {reviews.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 text-freuly-text-primary">
                  <div className="flex items-center gap-1" aria-label={`rating ${normalizedRating.toFixed(1)} out of 5`}>
                    {Array.from({ length: 5 }, (_, idx) => renderStar(normalizedRating - idx, idx))}
                  </div>
                  {hasRating ? <p className="text-sm font-semibold text-freuly-text-primary">{specialist.rating?.toFixed(1)} / 5.0</p> : null}
                </div>
                <div className="mt-4 space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-freuly-lg border border-freuly-border-default bg-freuly-page p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-freuly-text-primary">{review.author_name}</p>
                        <time className="text-xs text-freuly-text-muted" dateTime={review.created_at}>
                          {new Date(review.created_at).toLocaleDateString(lang === "de" ? "de-DE" : lang === "ru" ? "ru-RU" : "uk-UA", { day: "numeric", month: "short", year: "numeric" })}
                        </time>
                      </div>
                      <div className="mt-1 flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, idx) => (
                          <span key={idx} className={idx < review.rating ? "text-freuly-primary" : "text-freuly-border-default"}>★</span>
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-freuly-text-secondary">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-2 text-center">
                <div className="flex items-center gap-1" aria-label={`rating ${normalizedRating.toFixed(1)} out of 5`}>
                  {Array.from({ length: 5 }, (_, idx) => renderStar(normalizedRating - idx, idx))}
                </div>
                <p className="mt-3 text-sm text-freuly-text-secondary">{sectionText.noReviews}</p>
              </div>
            )}

            <div className="mt-4">
              {reviewMsg ? (
                <p className={`mb-3 text-sm ${reviewMsg.type === "ok" ? "text-freuly-success" : "text-freuly-error"}`}>{reviewMsg.text}</p>
              ) : null}

              {!showReviewForm ? (
                <button
                  type="button"
                  onClick={() => { setShowReviewForm(true); setReviewMsg(null); }}
                  className="mx-auto flex min-h-[37px] items-center justify-center rounded-freuly-md border border-freuly-border-default px-5 py-2 text-sm font-semibold text-freuly-text-primary transition hover:bg-freuly-page"
                >
                  {sectionText.leaveReview}
                </button>
              ) : (
                <div className="space-y-3 rounded-freuly-lg border border-freuly-border-default bg-freuly-page p-4">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-freuly-text-secondary">{sectionText.reviewName}</span>
                    <input
                      value={reviewForm.author_name}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, author_name: e.target.value.slice(0, 100) }))}
                      className={publicFieldClass}
                    />
                  </label>
                  <div className="space-y-1 text-sm">
                    <span className="font-medium text-freuly-text-secondary">{sectionText.reviewRating}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReviewForm((prev) => ({ ...prev, rating: idx + 1 }))}
                          className={`text-2xl transition ${idx < reviewForm.rating ? "text-freuly-primary" : "text-freuly-border-default"} hover:text-freuly-primary`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-freuly-text-secondary">{sectionText.reviewComment}</span>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value.slice(0, 1000) }))}
                      rows={3}
                      className={publicFieldClass}
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
                      className="inline-flex h-9 items-center justify-center rounded-freuly-md bg-freuly-primary px-4 text-sm font-semibold text-freuly-text-on-primary transition hover:bg-freuly-primary-hover disabled:opacity-60"
                    >
                      {reviewSubmitting ? "..." : sectionText.reviewSubmit}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowReviewForm(false); setReviewMsg(null); }}
                      className="text-sm text-freuly-text-muted hover:text-freuly-text-secondary"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {showLocationSection ? (
            <SectionCard title={sectionText.locationSectionTitle}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  {publicLocationLabel ? (
                    <p className="text-base font-bold text-freuly-text-primary">{publicLocationLabel}</p>
                  ) : null}
                  {showPhysicalAddress ? (
                    <p className="text-sm text-freuly-text-secondary">{specialist.address}</p>
                  ) : null}
                </div>
                {destination ? (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 w-full items-center justify-center rounded-freuly-md border border-freuly-border-default px-4 text-[13px] font-semibold text-freuly-text-primary transition hover:bg-freuly-page sm:w-auto"
                  >
                    {t(dict, "specialistPage.buildRoute")}
                  </a>
                ) : null}
              </div>
              {mapCoords ? (
                <div className="mt-6 overflow-hidden rounded-freuly-lg">
                  <iframe
                    title={t(dict, "specialistPage.mapEmbedTitle")}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.01},${mapCoords.lat - 0.007},${mapCoords.lon + 0.01},${mapCoords.lat + 0.007}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`}
                    width="100%"
                    height="280"
                    className="h-40 w-full border-0 md:h-[280px]"
                    loading="lazy"
                  />
                </div>
              ) : null}
            </SectionCard>
          ) : null}

          </main>

          <aside className="order-2 md:sticky md:top-6 md:col-start-2 md:row-start-1 md:self-start">
            {requestFormCard}
            <InstallFreuly
              key={leadSuccessMessage ? "lead_success" : "specialist_profile"}
              lang={lang}
              audience="client"
              placement={leadSuccessMessage ? "lead_success" : "specialist_profile"}
              variant="compact"
              className="mt-4"
            />
          </aside>

          {utilityRow ? (
            <div className="order-3 md:col-start-1 md:row-start-2">{utilityRow}</div>
          ) : null}
        </div>
      </div>

      <SpecialistDocumentsLightbox
        urls={certificateUrls}
        activeIndex={documentLightboxIndex}
        onClose={() => setDocumentLightboxIndex(null)}
        onGoPrev={goPrevDocument}
        onGoNext={goNextDocument}
        ariaLabel={sectionText.certificatesTitle}
      />

      <SpecialistDocumentsLightbox
        urls={portfolioImages}
        activeIndex={galleryLightboxIndex}
        onClose={() => setGalleryLightboxIndex(null)}
        onGoPrev={() => {
          if (portfolioImages.length === 0) return;
          setGalleryLightboxIndex((prev) => {
            if (prev === null) return null;
            return (prev - 1 + portfolioImages.length) % portfolioImages.length;
          });
        }}
        onGoNext={() => {
          if (portfolioImages.length === 0) return;
          setGalleryLightboxIndex((prev) => {
            if (prev === null) return null;
            return (prev + 1) % portfolioImages.length;
          });
        }}
        ariaLabel={sectionText.topGalleryTitle}
      />

      <MobileStickyCTA
        onClick={() => {
          setLeadSuccessMessage(null);
          setShowForm(true);
          scrollToLeadForm();
        }}
        label={t(dict, "specialist.sendRequest")}
        isHidden={formInView || !showForm}
      />
    </div>
  );
}
