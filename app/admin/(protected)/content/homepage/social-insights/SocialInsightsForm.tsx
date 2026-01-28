"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type {
  LangTriple,
  SocialInsightItemRow,
  SocialInsightsBlockInitial,
} from "./types";

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";
const LANGS = ["ua", "ru", "de"] as const;
type LangKey = (typeof LANGS)[number];

const PLATFORMS = [
  "telegram",
  "facebook",
  "x",
  "youtube",
  "tiktok",
  "media",
  "ngo",
] as const;

type Props = {
  initialBlock: SocialInsightsBlockInitial;
  items: SocialInsightItemRow[];
};

function partnerRule(item: {
  backlink_required: boolean;
  backlink_verified: boolean;
}): boolean {
  return item.backlink_required && !item.backlink_verified;
}

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
const labelClass = "mb-1 block text-sm font-medium text-gray-700";

export default function SocialInsightsForm({
  initialBlock,
  items: initialItems,
}: Props) {
  const [title, setTitle] = useState<LangTriple>(initialBlock.title);
  const [subtitle, setSubtitle] = useState<LangTriple>(initialBlock.subtitle);
  const [blockActive, setBlockActive] = useState(initialBlock.is_active);
  const [blockTab, setBlockTab] = useState<LangKey>("ua");
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockMessage, setBlockMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [items, setItems] = useState<SocialInsightItemRow[]>(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialInsightItemRow | null>(
    null
  );
  const [itemTab, setItemTab] = useState<LangKey>("ua");
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [activeToggleError, setActiveToggleError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialBlock.title);
    setSubtitle(initialBlock.subtitle);
    setBlockActive(initialBlock.is_active);
  }, [
    initialBlock.title,
    initialBlock.subtitle,
    initialBlock.is_active,
  ]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!blockMessage) return;
    const t = setTimeout(
      () => setBlockMessage(null),
      blockMessage.type === "success" ? 2500 : 4000
    );
    return () => clearTimeout(t);
  }, [blockMessage]);

  const saveBlock = useCallback(async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_STORAGE_KEY)
        : null;
    if (!token?.trim()) {
      setBlockMessage({
        type: "error",
        text: "Admin token required. Sign in again.",
      });
      return;
    }
    setBlockSaving(true);
    setBlockMessage(null);
    try {
      const res = await fetch("/api/admin/content/homepage/social-insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token.trim(),
        },
        body: JSON.stringify({
          title,
          subtitle,
          is_active: blockActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBlockMessage({
          type: "error",
          text: (json && json.error) || "Failed to save.",
        });
        return;
      }
      setBlockMessage({ type: "success", text: "Saved." });
    } catch (e: any) {
      setBlockMessage({
        type: "error",
        text: e?.message || "Network error.",
      });
    } finally {
      setBlockSaving(false);
    }
  }, [title, subtitle, blockActive]);

  const openCreate = () => {
    setEditingItem(null);
    setItemError(null);
    setActiveToggleError(null);
    setModalOpen(true);
  };

  const openEdit = (item: SocialInsightItemRow) => {
    setEditingItem({
      ...item,
      title: { ...item.title },
      excerpt: { ...item.excerpt },
    });
    setItemError(null);
    setActiveToggleError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setItemError(null);
  };

  const getToken = () => {
    return (
      (typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_STORAGE_KEY)
        : null) ?? ""
    );
  };

  const saveItem = useCallback(
    async (payload: Partial<SocialInsightItemRow> & { title: LangTriple; excerpt: LangTriple }) => {
      const token = getToken().trim();
      if (!token) {
        setItemError("Admin token required. Sign in again.");
        return;
      }
      setItemSaving(true);
      setItemError(null);
      try {
        const res = await fetch(
          "/api/admin/content/homepage/social-insights/items",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-token": token,
            },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          setItemError(
            (json && json.error) || "Failed to save."
          );
          return;
        }
        const data = json.data as SocialInsightItemRow;
        setItems((prev) => {
          if (payload.id) {
            return prev.map((i) => (i.id === payload.id ? data : i));
          }
          return [data, ...prev];
        });
        closeModal();
      } catch (e: any) {
        setItemError(e?.message || "Network error.");
      } finally {
        setItemSaving(false);
      }
    },
    []
  );

  const deleteItem = useCallback(async (id: string) => {
    const token = getToken().trim();
    if (!token) return;
    try {
      const res = await fetch(
        `/api/admin/content/homepage/social-insights/items?id=${encodeURIComponent(id)}`,
        { method: "DELETE", headers: { "x-admin-token": token } }
      );
      if (!res.ok) return;
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingItem?.id === id) closeModal();
    } catch {
      // ignore
    }
  }, [editingItem?.id]);

  const toggleActive = useCallback(
    async (item: SocialInsightItemRow) => {
      setActiveToggleError(null);
      if (partnerRule(item)) {
        setActiveToggleError(
          "Partner backlink not verified. Activation blocked."
        );
        return;
      }
      const token = getToken().trim();
      if (!token) return;
      try {
        const res = await fetch(
          "/api/admin/content/homepage/social-insights/items",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-token": token,
            },
            body: JSON.stringify({
              ...item,
              is_active: !item.is_active,
            }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          setActiveToggleError(
            (json && json.error) || "Partner backlink not verified. Activation blocked."
          );
          return;
        }
        const data = json.data as SocialInsightItemRow;
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? data : i))
        );
      } catch {
        setActiveToggleError(
          "Partner backlink not verified. Activation blocked."
        );
      }
    },
    []
  );

  return (
    <div className="space-y-8">
      {/* Block settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Block settings
        </h2>
        <div className="mb-4 flex gap-2 border-b border-gray-200 pb-4">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setBlockTab(l)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                blockTab === l
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title[blockTab]}
              onChange={(e) =>
                setTitle((prev) => ({ ...prev, [blockTab]: e.target.value }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea
              rows={2}
              value={subtitle[blockTab]}
              onChange={(e) =>
                setSubtitle((prev) => ({
                  ...prev,
                  [blockTab]: e.target.value,
                }))
              }
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4 border-t border-gray-200 pt-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={blockActive}
              onChange={(e) => setBlockActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm font-medium text-gray-700">is_active</span>
          </label>
          <button
            type="button"
            onClick={saveBlock}
            disabled={blockSaving}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {blockSaving ? "Saving…" : "Save"}
          </button>
        </div>
        {blockMessage && (
          <p
            className={`mt-4 text-sm ${
              blockMessage.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {blockMessage.text}
          </p>
        )}
      </div>

      {/* Items */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Add item
          </button>
        </div>
        {activeToggleError && (
          <p className="mb-4 text-sm text-red-600">{activeToggleError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-700">
                <th className="border-b px-3 py-2">Platform</th>
                <th className="border-b px-3 py-2">Partner name</th>
                <th className="border-b px-3 py-2">Title</th>
                <th className="border-b px-3 py-2">Backlink verified</th>
                <th className="border-b px-3 py-2">Active</th>
                <th className="border-b px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-gray-500"
                    colSpan={6}
                  >
                    No items yet. Add one above.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const blocked = partnerRule(item);
                  return (
                    <tr key={item.id} className="align-top">
                      <td className="border-b px-3 py-2 text-gray-900">
                        {item.platform}
                      </td>
                      <td className="border-b px-3 py-2 text-gray-900">
                        {item.partner_name || "—"}
                      </td>
                      <td className="max-w-[200px] truncate border-b px-3 py-2 text-gray-700">
                        {item.title?.ua || item.title?.ru || item.title?.de || "—"}
                      </td>
                      <td className="border-b px-3 py-2">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                            item.backlink_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.backlink_verified ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="border-b px-3 py-2">
                        <input
                          type="checkbox"
                          checked={item.is_active}
                          disabled={blocked}
                          onChange={() => toggleActive(item)}
                          className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
                        />
                      </td>
                      <td className="border-b px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="mr-2 text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item modal */}
      {modalOpen && (
        <ItemModal
          item={editingItem}
          onClose={closeModal}
          onSave={saveItem}
          saving={itemSaving}
          error={itemError}
          inputClass={inputClass}
          labelClass={labelClass}
          itemTab={itemTab}
          setItemTab={setItemTab}
        />
      )}
    </div>
  );
}

type ItemModalProps = {
  item: SocialInsightItemRow | null;
  onClose: () => void;
  onSave: (p: any) => void;
  saving: boolean;
  error: string | null;
  inputClass: string;
  labelClass: string;
  itemTab: LangKey;
  setItemTab: (l: LangKey) => void;
};

function ItemModal({
  item,
  onClose,
  onSave,
  saving,
  error,
  inputClass,
  labelClass,
  itemTab,
  setItemTab,
}: ItemModalProps) {
  const [platform, setPlatform] = useState(item?.platform ?? "telegram");
  const [partner_name, setPartnerName] = useState(item?.partner_name ?? "");
  const [url, setUrl] = useState(item?.url ?? "");
  const [backlink_required, setBacklinkRequired] = useState(
    item?.backlink_required ?? true
  );
  const [backlink_verified, setBacklinkVerified] = useState(
    item?.backlink_verified ?? false
  );
  const [is_active, setIsActive] = useState(item?.is_active ?? false);
  const [title, setTitle] = useState<LangTriple>(
    item?.title ?? { ua: "", ru: "", de: "" }
  );
  const [excerpt, setExcerpt] = useState<LangTriple>(
    item?.excerpt ?? { ua: "", ru: "", de: "" }
  );

  useEffect(() => {
    if (item) {
      setPlatform(item.platform);
      setPartnerName(item.partner_name);
      setUrl(item.url);
      setBacklinkRequired(item.backlink_required);
      setBacklinkVerified(item.backlink_verified);
      setIsActive(item.is_active);
      setTitle(item.title);
      setExcerpt(item.excerpt);
    } else {
      setPlatform("telegram");
      setPartnerName("");
      setUrl("");
      setBacklinkRequired(true);
      setBacklinkVerified(false);
      setIsActive(false);
      setTitle({ ua: "", ru: "", de: "" });
      setExcerpt({ ua: "", ru: "", de: "" });
    }
  }, [item]);

  const blocked = backlink_required && !backlink_verified;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: item?.id ?? undefined,
      platform,
      partner_name,
      url,
      backlink_required,
      backlink_verified,
      is_active: blocked ? false : is_active,
      title,
      excerpt,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {item ? "Edit item" : "Add item"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className={inputClass}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Partner name</label>
            <input
              type="text"
              value={partner_name}
              onChange={(e) => setPartnerName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={backlink_required}
                onChange={(e) => setBacklinkRequired(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Backlink required</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={backlink_verified}
                onChange={(e) => setBacklinkVerified(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm text-gray-700">Backlink verified</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={is_active}
                disabled={blocked}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">is_active</span>
            </label>
          </div>
          {blocked && (
            <p className="text-sm text-amber-600">
              Partner backlink not verified. Activation blocked.
            </p>
          )}

          <div className="border-t border-gray-200 pt-4">
            <div className="mb-2 flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setItemTab(l)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    itemTab === l
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  value={title[itemTab]}
                  onChange={(e) =>
                    setTitle((prev) => ({ ...prev, [itemTab]: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Excerpt</label>
                <textarea
                  rows={3}
                  value={excerpt[itemTab]}
                  onChange={(e) =>
                    setExcerpt((prev) => ({
                      ...prev,
                      [itemTab]: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
