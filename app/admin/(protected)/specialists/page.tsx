"use client";

import { useEffect, useMemo, useState } from "react";

type Specialist = {
  id: string;
  name: string | null;
  category: string | null;
  languages: string | null;
  created_at: string | null;
  status: string | null;
};

type ApiResponse = { data: Specialist[] } | { error: string };

type UpdateResponse = { success: true; updated: unknown } | { error: string };

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

export default function AdminSpecialistsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const [data, setData] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>(
    {}
  );
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const hasToken = useMemo(() => !!token && token.trim().length > 0, [token]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(
      () => setToast(null),
      toast.type === "success" ? 2500 : 4000
    );
    return () => clearTimeout(t);
  }, [toast]);

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

  async function fetchSpecialists(activeToken: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/specialists/pending", {
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
            : "Не удалось загрузить специалистов";
        setError(message);
        return;
      }

      if ("data" in json && Array.isArray(json.data)) {
        setData(json.data);
        return;
      }

      setError("Некорректный ответ API");
    } catch (e: any) {
      setError(e?.message || "Ошибка сети при загрузке специалистов");
    } finally {
      setLoading(false);
    }
  }

  async function updateSpecialistStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken || !activeToken.trim()) {
      setError("Введите токен, чтобы менять статус специалистов.");
      return;
    }

    setUpdatingById((prev) => ({ ...prev, [id]: true }));
    setError(null);
    setToast(null);

    try {
      const res = await fetch("/api/admin/specialists/update", {
        method: "POST",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const json = (await res.json()) as UpdateResponse;

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
        const errorMessage =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Не удалось обновить статус специалиста";
        setToast({ type: "error", message: errorMessage });
        return;
      }

      setData((prev) => prev.filter((specialist) => specialist.id !== id));
      setToast({
        type: "success",
        message:
          status === "approved" ? "Specialist approved" : "Specialist rejected",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message || "Ошибка сети при обновлении статуса",
      });
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
    fetchSpecialists(token);
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
            <h1 className="text-2xl font-bold text-gray-900">
              Ожидающие специалисты
            </h1>
            <p className="text-sm text-gray-600">
              Просмотр и одобрение/отклонение заявок специалистов (admin-only)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasToken && (
              <>
                <button
                  type="button"
                  onClick={() => token && fetchSpecialists(token)}
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

        {toast && (
          <div
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border px-4 py-3 shadow-lg transition-opacity"
            style={{
              backgroundColor:
                toast.type === "success" ? "#ecfdf5" : "#fef2f2",
              borderColor:
                toast.type === "success" ? "#a7f3d0" : "#fecaca",
              color: toast.type === "success" ? "#065f46" : "#991b1b",
            }}
            role="status"
          >
            {toast.message}
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b">Created at</th>
                <th className="px-3 py-2 border-b">Name</th>
                <th className="px-3 py-2 border-b">Category</th>
                <th className="px-3 py-2 border-b">Languages</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-600" colSpan={5}>
                    {hasToken
                      ? "Нет ожидающих специалистов (или не удалось загрузить)."
                      : "Введите токен, чтобы загрузить специалистов."}
                  </td>
                </tr>
              ) : (
                data.map((specialist) => {
                  const createdAt = specialist.created_at
                    ? new Date(specialist.created_at).toLocaleString("ru-RU")
                    : "—";
                  const isUpdating = !!updatingById[specialist.id];

                  return (
                    <tr key={specialist.id} className="align-top">
                      <td className="px-3 py-2 border-b whitespace-nowrap">
                        {createdAt}
                      </td>
                      <td className="px-3 py-2 border-b font-medium text-gray-900">
                        {specialist.name || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {specialist.category || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {specialist.languages || "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSpecialistStatus(specialist.id, "approved")
                            }
                            disabled={isUpdating || !hasToken}
                            className="px-3 py-1 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                          >
                            {isUpdating ? "…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSpecialistStatus(specialist.id, "rejected")
                            }
                            disabled={isUpdating || !hasToken}
                            className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                          >
                            {isUpdating ? "…" : "Reject"}
                          </button>
                        </div>
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

