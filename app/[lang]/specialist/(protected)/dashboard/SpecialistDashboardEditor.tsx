"use client";

import { useMemo, useState, useCallback, type ChangeEvent } from "react";
import { t, type Dictionary } from "@/lib/i18n";
import SupportBlock from "@/components/support/SupportBlock";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { normalizeLang } from "@/lib/normalizeLang";

type ServiceInput = {
  id?: string;
  title: string;
  price_from: string;
  currency: string;
  is_active: boolean;
  price_comment?: string;
};

type Props = {
  dict: Dictionary;
  lang: string;
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
    address: string;
    photo_url: string;
    gallery_urls: string[];
    certificate_urls: string[];
    services: ServiceInput[];
  };
  initialStatus: string;
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

const MAX_GALLERY_IMAGES = 5;
const MAX_DOCUMENT_IMAGES = 10;

const PRICE_COMMENT_MAX = 50;

const PRICE_COMMENT_PRESETS = [
  "по договорённости",
  "за час",
  "за сессию",
  "за м²",
  "после замеров",
  "после осмотра",
  "оплачивается Jobcenter",
] as const;

const ZERO_PRICE_PRESETS = new Set([
  "по договорённости",
  "после замеров",
  "после осмотра",
  "оплачивается Jobcenter",
]);

const CHIP_COLORS = [
  "bg-blue-50 text-blue-700 hover:bg-blue-100",
  "bg-orange-50 text-orange-700 hover:bg-orange-100",
  "bg-green-50 text-green-700 hover:bg-green-100",
  "bg-purple-50 text-purple-700 hover:bg-purple-100",
  "bg-pink-50 text-pink-700 hover:bg-pink-100",
  "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
];

function sanitizePriceValue(raw: string): string {
  return raw.replace(/\s/g, "").replace(",", ".");
}

function hasValidService(services: ServiceInput[]): boolean {
  return services.some((s) => {
    if (!s.title?.trim()) return false;

    const raw = String(s.price_from ?? "").trim();
    if (!raw) return false;

    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) && n > 0;
  });
}

