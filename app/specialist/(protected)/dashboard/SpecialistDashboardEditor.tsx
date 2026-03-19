"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { getDashboardHelpers } from "@/lib/i18n/dashboardHelpers";

type ServiceInput = {
  id?: string;
  title: string;
  price_from: string;
  currency: string;
  is_active: boolean;
};

type Props = {
  initialData: {
    name: string;
    email: string;
    phone: string;
    category_id: string;
    work_format: "online" | "offline" | "hybrid";
    languages: string[];
    about_me: string;
    video_url: string;
    city: string;
    address: string;
    photo_url: string;
    gallery_urls: string[];
    services: ServiceInput[];
  };
  initialStatus: string;
  categories: Array<{ id: string; title: string }>;
};

const MAX_GALLERY_IMAGES = 5;

function toSnapshot(data: Props["initialData"]) {
  return JSON.stringify({
    ...data,
    services: data.services.map((service) => ({
      ...service,
      title: service.title.trim(),
      price_from: service.price_from.trim(),
      currency: service.currency.trim().toUpperCase(),
    })),
    languages: data.languages.map((lang) => lang.trim()).filter(Boolean),
    gallery_urls: data.gallery_urls.map((url) => url.trim()).filter(Boolean),
  });
}

export default function SpecialistDashboardEditor({ initialData, initialStatus, categories }: Props) {
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [priceErrors, setPriceErrors] = useState<Record<number, string | null>>({});

  const initialSnapshot = useMemo(() => toSnapshot(initialData), [initialData]);
  const currentSnapshot = useMemo(() => toSnapshot(form), [form]);
  const isDirty = initialSnapshot !== currentSnapshot;

  const publicationReady = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.category_id.trim() &&
        form.city.trim() &&
        form.about_me.trim() &&
        form.photo_url.trim()
    );
  }, [form]);

  function sanitizePrice(raw: string): string {
    return raw.replace(/\s/g, "").replace(",", ".");
  }

  function validatePrice(value: string): string | null {
    if (value === "") return null;
    const sanitized = sanitizePrice(value);
    if (!/^\d+(\.\d+)?$/.test(sanitized)) {
      return "Введите цену только цифрами (например: 2500)";
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
      throw new Error(typeof json.error === "string" ? json.error : "Не удалось загрузить изображение.");
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
      setSuccess("Аватар загружен.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить аватар.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (form.gallery_urls.length >= MAX_GALLERY_IMAGES) {
      setError("Можно загрузить до 5 изображений.");
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
      setSuccess("Изображение добавлено в галерею.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить изображение.");
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
        setError(typeof json.error === "string" ? json.error : "Не удалось сохранить профиль.");
        return;
      }
      setSuccess("Изменения сохранены.");
    } catch {
      setError("Не удалось сохранить профиль.");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (isDirty) {
      setError("Сначала сохраните изменения, затем публикуйте профиль.");
      setSuccess(null);
      return;
    }
    if (!publicationReady) {
      setError("Заполните обязательные поля");
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
        setError(typeof json.error === "string" ? json.error : "Не удалось опубликовать профиль.");
        return;
      }
      if (typeof json.status === "string") setStatus(json.status);
      setSuccess("Профиль опубликован.");
    } catch {
      setError("Не удалось опубликовать профиль.");
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
              {categories.map((category) => (
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
            <span className="font-medium text-gray-700">Город / локация</span>
            <input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Адреса прийому</span>
            <input
              value={form.address || ""}
              placeholder="Наприклад: Friedrich-Ebert-Straße 12"
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
            <p className="text-xs text-gray-500">Необов&apos;язково. Якщо вказано адресу, маршрут буде будуватись до точного місця.</p>
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
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-gray-700">Языки (через запятую)</span>
            <input
              value={form.languages.join(", ")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  languages: e.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
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
              {avatarUploading ? "Загрузка..." : "Загрузить фото"}
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
            <p className="text-xs text-gray-500">{getDashboardHelpers().video.line1}</p>
            <ul className="text-xs text-gray-500 list-disc list-inside">
              <li>{getDashboardHelpers().video.bullet1}</li>
              <li>{getDashboardHelpers().video.bullet2}</li>
              <li>{getDashboardHelpers().video.bullet3}</li>
            </ul>
            <p className="text-xs text-gray-400">{getDashboardHelpers().video.footer}</p>
          </div>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Галерея</p>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {galleryUploading ? "Загрузка..." : "Добавить изображение"}
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
          <p className="text-xs text-gray-500">{getDashboardHelpers().gallery.line1}</p>
          <p className="text-xs text-gray-400">{getDashboardHelpers().gallery.line2}</p>
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
                  Удалить
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
              + Добавить услугу
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
                  Удалить
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
            {success ? <p className="text-emerald-600">{success}</p> : null}
          </div>
          {isDirty && (
            <p className="text-sm font-medium text-amber-600">У вас есть несохранённые изменения</p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing || isDirty}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {publishing ? "Публикация..." : "Опубликовать профиль"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
