"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLIENT_CAMPAIGN_SOURCES,
  CLIENT_CAMPAIGN_UI_LANGS,
  CLIENT_CAMPAIGN_WORK_FORMATS,
} from "@/lib/clientCampaignLinks/constants";

type CategoryOption = {
  id: string;
  slug: string;
  title: string;
  parent_id: string | null;
};

type CampaignLinkItem = {
  id: string;
  slug: string;
  name: string;
  ui_lang: string;
  category_id: string | null;
  category_slug: string | null;
  service_query: string | null;
  place: string | null;
  preferred_language: string | null;
  work_format: string | null;
  radius_km: number | null;
  source: string | null;
  campaign_code: string | null;
  is_active: boolean;
  created_at: string;
  public_url: string;
  public_path: string;
  context_summary: string;
};

const EMPTY_FORM = {
  name: "",
  ui_lang: "ru",
  category_id: "",
  service_query: "",
  place: "",
  preferred_language: "",
  work_format: "",
  radius_km: "",
  source: "",
  campaign_code: "",
  slug: "",
};

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("ADMIN_API_TOKEN") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU");
  } catch {
    return iso;
  }
}

export default function AdminCampaignLinksPage() {
  const [links, setLinks] = useState<CampaignLinkItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/specialists/categories?min_count=0", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      const rows = (json.data ?? []) as Array<Record<string, unknown>>;
      setCategories(
        rows.map((row) => ({
          id: String(row.id),
          slug: String(row.slug ?? ""),
          title: String(row.title_ru || row.title || row.slug || ""),
          parent_id: row.parent_id ? String(row.parent_id) : null,
        })),
      );
    } catch {
      setCategories([]);
    }
  }, []);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/campaign-links", {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Failed to load campaign links");
        setLinks([]);
        return;
      }
      setLinks(json.links ?? []);
    } catch {
      setError("Failed to load campaign links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
    void loadLinks();
  }, [loadCategories, loadLinks]);

  function resetForm() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
  }

  function startEdit(link: CampaignLinkItem) {
    setEditingId(link.id);
    setForm({
      name: link.name,
      ui_lang: link.ui_lang,
      category_id: link.category_id ?? "",
      service_query: link.service_query ?? "",
      place: link.place ?? "",
      preferred_language: link.preferred_language ?? "",
      work_format: link.work_format ?? "",
      radius_km: link.radius_km != null ? String(link.radius_km) : "",
      source: link.source ?? "",
      campaign_code: link.campaign_code ?? "",
      slug: link.slug,
    });
    setMessage(null);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Ссылка скопирована");
    } catch {
      setMessage("Не удалось скопировать ссылку");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const selectedCategory = form.category_id ? categoryById.get(form.category_id) : null;
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      ui_lang: form.ui_lang,
      category_id: form.category_id || null,
      category_slug: selectedCategory?.slug ?? null,
      service_query: form.service_query.trim() || null,
      place: form.place.trim() || null,
      preferred_language: form.preferred_language || null,
      work_format: form.work_format || null,
      radius_km: form.radius_km ? Number(form.radius_km) : null,
      source: form.source || null,
      campaign_code: form.campaign_code.trim() || null,
    };

    if (!editingId && form.slug.trim()) {
      payload.slug = form.slug.trim();
    }

    const url = editingId ? `/api/admin/campaign-links/${editingId}` : "/api/admin/campaign-links";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Ошибка: ${json.error || res.status}`);
      return;
    }

    setMessage(
      editingId
        ? `Обновлено: ${json.link?.public_url}`
        : `Создано: ${json.link?.public_url}`,
    );
    resetForm();
    await loadLinks();
  }

  async function toggleActive(link: CampaignLinkItem) {
    setMessage(null);
    const res = await fetch(`/api/admin/campaign-links/${link.id}`, {
      method: "PATCH",
      headers: adminHeaders(),
      body: JSON.stringify({ is_active: !link.is_active }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Ошибка: ${json.error || res.status}`);
      return;
    }
    await loadLinks();
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Links</h1>
        <p className="mt-1 text-sm text-gray-600">
          Клиентские рекламные ссылки для Meta / Telegram. Публичный URL: /go/&#123;slug&#125;
        </p>
      </div>

      {message ? (
        <p className="rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-4 max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {editingId ? "Редактировать кампанию" : "Новая кампания"}
        </h2>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Название *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Электрик München RU — Facebook"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">UI язык *</span>
            <select
              value={form.ui_lang}
              onChange={(e) => setForm((f) => ({ ...f, ui_lang: e.target.value }))}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {CLIENT_CAMPAIGN_UI_LANGS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Канал</span>
            <select
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">—</option>
              {CLIENT_CAMPAIGN_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Категория / услуга</span>
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">— выберите категорию —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.title} ({cat.slug})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Свободный запрос (q)</span>
          <input
            value={form.service_query}
            onChange={(e) => setForm((f) => ({ ...f, service_query: e.target.value }))}
            placeholder="если категории недостаточно"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Место</span>
            <input
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              placeholder="München"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Язык специалиста</span>
            <select
              value={form.preferred_language}
              onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">—</option>
              <option value="ru">ru</option>
              <option value="ua">ua</option>
              <option value="de">de</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Формат работы</span>
            <select
              value={form.work_format}
              onChange={(e) => setForm((f) => ({ ...f, work_format: e.target.value }))}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">—</option>
              {CLIENT_CAMPAIGN_WORK_FORMATS.map((wf) => (
                <option key={wf} value={wf}>
                  {wf}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Радиус (км)</span>
            <input
              type="number"
              min={0}
              value={form.radius_km}
              onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Campaign code</span>
          <input
            value={form.campaign_code}
            onChange={(e) => setForm((f) => ({ ...f, campaign_code: e.target.value }))}
            placeholder="electrician_munich_ru_aug26"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        {!editingId ? (
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Slug (опционально до сохранения)</span>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="авто: elektrik-muenchen-ru"
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        ) : (
          <p className="text-sm text-gray-600">
            Публичный slug: <code className="font-mono">{form.slug}</code> (не меняется при редактировании контекста)
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {editingId ? "Сохранить" : "Создать ссылку"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Отмена
            </button>
          ) : null}
        </div>
      </form>

      <section className="rounded-lg border bg-white overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Сохранённые ссылки</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-gray-500">Загрузка…</p>
        ) : links.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Пока нет кампаний.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Контекст</th>
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Создано</th>
                  <th className="px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-t align-top">
                    <td className="px-4 py-3 font-medium text-gray-900">{link.name}</td>
                    <td className="px-4 py-3 text-gray-600">{link.context_summary}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs break-all">{link.public_url}</code>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          link.is_active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {link.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(link.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void copyUrl(link.public_url)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Copy
                        </button>
                        <a
                          href={link.public_path}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => startEdit(link)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(link)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          {link.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
