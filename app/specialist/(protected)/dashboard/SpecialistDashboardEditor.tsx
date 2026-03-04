"use client";

import { useMemo, useState } from "react";

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
    work_format: "online" | "offline" | "hybrid";
    languages: string[];
    about_me: string;
    city: string;
    photo_url: string;
    gallery_urls: string[];
    services: ServiceInput[];
  };
  initialStatus: string;
};

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

export default function SpecialistDashboardEditor({ initialData, initialStatus }: Props) {
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);

  const initialSnapshot = useMemo(() => toSnapshot(initialData), [initialData]);
  const currentSnapshot = useMemo(() => toSnapshot(form), [form]);
  const isDirty = initialSnapshot !== currentSnapshot;

  const publicationReady = useMemo(() => {
    const hasPhoto = Boolean(form.photo_url.trim());
    const hasName = Boolean(form.name.trim());
    const hasService = form.services.some((service) => service.title.trim().length > 0);
    const hasPrice = form.services.some((service) => Number(service.price_from) > 0);
    return hasPhoto && hasName && hasService && hasPrice;
  }, [form]);

  function updateService(index: number, patch: Partial<ServiceInput>) {
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
        { title: "", price_from: "", currency: "EUR", is_active: true },
      ],
    }));
  }

  function removeService(index: number) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        languages: form.languages.map((lang) => lang.trim()).filter(Boolean),
        gallery_urls: form.gallery_urls.map((url) => url.trim()).filter(Boolean),
        services: form.services
          .map((service) => ({
            id: service.id,
            title: service.title.trim(),
            price_from: service.price_from.trim(),
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Профиль специалиста</h1>
          <p className="mt-1 text-sm text-gray-500">
            Все поля редактируются на одной странице. Профиль в статусе: <span className="font-medium">{status}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={publish}
          disabled={publishing || !publicationReady}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {publishing ? "Публикация..." : "Опубликовать"}
        </button>
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
            <span className="font-medium text-gray-700">Email</span>
            <input value={form.email} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600" />
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
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-700">Языки (через запятую)</span>
            <input
              value={form.languages.join(", ")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  languages: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                }))
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm block">
          <span className="font-medium text-gray-700">Фото профиля (URL)</span>
          <input
            value={form.photo_url}
            onChange={(e) => setForm((prev) => ({ ...prev, photo_url: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm block">
          <span className="font-medium text-gray-700">Описание</span>
          <textarea
            value={form.about_me}
            onChange={(e) => setForm((prev) => ({ ...prev, about_me: e.target.value }))}
            className="min-h-[110px] w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm block">
          <span className="font-medium text-gray-700">Галерея (URL через запятую)</span>
          <input
            value={form.gallery_urls.join(", ")}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                gallery_urls: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
              }))
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
        </label>

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
                <input
                  value={service.price_from}
                  onChange={(e) => updateService(idx, { price_from: e.target.value })}
                  placeholder="Цена"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
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

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            {error ? <p className="text-red-600">{error}</p> : null}
            {success ? <p className="text-emerald-600">{success}</p> : null}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!isDirty || saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </section>
  );
}
