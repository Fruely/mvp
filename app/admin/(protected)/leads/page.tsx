"use client";

import { useEffect, useMemo, useState } from "react";

type Specialist = {
  id: string;
  name: string | null;
  category_id: string | null;
};

type Lead = {
  id: string;
  specialist_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string | null;
  specialist: Specialist | null;
};

type ApiResponse = { data: Lead[] } | { error: string };

const ALLOWED_STATUSES = ["new", "contacted", "closed"] as const;
type LeadStatus = (typeof ALLOWED_STATUSES)[number];

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

export default function AdminLeadsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>(
    {}
  );

  const hasToken = useMemo(() => !!token && token.trim().length > 0, [token]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (saved && saved.trim()) {
        setToken(saved.trim());
      }
    } catch {
      // ignore
    }
  }, []);

  async function fetchLeads(activeToken: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/leads", {
        method: "GET",
        headers: {
          "x-admin-token": activeToken,
        },
      });

      const json = (await res.json()) as ApiResponse;

      if (res.status === 401) {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
        setToken(null);
        setTokenInput("");
        setData([]);
        setError("Токен недействителен. Введите токен заново.");
        return;
      }

      if (!res.ok) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Не удалось загрузить лиды";
        setError(message);
        return;
      }

      if ("data" in json && Array.isArray(json.data)) {
        setData(json.data);
        return;
      }

      setError("Некорректный ответ API");
    } catch (e: any) {
      setError(e?.message || "Ошибка сети при загрузке лидов");
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(id: string, status: LeadStatus) {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken || !activeToken.trim()) {
      setError("Введите токен, чтобы менять статус лидов.");
      return;
    }

    setUpdatingById((prev) => ({ ...prev, [id]: true }));
    setError(null);

    try {
      const res = await fetch("/api/admin/leads/status", {
        method: "PATCH",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const json = (await res.json()) as { data?: any; error?: string };

      if (res.status === 401) {
        try {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        } catch {
          // ignore
        }
        setToken(null);
        setTokenInput("");
        setError("Токен недействителен. Введите токен заново.");
        return;
      }

      if (!res.ok) {
        setError(json?.error || "Не удалось обновить статус лида");
        return;
      }

      setData((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
      );
    } catch (e: any) {
      setError(e?.message || "Ошибка сети при обновлении статуса");
    } finally {
      setUpdatingById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  useEffect(() => {
    if (!hasToken || !token) return;
    fetchLeads(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, token]);

  function handleSaveToken(e: React.FormEvent) {
    e.preventDefault();
    const value = tokenInput.trim();
    if (!value) return;

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } catch {
      // ignore
    }

    setToken(value);
    setError(null);
  }

  function handleLogout() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
    setToken(null);
    setTokenInput("");
    setData([]);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Лиды</h1>
            <p className="text-sm text-gray-600">
              Просмотр заявок клиентов (admin-only)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasToken && (
              <>
                <button
                  type="button"
                  onClick={() => token && fetchLeads(token)}
                  disabled={loading}
                  className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Обновить
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                >
                  Сбросить токен
                </button>
              </>
            )}
          </div>
        </div>

        {!hasToken && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              Введите admin токен (будет сохранён в localStorage как{" "}
              <code className="px-1 py-0.5 bg-gray-100 rounded">
                {TOKEN_STORAGE_KEY}
              </code>
              ).
            </p>

            <form onSubmit={handleSaveToken} className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ADMIN_API_TOKEN"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                autoFocus
              />
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                Сохранить
              </button>
            </form>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-md border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && <div className="mb-4 text-sm text-gray-600">Загрузка…</div>}

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b">Created at</th>
                <th className="px-3 py-2 border-b">Specialist</th>
                <th className="px-3 py-2 border-b">Client</th>
                <th className="px-3 py-2 border-b">Email</th>
                <th className="px-3 py-2 border-b">Phone</th>
                <th className="px-3 py-2 border-b">Message</th>
                <th className="px-3 py-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-600" colSpan={7}>
                    {hasToken
                      ? "Нет лидов (или не удалось загрузить)."
                      : "Введите токен, чтобы загрузить лиды."}
                  </td>
                </tr>
              ) : (
                data.map((lead) => {
                  const createdAt = lead.created_at
                    ? new Date(lead.created_at).toLocaleString("ru-RU")
                    : "—";
                  const specialistName = lead.specialist?.name || "—";
                  const isUpdating = !!updatingById[lead.id];
                  const currentStatus = ALLOWED_STATUSES.includes(
                    lead.status as LeadStatus
                  )
                    ? (lead.status as LeadStatus)
                    : "";

                  return (
                    <tr key={lead.id} className="align-top">
                      <td className="px-3 py-2 border-b whitespace-nowrap">
                        {createdAt}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="font-medium text-gray-900">
                          {specialistName}
                        </div>
                        {lead.specialist?.category_id ? (
                          <div className="text-xs text-gray-500">
                            category_id: {lead.specialist.category_id}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {lead.client_name || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {lead.client_email || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {lead.client_phone || "—"}
                      </td>
                      <td className="px-3 py-2 border-b max-w-[420px] whitespace-pre-wrap">
                        {lead.message || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <select
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm bg-white disabled:opacity-50"
                          value={currentStatus}
                          disabled={isUpdating || !hasToken}
                          onChange={(e) => {
                            const next = e.target.value as LeadStatus;
                            if (!ALLOWED_STATUSES.includes(next)) return;
                            updateLeadStatus(lead.id, next);
                          }}
                        >
                          <option value="" disabled>
                            —
                          </option>
                          {ALLOWED_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

