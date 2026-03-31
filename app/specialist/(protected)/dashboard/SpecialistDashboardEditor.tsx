"use client";

import { useMemo, useState, useCallback, type ChangeEvent } from "react";
import { t, type Dictionary } from "@/lib/i18n";

type ServiceInput = {
  id?: string;
  title: string;
  price_from: string;
  currency: string;
  is_active: boolean;
};

type Props = {
  dict: Dictionary;
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
    city: string;
    address: string;
    photo_url: string;
    gallery_urls: string[];
    services: ServiceInput[];
  };
  initialStatus: string;
  categories: Array<{ id: string; title: string; parent_id: string | null; slug: string }>;
};

const MAX_GALLERY_IMAGES = 5;


export default function SpecialistDashboardEditor({ dict, initialData, initialStatus, categories }: Props) {
  const filteredCategories = categories.filter(
    (cat) => cat.parent_id !== null || cat.slug === "other"
  );
  const [form, _setFormRaw] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
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
  const publicationReady = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.category_id.trim() &&
        (!needsPostalCode || /^\d{5}$/.test(form.postal_code.trim())) &&
        form.about_me.trim() &&
        form.photo_url.trim()
    );
  }, [form, needsPostalCode]);

  function sanitizePrice(raw: string): string {
    return raw.replace(/\s/g, "").replace(",", ".");
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
      services: [...prev.services, { title: "", price_from: "", currency: "EUR", is_active: true }],
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

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        video_url: form.video_url.trim(),
        languages: form.languages.map((lang) => lang.trim()).filter(Boolean),
        gallery_urls: form.gallery_urls.map((url) => url.trim()).filter(Boolean),
        services: form.services
          .map((service) => ({
            id: service.id,
            title: service.title.trim(),
            price_from: sanitizePrice(service.price_from.trim()),
            currency: (service.currency || "EUR").trim().toUpperCase(),
            is_active: service.is_active,
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
        Заполните профиль, сохраните изменения и опубликуйте его, чтобы клиенты могли вас найти.
      </div>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Профиль специалиста</h1>
          <p className="mt-1 text-sm text-gray-600">
            Все поля редактируются на одной странице. Профиль в статусе: <span className="font-medium">{status}</span>.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Имя</span>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Телефон</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Категория</span>
            <select
              value={form.category_id}
              onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="">Выберите категорию</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Email</span>
            <input
              value={form.email}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">PLZ (Postleitzahl) {needsPostalCode && <span className="text-red-500">*</span>}</span>
            <input
              value={form.postal_code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 5);
                setForm((prev) => ({ ...prev, postal_code: v }));
              }}
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              placeholder="z.B. 34117"
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            {needsPostalCode && <p className="text-xs text-gray-500">5-значный почтовый индекс Германии. Обязателен для публикации.</p>}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Город</span>
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="z.B. Kassel"
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Адрес приёма</span>
            <input
              value={form.address || ""}
              placeholder="Например: Friedrich-Ebert-Straße 12"
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            <p className="text-xs text-gray-600 font-medium">Необязательно. Если указан адрес, маршрут будет строиться до точного места.</p>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Country</span>
            <select
              value={form.country_code}
              onChange={(e) => setForm((prev) => ({ ...prev, country_code: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="DE">Germany (DE)</option>
              <option value="GR">Greece (GR)</option>
              <option value="IT">Italy (IT)</option>
              <option value="PL">Poland (PL)</option>
              <option value="XX">Other (XX)</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Формат</span>
            <select
              value={form.work_format}
              onChange={(e) => setForm((prev) => ({ ...prev, work_format: e.target.value as Props["initialData"]["work_format"] }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            >
              <option value="online">Онлайн</option>
              <option value="offline">Офлайн</option>
              <option value="hybrid">Онлайн/Офлайн</option>
            </select>
          </label>
          <fieldset className="space-y-2 text-sm md:col-span-2">
            <legend className="font-medium text-gray-700">Языки</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {([
                { code: "ru", label: "Русский" },
                { code: "uk", label: "Украинский" },
                { code: "de", label: "Немецкий" },
                { code: "en", label: "Английский" },
                { code: "pl", label: "Польский" },
              ] as const).map((lang) => (
                <label key={lang.code} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.languages.includes(lang.code)}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        languages: e.target.checked
                          ? [...prev.languages, lang.code]
                          : prev.languages.filter((l) => l !== lang.code),
                      }));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-800">{lang.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Аватар</p>
          <div className="flex items-center gap-3">
            {form.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.photo_url}
                alt="Аватар"
                className="h-16 w-16 rounded-full border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 text-xs text-textSecondary">
                нет фото
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
          <span className="font-medium text-gray-700">Описание</span>
          <textarea
            value={form.about_me}
            onChange={(e) => setForm((prev) => ({ ...prev, about_me: e.target.value }))}
            className="min-h-[110px] w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">Видео (YouTube / Vimeo URL)</span>
          <input
            value={form.video_url}
            onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
            placeholder="https://www.youtube.com/... или https://vimeo.com/..."
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
            <p className="text-sm font-medium text-gray-700">Галерея</p>
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
          <p className="text-xs text-gray-500">До 5 изображений.</p>
          <p className="text-xs text-gray-500">{t(dict, "dashboard.helpers.gallery.line1")}</p>
          <p className="text-xs text-gray-400">{t(dict, "dashboard.helpers.gallery.line2")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.gallery_urls.map((url, index) => (
              <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Галерея ${index + 1}`} className="h-28 w-full object-cover" />
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

        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Услуги и цены</h2>
            <button
              type="button"
              onClick={addService}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {t(dict, "dashboard.buttons.addService")}
            </button>
          </div>
          <div className="space-y-3">
            {form.services.map((service, idx) => (
              <div key={service.id || `new-${idx}`} className="grid gap-2 md:grid-cols-[1fr_180px_110px_auto]">
                <input
                  value={service.title}
                  onChange={(e) => updateService(idx, { title: e.target.value })}
                  placeholder="Название услуги"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <div>
                  <input
                    value={service.price_from}
                    onChange={(e) => updateService(idx, { price_from: e.target.value })}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Цена (например: 2500)"
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      priceErrors[idx] ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                  <p className="mt-0.5 text-[11px] text-gray-600 font-medium">
                    Только цифры. Не: &quot;2,5 тыс&quot;, &quot;полторы&quot;
                  </p>
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
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">⚠️ Важно:</p>
          <p className="mt-1 font-medium">
            После внесения изменений сначала нажмите «Сохранить изменения»,
            затем — «Опубликовать профиль».
          </p>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? t(dict, "dashboard.buttons.saving") : t(dict, "dashboard.buttons.save")}
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing || isDirty}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {publishing ? t(dict, "dashboard.buttons.publishing") : t(dict, "dashboard.buttons.publish")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
