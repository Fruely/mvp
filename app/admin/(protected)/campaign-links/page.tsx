"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLIENT_CAMPAIGN_SOURCE_OPTIONS,
  CLIENT_CAMPAIGN_UI_LANG_OPTIONS,
  CLIENT_CAMPAIGN_WORK_FORMAT_OPTIONS,
} from "@/lib/clientCampaignLinks/validation";

type CategoryOption = {
  id: string;
  slug: string;
  title: string;
  title_ru: string | null;
  title_ua: string | null;
  title_de: string | null;
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
  public_path: string;
  public_url: string;
  context_summary: string;
};

type FormState = {
  name: string;
  ui_lang: string;
  slug: string;
  category_id: string;
  service_query: string;
  place: string;
  preferred_language: string;
  work_format: string;
  radius_km: string;
  source: string;
  campaign_code: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  ui_lang: "ru",
  slug: "",
  category_id: "",
  service_query: "",
  place: "",
  preferred_language: "",
  work_format: "",
  radius_km: "",
  source: "",
  campaign_code: "",
};

function adminHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("ADMIN_API_TOKEN") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-token": token } : {}),
  };
}

function categoryLabel(cat: CategoryOption, uiLang: string): string {
  if (uiLang === "ru" && cat.title_ru) return cat.title_ru;
  if (uiLang === "ua" && cat.title_ua) return cat.title_ua;
  if (uiLang === "de" && cat.title_de) return cat.title_de;
  return cat.title;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) =>
      categoryLabel(a, form.ui_lang).localeCompare(categoryLabel(b, form.ui_lang)),
    );
  }, [categories, form.ui_lang]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [linksRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/campaign-links", { headers: adminHeaders(), cache: "no-store" }),
        fetch("/api/admin/campaign-links/categories", { headers: adminHeaders(), cache: "no-store" }),
      ]);
      const linksJson = await linksRes.json().catch(() => ({}));
      const categoriesJson = await categoriesRes.json().catch(() => ({}));
      if (!linksRes.ok) {
        setError(linksJson.error || "Failed to load campaign links");
        setLinks([]);
      } else {
        setLinks(linksJson.links ?? []);
      }
      if (categoriesRes.ok) {
        setCategories(categoriesJson.categories ?? []);
      }
    } catch {
      setError("Failed to load campaign links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(link: CampaignLinkItem) {
    setEditingId(link.id);
    setForm({
      name: link.name,
      ui_lang: link.ui_lang,
      slug: link.slug,
      category_id: link.category_id ?? "",
      service_query: link.service_query ?? "",
      place: link.place ?? "",
      preferred_language: link.preferred_language ?? "",
      work_format: link.work_format ?? "",
      radius_km: link.radius_km != null ? String(link.radius_km) : "",
      source: link.source ?? "",
      campaign_code: link.campaign_code ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCampaign(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const selectedCategory = categories.find((c) => c.id === form.category_id);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      ui_lang: form.ui_lang,
      place: form.place.trim() || null,
      preferred_language: form.preferred_language || null,
      work_format: form.work_format || null,
      radius_km: form.radius_km ? Number(form.radius_km) : null,
      source: form.source || null,
      campaign_code: form.campaign_code.trim() || null,
    };

    if (form.slug.trim()) {
      payload.slug = form.slug.trim();
    }

    if (selectedCategory) {
      payload.category_id = selectedCategory.id;
      payload.category_slug = selectedCategory.slug;
      payload.service_query = null;
    } else if (form.service_query.trim()) {
      payload.service_query = form.service_query.trim();
      payload.category_id = null;
      payload.category_slug = null;
    }

    const url = editingId
      ? `/api/admin/campaign-links/${editingId}`
      : "/api/admin/campaign-links";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(`Save failed: ${json.error || res.status}`);
      return;
    }

    const saved = json.link as CampaignLinkItem;
    setMessage(
      editingId
        ? `Updated ${saved.name} → ${saved.public_url}`
        : `Created ${saved.name} → ${saved.public_url}`,
    );
    resetForm();
    await load();
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
      setMessage(`Status change failed: ${json.error || res.status}`);
      return;
    }
    await load();
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage(`Copied: ${url}`);
    } catch {
      setMessage(`Copy manually: ${url}`);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Campaign links</h1>
        <p className="mt-1 text-sm text-gray-600">
          Client acquisition short URLs for ads. Each link resolves to a prefilled request-service
          form. Deactivate old links instead of deleting them.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">
          {editingId ? "Edit campaign link" : "New campaign link"}
        </h2>
        <form onSubmit={saveCampaign} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-gray-700">Campaign name *</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Электрик München RU — Facebook"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">UI language *</span>
            <select
              value={form.ui_lang}
              onChange={(e) => setForm((f) => ({ ...f, ui_lang: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {CLIENT_CAMPAIGN_UI_LANG_OPTIONS.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Slug (optional override)</span>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="auto-generated if empty"
              disabled={Boolean(editingId)}
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-gray-700">Category (preferred)</span>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {sortedCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {categoryLabel(cat, form.ui_lang)} ({cat.slug})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-gray-700">Free service query (if no category)</span>
            <input
              value={form.service_query}
              onChange={(e) => setForm((f) => ({ ...f, service_query: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="electrician"
              disabled={Boolean(form.category_id)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Place</span>
            <input
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="München"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Preferred specialist language</span>
            <select
              value={form.preferred_language}
              onChange={(e) => setForm((f) => ({ ...f, preferred_language: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              <option value="ru">RU</option>
              <option value="ua">UA</option>
              <option value="de">DE</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Work format</span>
            <select
              value={form.work_format}
              onChange={(e) => setForm((f) => ({ ...f, work_format: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {CLIENT_CAMPAIGN_WORK_FORMAT_OPTIONS.map((wf) => (
                <option key={wf} value={wf}>
                  {wf}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Radius (km)</span>
            <input
              type="number"
              min={0}
              value={form.radius_km}
              onChange={(e) => setForm((f) => ({ ...f, radius_km: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-gray-700">Source / channel</span>
            <select
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">— none —</option>
              {CLIENT_CAMPAIGN_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="text-gray-700">Campaign code</span>
            <input
              value={form.campaign_code}
              onChange={(e) => setForm((f) => ({ ...f, campaign_code: e.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="electrician_munich_ru_aug26"
            />
          </label>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              {editingId ? "Save changes" : "Create campaign link"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Stored links</h2>
        {loading ? (
          <p className="mt-3 text-sm text-gray-500">Loading…</p>
        ) : links.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No campaign links yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Context</th>
                  <th className="px-2 py-2 font-medium">Public URL</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Created</th>
                  <th className="px-2 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-gray-100 align-top">
                    <td className="px-2 py-3 font-medium text-gray-900">{link.name}</td>
                    <td className="px-2 py-3 text-gray-600">{link.context_summary}</td>
                    <td className="px-2 py-3">
                      <code className="text-xs text-gray-800">{link.public_url}</code>
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={
                          link.is_active
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                            : "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        }
                      >
                        {link.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-600">{formatDate(link.created_at)}</td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyLink(link.public_url)}
                          className="text-xs text-blue-700 hover:underline"
                        >
                          Copy
                        </button>
                        <a
                          href={link.public_path}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-700 hover:underline"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => startEdit(link)}
                          className="text-xs text-blue-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(link)}
                          className="text-xs text-blue-700 hover:underline"
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