export default function SpecialistDashboardEditor({
  dict,
  lang,
  initialData,
  initialStatus,
  categories,
  telegramConnected,
  telegramConnectHref,
}: Props) {
  const filteredCategories = categories.filter(
    (cat) => cat.parent_id !== null || cat.slug === "other"
  );
  const [form, _setFormRaw] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [priceErrors, setPriceErrors] = useState<Record<number, string | null>>({});

  const setForm = useCallback(
    (updater: Props["initialData"] | ((prev: Props["initialData"]) => Props["initialData"])) => {
      _setFormRaw(updater);
      setIsDirty(true);
      setSuccess(null);
    },
    [],
  );

  const needsPostalCode = form.work_format !== "online";
  const hasValidServiceFlag = useMemo(
    () => hasValidService(form.services),
    [form.services]
  );

  const publicationReady = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.category_id.trim() &&
        (!needsPostalCode || /^\d{5}$/.test(form.postal_code.trim())) &&
        form.about_me.trim() &&
        form.photo_url.trim() &&
        hasValidServiceFlag
    );
  }, [form, needsPostalCode, hasValidServiceFlag]);

  const noServicesYet = form.services.length === 0;

  const publishDisabledHint = useMemo(() => {
    if (publishing) return null;
    if (isDirty) return t(dict, "dashboard.messages.saveFirst");
    if (!hasValidServiceFlag) return t(dict, "dashboard.servicesSection.visibilityWarning");
    if (!publicationReady) return t(dict, "dashboard.messages.fillRequired");
    return null;
  }, [dict, publishing, isDirty, hasValidServiceFlag, publicationReady]);

  const publishDisabled = publishing || isDirty || !publicationReady;

  function sanitizePrice(raw: string): string {
    return sanitizePriceValue(raw);
  }

  function validatePrice(value: string): string | null {
    if (value === "") return null;
    const sanitized = sanitizePrice(value);
    if (!/^\d+(\.\d+)?$/.test(sanitized)) {
      return t(dict, "dashboard.messages.priceDigitsOnly");
    }
    return null;
  }

  function updateService(index: number, patch: Partial<ServiceInput>) {
    if (patch.price_from !== undefined) {
      setPriceErrors((prev) => ({ ...prev, [index]: validatePrice(patch.price_from!) }));
    }
    setForm((prev) => {
      const next = [...prev.services];
      next[index] = { ...next[index], ...patch };
      return { ...prev, services: next };
    });
  }

  function addService() {
    setForm((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        { title: "", price_from: "", currency: "EUR", is_active: true, price_comment: "" },
      ],
    }));
  }

  function removeService(index: number) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }

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
      throw new Error(typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.uploadFailed"));
    }
    return json.url;
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadSingleImage("/api/specialist/avatar/upload", file);
      setForm((prev) => ({ ...prev, photo_url: url }));
      setSuccess(t(dict, "dashboard.messages.avatarUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t(dict, "dashboard.messages.avatarFailed"));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (form.gallery_urls.length >= MAX_GALLERY_IMAGES) {
      setError(t(dict, "dashboard.messages.galleryLimit"));
      return;
    }
    setGalleryUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadSingleImage("/api/specialist/gallery/upload", file);
      setForm((prev) => ({
        ...prev,
        gallery_urls: [...prev.gallery_urls, url].slice(0, MAX_GALLERY_IMAGES),
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
      for (const service of form.services) {
        if (!service.title?.trim()) continue;
        const pf = Number(
          String(service.price_from ?? "").replace(/\s/g, "").replace(",", ".")
        );
        if (Number.isFinite(pf) && pf === 0 && !String(service.price_comment ?? "").trim()) {
          setError(t(dict, "dashboard.messages.priceZeroNeedsComment"));
          return;
        }
      }

      const payload = {
        ...form,
        category_id: form.category_id || null,
        video_url: form.video_url.trim(),
        mobile_service: form.mobile_service,
        service_radius_km: form.mobile_service ? form.service_radius_km : "",
        languages: form.languages.map((lang) => lang.trim()).filter(Boolean),
        gallery_urls: form.gallery_urls.map((url) => url.trim()).filter(Boolean),
        certificate_urls: form.certificate_urls.map((url) => url.trim()).filter(Boolean),
        services: form.services
          .map((service) => ({
            id: service.id,
            title: service.title.trim(),
            price_from: sanitizePrice(service.price_from.trim()),
            currency: (service.currency || "EUR").trim().toUpperCase(),
            is_active: service.is_active,
            price_comment: service.price_comment?.slice(0, PRICE_COMMENT_MAX) ?? "",
          }))
          .filter((service) => service.title.length > 0),
      };

      const res = await fetch("/api/specialist/dashboard/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : t(dict, "dashboard.messages.saveFailed"));
        return;
      }
      setIsDirty(false);
      setSuccess(t(dict, "dashboard.messages.saved"));
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
      if (!form.category_id.trim()) missing.push(t(dict, "dashboard.fields.category"));
      if (needsPostalCode && !/^\d{5}$/.test(form.postal_code.trim())) missing.push(t(dict, "dashboard.fields.plz"));
      if (!form.about_me.trim()) missing.push(t(dict, "dashboard.fields.aboutMe"));
      if (!form.photo_url.trim()) missing.push(t(dict, "dashboard.fields.photo"));
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
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {t(dict, "dashboard.introBanner")}
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t(dict, "dashboard.profilePageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t(dict, "dashboard.profileStatusIntro")} <span className="font-medium">{status}</span>
            {t(dict, "dashboard.profileStatusOutro")}
          </p>
        </div>
        {(telegramConnected || telegramConnectHref) && (
          <div className="flex flex-shrink-0 flex-col items-end gap-2 sm:items-end">
            {telegramConnected ? (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                {t(dict, "dashboard.telegram.connected")}
              </span>
            ) : telegramConnectHref ? (
              <a
                href={telegramConnectHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                {t(dict, "dashboard.telegram.connect")}
              </a>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.name")}</span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.phone")}</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.category")}</span>
            <select
              value={form.category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="">{t(dict, "dashboard.categoryPlaceholder")}</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryTitle(category, normalizeLang(lang))}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.email")}</span>
            <input
              value={form.email}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">
              {t(dict, "dashboard.fields.plzLabel")} {needsPostalCode && <span className="text-red-500">*</span>}
            </span>
            <input
              value={form.postal_code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                setForm((prev) => ({ ...prev, postal_code: v }));
              }}
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder={t(dict, "dashboard.fields.plzPlaceholder")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            {needsPostalCode && <p className="text-xs text-gray-500">{t(dict, "dashboard.fields.plzHint")}</p>}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.city")}</span>
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder={t(dict, "dashboard.fields.cityPlaceholder")}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.address")}</span>
            <input
              value={form.address || ""}
              placeholder={t(dict, "dashboard.fields.addressPlaceholder")}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            <p className="text-xs text-gray-600 font-medium">{t(dict, "dashboard.fields.addressHint")}</p>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.country")}</span>
            <select
              value={form.country_code}
              onChange={(e) => setForm((prev) => ({ ...prev, country_code: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="DE">{t(dict, "dashboard.country.DE")}</option>
              <option value="GR">{t(dict, "dashboard.country.GR")}</option>
              <option value="IT">{t(dict, "dashboard.country.IT")}</option>
              <option value="PL">{t(dict, "dashboard.country.PL")}</option>
              <option value="XX">{t(dict, "dashboard.country.XX")}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.format")}</span>
            <select
              value={form.work_format}
              onChange={(e) => setForm((prev) => ({ ...prev, work_format: e.target.value as Props["initialData"]["work_format"] }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="online">{t(dict, "dashboard.workFormat.online")}</option>
              <option value="offline">{t(dict, "dashboard.workFormat.offline")}</option>
              <option value="hybrid">{t(dict, "dashboard.workFormat.hybrid")}</option>
            </select>
          </label>
          {form.work_format !== "online" && (
            <div className="space-y-2 text-sm md:col-span-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.mobile_service}
                  onChange={(e) => setForm((prev) => ({ ...prev, mobile_service: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.mobileService")}</span>
              </label>
              <p className="text-xs text-gray-500">{t(dict, "dashboard.fields.mobileServiceHint")}</p>
              {form.mobile_service && (
                <label className="block space-y-1">
                  <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.serviceRadius")}</span>
                  <input
                    value={form.service_radius_km}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                      setForm((prev) => ({ ...prev, service_radius_km: v }));
                    }}
                    type="number"
                    min="1"
                    max="500"
                    inputMode="numeric"
                    placeholder={t(dict, "dashboard.fields.serviceRadiusPlaceholder")}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2"
                  />
                  <p className="text-xs text-gray-500">{t(dict, "dashboard.fields.serviceRadiusHint")}</p>
                </label>
              )}
            </div>
          )}
          <fieldset className="space-y-2 text-sm md:col-span-2">
            <legend className="font-medium text-gray-700">{t(dict, "dashboard.fields.languages")}</legend>
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
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">{t(dict, `dashboard.lang.${code}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">{t(dict, "dashboard.fields.avatar")}</p>
          <div className="flex items-center gap-3">
            {form.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photo_url}
                alt={t(dict, "dashboard.avatar.alt")}
                className="h-16 w-16 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 text-xs text-textSecondary">
                {t(dict, "dashboard.avatar.noPhoto")}
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {avatarUploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.uploadPhoto")}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={avatarUploading}
              />
            </label>
          </div>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.description")}</span>
          <textarea
            value={form.about_me}
            onChange={(e) => setForm((prev) => ({ ...prev, about_me: e.target.value }))}
            className="min-h-[110px] w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.video")}</span>
          <input
            value={form.video_url}
            onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
            placeholder={t(dict, "dashboard.fields.videoPlaceholder")}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-500">{t(dict, "dashboard.helpers.video.line1")}</p>
            <ul className="text-xs text-gray-500 list-disc list-inside">
              <li>{t(dict, "dashboard.helpers.video.bullet1")}</li>
              <li>{t(dict, "dashboard.helpers.video.bullet2")}</li>
              <li>{t(dict, "dashboard.helpers.video.bullet3")}</li>
            </ul>
            <p className="text-xs text-gray-400">{t(dict, "dashboard.helpers.video.footer")}</p>
          </div>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{t(dict, "dashboard.fields.gallery")}</p>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {galleryUploading ? t(dict, "dashboard.buttons.uploading") : t(dict, "dashboard.buttons.addImage")}
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={handleGalleryUpload}
                disabled={galleryUploading || form.gallery_urls.length >= MAX_GALLERY_IMAGES}
              />
            </label>
          </div>
          <p className="text-xs text-gray-500">{t(dict, "dashboard.gallery.maxImagesNote")}</p>
          <p className="text-xs text-gray-500">{t(dict, "dashboard.helpers.gallery.line1")}</p>
          <p className="text-xs text-gray-400">{t(dict, "dashboard.helpers.gallery.line2")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery_urls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-gray-200">
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
                  className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-700"
                >
                  {t(dict, "dashboard.buttons.delete")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">{t(dict, "dashboard.fields.documents")}</p>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
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
          <p className="text-xs text-gray-600 leading-relaxed">{t(dict, "dashboard.documents.help")}</p>
          <p className="text-xs text-gray-500">{t(dict, "dashboard.documents.maxNote")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.certificate_urls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
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
                  className="absolute right-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm"
                >
                  {t(dict, "dashboard.buttons.delete")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {noServicesYet ? (
          <div
            className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-sm"
            role="status"
          >
            {t(dict, "dashboard.servicesSection.visibilityWarning")}
          </div>
        ) : null}

        <div
          id="dashboard-services-section"
          className={`rounded-lg border p-4 transition-colors ${
            !hasValidServiceFlag
              ? "border-amber-400 bg-amber-50/60 ring-2 ring-amber-300/80 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
              : "border-gray-200"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t(dict, "dashboard.servicesSection.title")}</h2>
              {!hasValidServiceFlag && !noServicesYet ? (
                <p className="mt-1 text-sm font-medium text-amber-900">
                  {t(dict, "dashboard.servicesSection.visibilityWarning")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={addService}
              className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {t(dict, "dashboard.buttons.addService")}
            </button>
          </div>
          <div className="space-y-3">
            {form.services.map((service, idx) => (
              <div
                key={service.id || `new-${idx}`}
                className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
              >
                <div className="grid gap-2 md:grid-cols-[1fr_180px_110px_auto]">
                  <input
                    value={service.title}
                    onChange={(e) => updateService(idx, { title: e.target.value })}
                    placeholder={t(dict, "dashboard.service.placeholderTitle")}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <div>
                    <input
                      value={service.price_from}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateService(idx, {
                          price_from: value,
                          price_comment: service.price_comment,
                        });
                      }}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder={t(dict, "dashboard.service.placeholderPrice")}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        priceErrors[idx] ? "border-red-400" : "border-gray-200"
                      }`}
                    />
                    <p className="mt-0.5 text-[11px] text-gray-600 font-medium">{t(dict, "dashboard.service.priceHint")}</p>
                    {priceErrors[idx] && (
                      <p className="mt-0.5 text-xs text-red-600">{priceErrors[idx]}</p>
                    )}
                  </div>
                  <input
                    value={service.currency}
                    onChange={(e) => updateService(idx, { currency: e.target.value })}
                    placeholder="EUR"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    {t(dict, "dashboard.buttons.delete")}
                  </button>
                </div>
                <label className="block space-y-1">
                  <span className="font-medium text-gray-700">{t(dict, "dashboard.fields.priceComment")}</span>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {PRICE_COMMENT_PRESETS.map((preset, i) => {
                      const isActive = (service.price_comment || "").trim() === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            updateService(idx, {
                              price_comment: preset.slice(0, PRICE_COMMENT_MAX),
                              ...(ZERO_PRICE_PRESETS.has(preset)
                                ? { price_from: "0" }
                                : {}),
                            })
                          }
                          className={`
                            px-3 py-1 text-xs font-medium rounded-full transition
                            ${CHIP_COLORS[i % CHIP_COLORS.length]}
                            ${isActive ? "ring-2 ring-black/20" : ""}
                          `}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={service.price_comment || ""}
                    maxLength={PRICE_COMMENT_MAX}
                    onChange={(e) =>
                      updateService(idx, {
                        price_comment: e.target.value.slice(0, PRICE_COMMENT_MAX),
                      })
                    }
                    placeholder={t(dict, "dashboard.fields.priceCommentPlaceholder50")}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={2}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t(dict, "dashboard.fields.priceCommentMicroHint")}
                  </p>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t(dict, "dashboard.important.title")}</p>
          <p className="mt-1 font-medium">{t(dict, "dashboard.important.body")}</p>
        </div>

        <div className="space-y-3">
          <div className="text-sm">
            {error ? <p className="text-red-600">{error}</p> : null}
            {isDirty ? (
              <p className="font-medium text-amber-600">{t(dict, "dashboard.messages.unsavedChanges")}</p>
            ) : success ? (
              <p className="text-emerald-600">{success}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-start">
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? t(dict, "dashboard.buttons.saving") : t(dict, "dashboard.buttons.save")}
            </button>
            <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <button
                type="button"
                onClick={publish}
                disabled={publishDisabled}
                title={publishDisabledHint ?? undefined}
                aria-describedby={publishDisabledHint ? "publish-disabled-hint" : undefined}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {publishing ? t(dict, "dashboard.buttons.publishing") : t(dict, "dashboard.buttons.publish")}
              </button>
              {publishDisabledHint ? (
                <p id="publish-disabled-hint" className="max-w-md text-right text-sm font-medium text-gray-700">
                  {publishDisabledHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <SupportBlock />
      </div>
    </section>
  );
}
