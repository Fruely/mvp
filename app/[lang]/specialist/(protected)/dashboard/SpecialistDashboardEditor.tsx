"use client";

import { useMemo, useState, useCallback, useRef, useEffect, type ChangeEvent } from "react";
import Link from "next/link";
import { t, type Dictionary } from "@/lib/i18n";
import SupportBlock from "@/components/support/SupportBlock";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { isPublicationReadyForDashboard } from "@/lib/dashboard/publicationReadiness";
import { hasValidServiceForPublish } from "@/lib/dashboard/publicationValidator";
import {
  GERMANY_COUNTRY_CODE,
  PUBLIC_SERVICE_RADII_KM,
  isAllowedServiceRadiusKm,
  normalizeCountryCode,
  normalizePostalCode,
} from "@/lib/specialists/geography";
import SpecialistAvatarImage from "@/components/specialist/SpecialistAvatarImage";
import HomepagePhotoCropEditor from "@/components/specialist/HomepagePhotoCropEditor";
import { canAddGalleryImage } from "@/lib/billing/planEntitlements";
import { Alert, Badge, Button, Card } from "@/components/ui";
import {
  dashboardCheckboxClass,
  dashboardFieldClass,
  dashboardFieldLabelWrapClass,
  dashboardHelperClass,
  dashboardLabelClass,
  dashboardLinkPrimaryClass,
  dashboardReadinessHighlightClass,
  dashboardUploadButtonClass,
} from "@/components/dashboard/dashboardStyles";

type ServiceInput = {
  id?: string;
  title: string;
  price_from: string;
  is_active: boolean;
  price_comment?: string;
  pricing_exception?: string | null;
  pricing_type?: string;
  price_to?: string | number | null;
};

type Props = {
  dict: Dictionary;
  lang: string;
  galleryLimit: number;
  effectivePaidPlan: "basic" | "premium" | null;
  telegramConnected: boolean;
  telegramConnectHref: string | null;
  initialData: {
    name: string;
    email: string;
    phone: string;
    category_id: string;
    work_format: "online" | "offline" | "hybrid";
    languages: string[];
    about_me: string;
    video_url: string;
    postal_code: string;
    country_code: string;
    mobile_service: boolean;
    service_radius_km: string;
    city: string;
    lat: number | null;
    lng: number | null;
    address: string;
    photo_url: string;
    gallery_urls: string[];
    certificate_urls: string[];
    services: ServiceInput[];
  };
  initialStatus: string;
  specialistId: string;
  homepagePhoto: {
    photo_source_url: string | null;
    homepage_photo_url: string | null;
    homepage_photo: unknown;
  };
  categories: Array<{
    id: string;
    title: string;
    title_ru?: string | null;
    title_de?: string | null;
    title_ua?: string | null;
    parent_id: string | null;
    slug: string;
  }>;
};

const MAX_DOCUMENT_IMAGES = 10;

/** Targets for readiness checklist jump-to-section (ids on form blocks below). */
const READINESS_SECTION_ID: Record<string, string> = {
  name: "dashboard-section-name",
  category: "dashboard-section-category",
  languages: "dashboard-section-languages",
  work_format: "dashboard-section-work-format",
  country: "dashboard-section-plz",
  plz: "dashboard-section-plz",
  city: "dashboard-section-plz",
  service_radius: "dashboard-section-service-radius",
  service: "dashboard-services-section",
};

/** How long the jump-target section stays visually highlighted after scroll. */
const READINESS_HIGHLIGHT_MS = 2800;

const READINESS_JUMP_HIGHLIGHT_CLASS = dashboardReadinessHighlightClass;

function focusFirstInteractive(container: HTMLElement) {
  const selector = [
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
  ].join(", ");
  const el = container.querySelector<HTMLElement>(selector);
  if (el) el.focus({ preventScroll: true });
}

function hasValidService(services: ServiceInput[]): boolean {
  return hasValidServiceForPublish(services);
}

export default function SpecialistDashboardEditor({
  dict,
  lang,
  galleryLimit,
  effectivePaidPlan,
  initialData,
  initialStatus,
  specialistId,
  homepagePhoto,
  categories,
  telegramConnected,
  telegramConnectHref,
}: Props) {
  const filteredCategories = categories.filter(
    (cat) => cat.parent_id !== null || cat.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG
  );
  const [form, _setFormRaw] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const highlightClearTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightClearTimeoutRef.current) clearTimeout(highlightClearTimeoutRef.current);
    };
  }, []);

  // DB null country must not look publish-ready until DE is persisted.
  useEffect(() => {
    if (normalizeCountryCode(initialData.country_code) === GERMANY_COUNTRY_CODE) return;
    _setFormRaw((prev) => ({ ...prev, country_code: GERMANY_COUNTRY_CODE }));
    setIsDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only remount for missing country
  }, []);

  const setForm = useCallback(
    (updater: Props["initialData"] | ((prev: Props["initialData"]) => Props["initialData"])) => {
      _setFormRaw(updater);
      setIsDirty(true);
      setSuccess(null);
    },
    [],
  );

  /**
   * Preview city/coords from the same server resolver as save (resolveGermanPostalLocation).
   * Changing PLZ clears stale city/coordinates until a successful resolve.
   */
  useEffect(() => {
    const postalCode = normalizePostalCode(form.postal_code);
    if (!postalCode) return;

    // Already resolved for this PLZ — keep selection.
    if (
      form.city.trim() &&
      typeof form.lat === "number" &&
      typeof form.lng === "number" &&
      form.country_code === GERMANY_COUNTRY_CODE
    ) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/specialist/resolve-postal?postal_code=${encodeURIComponent(postalCode)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          location?: { city?: string; lat?: number; lng?: number };
          candidates?: Array<{ city?: string; lat?: number; lng?: number }>;
        } | null;
        if (cancelled || !res.ok || !json?.ok) {
          if (!cancelled) {
            _setFormRaw((prev) => {
              if (normalizePostalCode(prev.postal_code) !== postalCode) return prev;
              return { ...prev, city: "", lat: null, lng: null };
            });
          }
          return;
        }
        const candidates =
          Array.isArray(json.candidates) && json.candidates.length > 0
            ? json.candidates.filter(
                (c): c is { city: string; lat: number; lng: number } =>
                  typeof c.city === "string" &&
                  typeof c.lat === "number" &&
                  typeof c.lng === "number"
              )
            : json.location?.city &&
                typeof json.location.lat === "number" &&
                typeof json.location.lng === "number"
              ? [
                  {
                    city: json.location.city,
                    lat: json.location.lat,
                    lng: json.location.lng,
                  },
                ]
              : [];
        const selected = candidates[0];
        if (!selected) {
          _setFormRaw((prev) => {
            if (normalizePostalCode(prev.postal_code) !== postalCode) return prev;
            return { ...prev, city: "", lat: null, lng: null };
          });
          return;
        }
        _setFormRaw((prev) => {
          if (normalizePostalCode(prev.postal_code) !== postalCode) return prev;
          if (
            prev.city === selected.city &&
            prev.lat === selected.lat &&
            prev.lng === selected.lng &&
            prev.country_code === GERMANY_COUNTRY_CODE
          ) {
            return prev;
          }
          return {
            ...prev,
            city: selected.city,
            lat: selected.lat,
            lng: selected.lng,
            country_code: GERMANY_COUNTRY_CODE,
          };
        });
      } catch {
        // Preview failure must not block editing; save/publish enforce geo.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [form.postal_code, form.city, form.lat, form.lng, form.country_code]);

  /** All formats require DE + PLZ + city + coords. Radius only for offline/hybrid. */
  const needsLocationGeo = true;
  const needsServiceRadius =
    form.work_format === "offline" || form.work_format === "hybrid";
  const hasValidServiceFlag = useMemo(
    () => hasValidService(form.services),
    [form.services]
  );

  /** Mirrors server publish minimum in `app/api/specialist/dashboard/publish/route.ts` (no extra client-only gates). */
  const hasWorkFormat =
    form.work_format === "online" ||
    form.work_format === "offline" ||
    form.work_format === "hybrid";
  const selectedCategory = categories.find((category) => category.id === form.category_id);
  const categoryParentId = selectedCategory?.parent_id ?? null;
  const isUncategorizedCategory =
    selectedCategory?.slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
  const hasPublishableCategory = Boolean(
    form.category_id.trim() && categoryParentId != null && !isUncategorizedCategory
  );

  const publicationReady = useMemo(() => {
    return isPublicationReadyForDashboard({
      name: form.name,
      categoryId: form.category_id,
      categoryParentId,
      categorySlug: selectedCategory?.slug ?? null,
      languages: form.languages,
      workFormat: form.work_format,
      countryCode: form.country_code,
      postalCode: form.postal_code,
      city: form.city,
      lat: form.lat,
      lng: form.lng,
      serviceRadiusKm: form.service_radius_km,
      servicesInSelectedCategory: form.services.map((service) => ({
        title: service.title,
        price_from: service.price_from,
        price_to: service.price_to,
        pricing_type: service.pricing_type,
        price_comment: service.price_comment,
        pricing_exception: service.pricing_exception,
        is_active: service.is_active,
      })),
    });
  }, [
    categoryParentId,
    form.category_id,
    form.city,
    form.country_code,
    form.languages,
    form.lat,
    form.lng,
    form.name,
    form.postal_code,
    form.service_radius_km,
    form.services,
    form.work_format,
    selectedCategory?.slug,
  ]);

  const hasAllowlistedServiceRadius = useMemo(() => {
    const n = Number(String(form.service_radius_km).trim());
    return isAllowedServiceRadiusKm(n);
  }, [form.service_radius_km]);

  const radiusSelectOptions = useMemo(() => {
    const current = Number(String(form.service_radius_km).trim());
    const options = [...PUBLIC_SERVICE_RADII_KM] as number[];
    if (Number.isFinite(current) && isAllowedServiceRadiusKm(current) && !options.includes(current)) {
      options.unshift(current);
    }
    return options;
  }, [form.service_radius_km]);

  /** Checklist items mirror the same publish minimum; order matches form sections. */
  const readinessItems = useMemo(() => {
    const items: Array<{ key: string; label: string; done: boolean }> = [
      { key: "name", label: t(dict, "dashboard.fields.name"), done: Boolean(form.name.trim()) },
      {
        key: "category",
        label: t(dict, "dashboard.fields.category"),
        done: hasPublishableCategory,
      },
      {
        key: "languages",
        label: t(dict, "dashboard.fields.languages"),
        done: form.languages.length > 0,
      },
      {
        key: "work_format",
        label: t(dict, "dashboard.fields.format"),
        done: hasWorkFormat,
      },
    ];
    if (needsLocationGeo) {
      items.push({
        key: "country",
        label: t(dict, "dashboard.fields.country"),
        done: (form.country_code || "").toUpperCase() === GERMANY_COUNTRY_CODE,
      });
      items.push({
        key: "plz",
        label: t(dict, "dashboard.fields.plz"),
        done: Boolean(normalizePostalCode(form.postal_code)),
      });
      items.push({
        key: "city",
        label: t(dict, "dashboard.fields.city"),
        done:
          Boolean(form.city.trim()) &&
          typeof form.lat === "number" &&
          typeof form.lng === "number",
      });
    }
    if (needsServiceRadius) {
      items.push({
        key: "service_radius",
        label: t(dict, "dashboard.fields.serviceRadius"),
        done: hasAllowlistedServiceRadius,
      });
    }
    items.push({
      key: "service",
      label: t(dict, "dashboard.readiness.service"),
      done: hasValidServiceFlag,
    });
    return items;
  }, [
    dict,
    form,
    needsLocationGeo,
    needsServiceRadius,
    hasWorkFormat,
    hasValidServiceFlag,
    hasPublishableCategory,
    hasAllowlistedServiceRadius,
  ]);

  const readinessDoneCount = readinessItems.filter((item) => item.done).length;
  const readinessTotalCount = readinessItems.length;
  const readinessSummary = t(dict, "dashboard.readiness.summary")
    .replace("{{done}}", String(readinessDoneCount))
    .replace("{{total}}", String(readinessTotalCount));

  const jumpToReadinessSection = useCallback((key: string) => {
    const id = READINESS_SECTION_ID[key];
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;

    if (highlightClearTimeoutRef.current) {
      clearTimeout(highlightClearTimeoutRef.current);
      highlightClearTimeoutRef.current = null;
    }
    setHighlightedSectionId(id);

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => focusFirstInteractive(el), 400);

    highlightClearTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSectionId(null);
      highlightClearTimeoutRef.current = null;
    }, READINESS_HIGHLIGHT_MS);
  }, []);

  const activeServicesCount = form.services.filter((service) => service.is_active).length;
  const servicesHref = `/${lang}/specialist/dashboard/services`;

  const publishDisabledHint = useMemo(() => {
    if (publishing) return null;
    if (isDirty) return t(dict, "dashboard.messages.saveFirst");
    if (isUncategorizedCategory) return t(dict, "dashboard.messages.publishHintUncategorized");
    if (form.category_id.trim() && categoryParentId == null) {
      return t(dict, "dashboard.messages.publishHintNeedSubcategory");
    }
    if (!form.languages.length) return t(dict, "dashboard.application.errors.languagesRequired");
    if (!hasWorkFormat) return t(dict, "dashboard.messages.fillRequired");
    if (!hasValidServiceFlag) return t(dict, "dashboard.servicesSection.visibilityWarning");
    if (!publicationReady) return t(dict, "dashboard.messages.fillRequired");
    return null;
  }, [
    dict,
    publishing,
    isDirty,
    isUncategorizedCategory,
    form.category_id,
    categoryParentId,
    form.languages.length,
    hasWorkFormat,
    hasValidServiceFlag,
    publicationReady,
  ]);

  const publishDisabled = publishing || isDirty || !publicationReady;

  async function uploadSingleImage(endpoint: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || typeof json.url !== "string") {
      if (json && typeof json === "object" && json.error === "gallery_limit_reached") {
        throw new Error(
          t(dict, "dashboard.messages.galleryLimit").replace(
            "{{limit}}",
            String(typeof json.limit === "number" ? json.limit : galleryLimit),
          ),
        );
      }
      throw new Error(typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.uploadFailed"));
    }
    return json.url;
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    setAvatarSuccess(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/specialist/avatar/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        url?: unknown;
        avatar_url?: unknown;
        error?: unknown;
      };
      const uploadedUrl =
        typeof json.avatar_url === "string"
          ? json.avatar_url
          : typeof json.url === "string"
            ? json.url
            : null;
      if (!res.ok || !uploadedUrl) {
        throw new Error(typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.avatarFailed"));
      }
      setForm((prev) => ({ ...prev, photo_url: uploadedUrl }));
      setAvatarSuccess(t(dict, "dashboard.messages.avatarUploaded"));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t(dict, "dashboard.messages.avatarFailed"));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!canAddGalleryImage(form.gallery_urls.length, galleryLimit)) {
      setError(t(dict, "dashboard.messages.galleryLimit").replace("{{limit}}", String(galleryLimit)));
      return;
    }
    setGalleryUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadSingleImage("/api/specialist/gallery/upload", file);
      setForm((prev) => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, url],
      }));
      setSuccess(t(dict, "dashboard.messages.galleryAdded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(dict, "dashboard.messages.uploadFailed"));
    } finally {
      setGalleryUploading(false);
    }
  }

  async function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type.startsWith("video/")) {
      setError(t(dict, "dashboard.documents.videoNotAllowed"));
      return;
    }
    if (form.certificate_urls.length >= MAX_DOCUMENT_IMAGES) {
      setError(t(dict, "dashboard.messages.documentsLimit"));
      return;
    }
    setDocumentsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadSingleImage("/api/specialist/documents/upload", file);
      setForm((prev) => ({
        ...prev,
        certificate_urls: [...prev.certificate_urls, url].slice(0, MAX_DOCUMENT_IMAGES),
      }));
      setSuccess(t(dict, "dashboard.messages.documentsAdded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(dict, "dashboard.messages.uploadFailed"));
    } finally {
      setDocumentsUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        category_id: form.category_id || null,
        video_url: form.video_url.trim(),
        country_code: "DE",
        postal_code: form.postal_code,
        mobile_service: form.mobile_service,
        service_radius_km:
          form.work_format === "offline" || form.work_format === "hybrid"
            ? form.service_radius_km
            : "",
        languages: form.languages.map((lang) => lang.trim()).filter(Boolean),
        gallery_urls: form.gallery_urls.map((url) => url.trim()).filter(Boolean),
        certificate_urls: form.certificate_urls.map((url) => url.trim()).filter(Boolean),
        lang,
      };
      delete payload.services;

      const res = await fetch("/api/specialist/dashboard/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
        geography?: {
          postal_code?: string | null;
          country_code?: string | null;
          city?: string | null;
          lat?: number | null;
          lng?: number | null;
        };
      };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.saveFailed"));
        return;
      }
      if (json.geography) {
        _setFormRaw((prev) => ({
          ...prev,
          postal_code:
            typeof json.geography?.postal_code === "string"
              ? json.geography.postal_code
              : prev.postal_code,
          country_code:
            typeof json.geography?.country_code === "string"
              ? json.geography.country_code
              : prev.country_code,
          city:
            typeof json.geography?.city === "string"
              ? json.geography.city
              : json.geography?.city === null
                ? ""
                : prev.city,
          lat:
            typeof json.geography?.lat === "number"
              ? json.geography.lat
              : json.geography?.lat === null
                ? null
                : prev.lat,
          lng:
            typeof json.geography?.lng === "number"
              ? json.geography.lng
              : json.geography?.lng === null
                ? null
                : prev.lng,
        }));
      }
      setIsDirty(false);
      setSuccess(
        json.warning === "geocode_failed"
          ? t(dict, "dashboard.messages.publication_coordinates_required")
          : t(dict, "dashboard.messages.saved")
      );
    } catch {
      setError(t(dict, "dashboard.messages.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (isDirty) {
      setError(t(dict, "dashboard.messages.saveFirst"));
      setSuccess(null);
      return;
    }
    if (!publicationReady) {
      const missing: string[] = [];
      if (!form.name.trim()) missing.push(t(dict, "dashboard.fields.name"));
      if (!form.category_id.trim()) {
        missing.push(t(dict, "dashboard.fields.category"));
      } else if (isUncategorizedCategory) {
        missing.push(t(dict, "dashboard.messages.publishHintUncategorized"));
      } else if (categoryParentId == null) {
        missing.push(t(dict, "dashboard.messages.publishHintNeedSubcategory"));
      }
      if (!form.languages.length) missing.push(t(dict, "dashboard.fields.languages"));
      if (!hasWorkFormat) missing.push(t(dict, "dashboard.fields.format"));
      if (needsLocationGeo && !/^\d{5}$/.test(form.postal_code.trim())) {
        missing.push(
          form.work_format === "online"
            ? t(dict, "dashboard.messages.publication_online_geo_required")
            : t(dict, "dashboard.messages.publication_postal_code_required")
        );
      }
      if (needsServiceRadius && !hasAllowlistedServiceRadius) {
        missing.push(t(dict, "dashboard.messages.publication_service_radius_required"));
      }
      if (
        needsLocationGeo &&
        (!form.city.trim() || form.lat == null || form.lng == null)
      ) {
        missing.push(
          form.work_format === "online"
            ? t(dict, "dashboard.messages.publication_online_geo_required")
            : t(dict, "dashboard.messages.publication_city_required")
        );
      }
      if (!hasValidServiceFlag) {
        missing.push(t(dict, "dashboard.messages.publishNeedsServiceAndPricePositive"));
      }
      setError(missing.length ? `${t(dict, "dashboard.messages.fillRequired")}: ${missing.join(", ")}` : t(dict, "dashboard.messages.fillRequired"));
      setSuccess(null);
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/specialist/dashboard/publish", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fields = Array.isArray(json.fields) ? json.fields.join(", ") : "";
        const msg = typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.publishFailed");
        setError(fields ? `${msg}: ${fields}` : msg);
        return;
      }
      if (typeof json.status === "string") setStatus(json.status);
      setSuccess(t(dict, "dashboard.messages.published"));
    } catch {
      setError(t(dict, "dashboard.messages.publishFailed"));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <Card padding="lg" className="shadow-none">
      <Alert variant="info" className="mb-freuly-5">
        {t(dict, "dashboard.introBanner")}
      </Alert>

      <Alert
        variant={publicationReady ? "success" : "warning"}
        className="mb-freuly-5"
        aria-label={t(dict, "dashboard.readiness.title")}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-medium text-freuly-text-primary">
            {publicationReady
              ? t(dict, "dashboard.readiness.allReady")
              : t(dict, "dashboard.readiness.title")}
          </p>
          <p className="text-xs text-freuly-text-muted">{readinessSummary}</p>
        </div>
        <ul className="mt-freuly-2 grid gap-1 sm:grid-cols-2">
          {readinessItems.map((item) => (
            <li key={item.key} className="text-sm">
              <button
                type="button"
                onClick={() => jumpToReadinessSection(item.key)}
                className={`freuly-focus-ring flex w-full items-start gap-2 rounded-freuly-md px-1 py-0.5 text-left transition ${
                  item.done
                    ? "text-freuly-text-secondary hover:bg-freuly-border-subtle/80"
                    : "cursor-pointer text-freuly-text-primary hover:bg-freuly-warning-light/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold leading-none ${
                    item.done
                      ? "bg-freuly-success text-freuly-text-on-primary"
                      : "border border-freuly-warning bg-freuly-surface text-freuly-warning"
                  }`}
                >
                  {item.done ? "✓" : "•"}
                </span>
                <span
                  className={
                    item.done
                      ? "text-freuly-text-secondary line-through decoration-freuly-success/60"
                      : "font-medium text-freuly-text-primary"
                  }
                >
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Alert>

      <div className="mb-freuly-5 flex flex-wrap items-start justify-between gap-freuly-4">
        <div>
          <h1 className="text-freuly-page-title text-freuly-text-primary">{t(dict, "dashboard.profilePageTitle")}</h1>
          <p className="mt-1 text-freuly-body text-freuly-text-secondary">
            {t(dict, "dashboard.profileStatusIntro")} <span className="font-medium">{status}</span>
            {t(dict, "dashboard.profileStatusOutro")}
          </p>
        </div>
        {(telegramConnected || telegramConnectHref) && (
          <div className="flex flex-shrink-0 flex-col items-end gap-2 sm:items-end">
            {telegramConnected ? (
              <Badge variant="success" className="px-freuly-3 py-freuly-2 text-freuly-body-sm">
                {t(dict, "dashboard.telegram.connected")}
              </Badge>
            ) : telegramConnectHref ? (
              <a href={telegramConnectHref} target="_blank" rel="noopener noreferrer" className={dashboardLinkPrimaryClass}>
                {t(dict, "dashboard.telegram.connect")}
              </a>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div
            id={READINESS_SECTION_ID.name}
            className={`scroll-mt-6 ${highlightedSectionId === READINESS_SECTION_ID.name ? READINESS_JUMP_HIGHLIGHT_CLASS : ""}`}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.name")}</span>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.phone")}</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
            />
          </label>
          <div
            id={READINESS_SECTION_ID.category}
            className={`scroll-mt-6 ${highlightedSectionId === READINESS_SECTION_ID.category ? READINESS_JUMP_HIGHLIGHT_CLASS : ""}`}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.category")}</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
              >
                <option value="">{t(dict, "dashboard.categoryPlaceholder")}</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getCategoryTitle(category, toCategoryTitleLang(lang))}
                  </option>
                ))}
              </select>
              {isUncategorizedCategory ? (
                <p className="rounded-freuly-md border border-freuly-warning-border bg-freuly-warning-light px-freuly-3 py-freuly-2 text-xs font-medium leading-relaxed text-freuly-warning">
                  {t(dict, "dashboard.readiness.uncategorizedHint")}
                </p>
              ) : null}
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.email")}</span>
            <input
              value={form.email}
              readOnly
              className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-border-subtle px-3 py-2 text-freuly-text-secondary"
            />
          </label>
          <div
            id={READINESS_SECTION_ID.plz}
            className={`scroll-mt-6 ${highlightedSectionId === READINESS_SECTION_ID.plz ? READINESS_JUMP_HIGHLIGHT_CLASS : ""}`}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-freuly-text-primary">
                {t(dict, "dashboard.fields.plzLabel")} {needsLocationGeo && <span className="text-freuly-error">*</span>}
              </span>
              <input
                value={form.postal_code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                  setForm((prev) => ({
                    ...prev,
                    postal_code: v,
                    city: "",
                    lat: null,
                    lng: null,
                  }));
                }}
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                placeholder={t(dict, "dashboard.fields.plzPlaceholder")}
                className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
              />
              {needsLocationGeo && (
                <p className="text-xs text-freuly-text-muted">
                  {form.work_format === "online"
                    ? t(dict, "dashboard.messages.publication_online_geo_required")
                    : t(dict, "dashboard.fields.plzHint")}
                </p>
              )}
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">
              {t(dict, "dashboard.fields.city")} {needsLocationGeo && <span className="text-freuly-error">*</span>}
            </span>
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder={t(dict, "dashboard.fields.cityPlaceholder")}
              disabled={form.postal_code.length === 5}
              readOnly={form.postal_code.length === 5}
              className={`w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring ${
                form.postal_code.length === 5 ? "bg-freuly-border-subtle text-freuly-text-secondary" : ""
              }`}
            />
            <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.fields.cityFromPlzHint")}</p>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.address")}</span>
            <input
              value={form.address || ""}
              placeholder={t(dict, "dashboard.fields.addressPlaceholder")}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
            />
            <p className="text-xs text-freuly-text-secondary font-medium">{t(dict, "dashboard.fields.addressHint")}</p>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.country")}</span>
            <select
              value="DE"
              onChange={() => setForm((prev) => ({ ...prev, country_code: "DE" }))}
              className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
            >
              <option value="DE">{t(dict, "dashboard.country.DE")}</option>
            </select>
          </label>
          <div
            id={READINESS_SECTION_ID.work_format}
            className={`scroll-mt-6 ${highlightedSectionId === READINESS_SECTION_ID.work_format ? READINESS_JUMP_HIGHLIGHT_CLASS : ""}`}
          >
            <label className="space-y-1 text-sm">
              <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.format")}</span>
              <select
                value={form.work_format}
                onChange={(e) => setForm((prev) => ({ ...prev, work_format: e.target.value as Props["initialData"]["work_format"] }))}
                className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
              >
                <option value="online">{t(dict, "dashboard.workFormat.online")}</option>
                <option value="offline">{t(dict, "dashboard.workFormat.offline")}</option>
                <option value="hybrid">{t(dict, "dashboard.workFormat.hybrid")}</option>
              </select>
            </label>
          </div>
          {form.work_format !== "online" && (
            <div className="space-y-3 text-sm md:col-span-2">
              <div
                id={READINESS_SECTION_ID.service_radius}
                className={`scroll-mt-6 space-y-1 ${
                  highlightedSectionId === READINESS_SECTION_ID.service_radius
                    ? READINESS_JUMP_HIGHLIGHT_CLASS
                    : ""
                }`}
              >
                <label className="block space-y-1">
                  <span className="font-medium text-freuly-text-primary">
                    {t(dict, "dashboard.fields.serviceRadius")} <span className="text-freuly-error">*</span>
                  </span>
                  <select
                    value={
                      radiusSelectOptions.includes(Number(form.service_radius_km))
                        ? form.service_radius_km
                        : ""
                    }
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, service_radius_km: e.target.value }))
                    }
                    className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
                  >
                    <option value="">{t(dict, "dashboard.fields.serviceRadiusPlaceholder")}</option>
                    {radiusSelectOptions.map((km) => (
                      <option key={km} value={String(km)}>
                        {km} km
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.fields.serviceRadiusHint")}</p>
                </label>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.mobile_service}
                  onChange={(e) => setForm((prev) => ({ ...prev, mobile_service: e.target.checked }))}
                  className="h-4 w-4 rounded border-freuly-border-default text-freuly-primary focus:ring-freuly-primary/25"
                />
                <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.mobileService")}</span>
              </label>
              <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.fields.mobileServiceHint")}</p>
              {form.mobile_service && (
                <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.fields.serviceRadiusMobileHint")}</p>
              )}
            </div>
          )}
          <fieldset
            id={READINESS_SECTION_ID.languages}
            className={`scroll-mt-6 space-y-2 text-sm md:col-span-2 ${
              highlightedSectionId === READINESS_SECTION_ID.languages ? READINESS_JUMP_HIGHLIGHT_CLASS : ""
            }`}
          >
            <legend className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.languages")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(["ru", "uk", "de", "en", "pl"] as const).map((code) => (
                <label key={code} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.languages.includes(code)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        languages: e.target.checked
                          ? [...prev.languages, code]
                          : prev.languages.filter((l) => l !== code),
                      }));
                    }}
                    className="h-4 w-4 rounded border-freuly-border-default text-freuly-primary focus:ring-freuly-primary/25"
                  />
                  <span className="text-freuly-text-primary">{t(dict, `dashboard.lang.${code}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.avatar")}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="w-full max-w-xs shrink-0">
              <SpecialistAvatarImage
                src={form.photo_url}
                alt={t(dict, "dashboard.avatar.alt")}
                loading={avatarUploading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-freuly-md border border-freuly-border-default px-3 py-2 text-sm font-medium text-freuly-text-primary hover:bg-freuly-border-subtle">
                {avatarUploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.uploadPhoto")}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </label>
              {avatarError ? (
                <p className="text-sm font-medium text-freuly-error">{avatarError}</p>
              ) : null}
              {avatarSuccess ? (
                <p className="text-sm font-medium text-freuly-success">{avatarSuccess}</p>
              ) : null}
            </div>
          </div>
        </div>

        <HomepagePhotoCropEditor
          dict={dict}
          specialistId={specialistId}
          initialSourceUrl={homepagePhoto.photo_source_url}
          initialHomepagePhotoUrl={homepagePhoto.homepage_photo_url}
          initialMetadata={homepagePhoto.homepage_photo}
          canonicalOrigin={process.env.NEXT_PUBLIC_SUPABASE_URL ?? null}
          previewName={form.name}
          previewCategory={
            selectedCategory
              ? getCategoryTitle(selectedCategory, toCategoryTitleLang(lang)) || ""
              : ""
          }
        />

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.description")}</span>
          <textarea
            value={form.about_me}
            onChange={(e) => setForm((prev) => ({ ...prev, about_me: e.target.value }))}
            className="min-h-[110px] w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.video")}</span>
          <input
            value={form.video_url}
            onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
            placeholder={t(dict, "dashboard.fields.videoPlaceholder")}
            className="w-full rounded-freuly-md border border-freuly-border-default bg-freuly-surface px-freuly-3 py-freuly-2 text-freuly-body text-freuly-text-primary freuly-focus-ring"
          />
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.helpers.video.line1")}</p>
            <ul className="text-xs text-freuly-text-muted list-disc list-inside">
              <li>{t(dict, "dashboard.helpers.video.bullet1")}</li>
              <li>{t(dict, "dashboard.helpers.video.bullet2")}</li>
              <li>{t(dict, "dashboard.helpers.video.bullet3")}</li>
            </ul>
            <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.helpers.video.footer")}</p>
          </div>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.gallery")}</p>
            <p className="text-xs text-freuly-text-muted">
              {t(dict, "dashboard.gallery.usageCounter")
                .replace("{{used}}", String(form.gallery_urls.length))
                .replace("{{limit}}", String(galleryLimit))}
            </p>
          </div>
          {form.gallery_urls.length > galleryLimit ? (
            <p className="text-xs leading-relaxed text-freuly-warning">
              {t(dict, "dashboard.gallery.hiddenByPlan")
                .replace("{{stored}}", String(form.gallery_urls.length))
                .replace("{{visible}}", String(galleryLimit))}
            </p>
          ) : null}
          {effectivePaidPlan === "basic" &&
          form.gallery_urls.length >= galleryLimit &&
          galleryLimit < 15 ? (
            <p className="text-xs text-indigo-700">
              <Link href={`/${lang}/specialist/dashboard/billing?plan=premium`} className="underline-offset-2 hover:underline">
                {t(dict, "dashboard.gallery.upgradeToGrowth")}
              </Link>
            </p>
          ) : null}
          <label className="inline-flex cursor-pointer items-center rounded-freuly-md border border-freuly-border-default px-3 py-2 text-sm font-medium text-freuly-text-primary hover:bg-freuly-border-subtle">
            {galleryUploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.addImage")}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleGalleryUpload}
              disabled={
                galleryUploading || !canAddGalleryImage(form.gallery_urls.length, galleryLimit)
              }
            />
          </label>
          <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.helpers.gallery.line1")}</p>
          <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.helpers.gallery.line2")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery_urls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-freuly-md border border-freuly-border-default">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={t(dict, "dashboard.gallery.imageAlt").replace("{{n}}", String(index + 1))}
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      gallery_urls: prev.gallery_urls.filter((_, i) => i !== index),
                    }))
                  }
                  className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-freuly-text-primary"
                >
                  {t(dict, "dashboard.buttons.delete")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-freuly-md border border-freuly-border-default bg-freuly-border-subtle p-freuly-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-freuly-text-primary">{t(dict, "dashboard.fields.documents")}</p>
            <label className={dashboardUploadButtonClass}>
              {documentsUploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.addDocument")}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleDocumentUpload}
                disabled={documentsUploading || form.certificate_urls.length >= MAX_DOCUMENT_IMAGES}
              />
            </label>
          </div>
          <p className="text-xs text-freuly-text-secondary leading-relaxed">{t(dict, "dashboard.documents.help")}</p>
          <p className="text-xs text-freuly-text-muted">{t(dict, "dashboard.documents.maxNote")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.certificate_urls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative overflow-hidden rounded-freuly-md border border-freuly-border-default bg-white shadow-sm"
              >
                <div className="relative aspect-[3/4] w-full bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={t(dict, "dashboard.documents.imageAlt").replace("{{n}}", String(index + 1))}
                    className="absolute inset-0 h-full w-full object-contain p-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      certificate_urls: prev.certificate_urls.filter((_, i) => i !== index),
                    }))
                  }
                  className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-freuly-text-primary shadow-sm"
                >
                  {t(dict, "dashboard.buttons.delete")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          id={READINESS_SECTION_ID.service}
          className={`scroll-mt-6 rounded-freuly-md border p-freuly-4 transition-all duration-300 ${
            highlightedSectionId === READINESS_SECTION_ID.service
              ? `${READINESS_JUMP_HIGHLIGHT_CLASS} border-freuly-primary/30`
              : !hasValidServiceFlag
                ? "border-freuly-warning-border bg-freuly-warning-light ring-2 ring-freuly-warning/35"
                : "border-freuly-border-default"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-freuly-text-primary">{t(dict, "dashboard.servicesSection.title")}</h2>
              <p className="mt-2 text-sm text-freuly-text-secondary">
                {activeServicesCount > 0
                  ? t(dict, "dashboard.servicesSection.activeSummary").replace(
                      "{{count}}",
                      String(activeServicesCount)
                    )
                  : t(dict, "dashboard.servicesSection.emptySummary")}
              </p>
              {!hasValidServiceFlag && activeServicesCount > 0 ? (
                <p className="mt-1 text-sm font-medium text-freuly-warning">
                  {t(dict, "dashboard.servicesSection.visibilityWarning")}
                </p>
              ) : null}
            </div>
            <Link href={servicesHref} className={dashboardLinkPrimaryClass}>
              {activeServicesCount > 0
                ? t(dict, "dashboard.servicesSection.manageButton")
                : t(dict, "dashboard.servicesSection.addButton")}
            </Link>
          </div>
        </div>

        <Alert variant="warning" title={t(dict, "dashboard.important.title")}>
          {t(dict, "dashboard.important.body")}
        </Alert>

        <div className="space-y-freuly-3">
          <div className="text-freuly-body-sm">
            {error ? <p className="text-freuly-error">{error}</p> : null}
            {isDirty ? (
              <p className="font-medium text-freuly-warning">{t(dict, "dashboard.messages.unsavedChanges")}</p>
            ) : success ? (
              <p className="text-freuly-success">{success}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-freuly-3 sm:flex-row sm:items-start sm:justify-end">
            <Button type="button" onClick={save} disabled={!isDirty || saving} variant="strong">
              {saving ? t(dict, "dashboard.buttons.saving") : t(dict, "dashboard.buttons.save")}
            </Button>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <Button
                type="button"
                onClick={publish}
                disabled={publishDisabled}
                title={publishDisabledHint ?? undefined}
                aria-describedby={publishDisabledHint ? "publish-disabled-hint" : undefined}
              >
                {publishing ? t(dict, "dashboard.buttons.publishing") : t(dict, "dashboard.buttons.publish")}
              </Button>
              {publishDisabledHint ? (
                <p id="publish-disabled-hint" className="max-w-md text-right text-freuly-body-sm font-medium text-freuly-text-secondary">
                  {publishDisabledHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <SupportBlock />
      </div>
    </Card>
  );
}
