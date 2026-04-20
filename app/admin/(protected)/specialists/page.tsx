"use client";

import React, { useEffect, useMemo, useState } from "react";

type Application = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  category: string | null;
  about_short: string | null;
  proof_link: string | null;
  created_at: string | null;
  status: string | null;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  claim_url?: string | null;
  claim_token_used_at?: string | null;
  specialist_id?: string | null;
  is_active?: boolean | null;
  source?: "application" | "specialist";
  can_resend_claim?: boolean;
};

type ApiResponse = { data: Application[] } | { error: string };

type UpdateResponse =
  | { success: true; updated: unknown; email_sent?: boolean; email_error?: string; claim_url?: string }
  | { error: string };

const TOKEN_STORAGE_KEY = "ADMIN_API_TOKEN";

type StatusTab = "pending_review" | "approved" | "rejected";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "pending_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminSpecialistsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const [data, setData] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingById, setUpdatingById] = useState<Record<string, boolean>>({});
  const [togglingActiveById, setTogglingActiveById] = useState<Record<string, boolean>>({});
  const [moderatingById, setModeratingById] = useState<Record<string, boolean>>({});
  const [resendingById, setResendingById] = useState<Record<string, boolean>>({});
  const [deletingSpecialistById, setDeletingSpecialistById] = useState<
    Record<string, boolean>
  >({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [expandedRejectionId, setExpandedRejectionId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; reason: string } | null>(null);
  const [activeStatus, setActiveStatus] = useState<StatusTab>("pending_review");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastClaimUrl, setLastClaimUrl] = useState<string | null>(null);

  const hasToken = useMemo(() => !!token && token.trim().length > 0, [token]);

  function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  }

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

  async function fetchSpecialists(
    activeToken: string,
    statusFilter: StatusTab = activeStatus
  ) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/specialists/pending?status=${statusFilter}`,
        {
          method: "GET",
          headers: {
            "x-admin-token": activeToken,
          },
        }
      );

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
        setPendingCount(0);
        setError("Токен недействителен. Введите токен заново.");
        return;
      }

      if (!res.ok) {
        const message =
          "error" in json && typeof json.error === "string"
            ? json.error
            : "Не удалось загрузить заявки";
        setError(message);
        return;
      }

      if ("data" in json && Array.isArray(json.data)) {
        setData(json.data);
        if (statusFilter === "pending_review") {
          setPendingCount(json.data.length);
        }
        return;
      }

      setError("Некорректный ответ API");
    } catch (e: any) {
      setError(e?.message || "Ошибка сети при загрузке заявок");
    } finally {
      setLoading(false);
    }
  }

  async function updateSpecialistStatus(
    id: string,
    status: "approved" | "rejected",
    rejection_reason?: string
  ) {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken || !activeToken.trim()) {
      setError("Введите токен, чтобы менять статус заявок.");
      return;
    }
    if (status === "rejected" && (!rejection_reason || !rejection_reason.trim())) {
      setToast({ type: "error", message: "Укажите причину отклонения." });
      return;
    }

    setUpdatingById((prev) => ({ ...prev, [id]: true }));
    setError(null);
    setToast(null);
    setRejectModal(null);

    try {
      const res = await fetch("/api/admin/specialists/update", {
        method: "POST",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status, rejection_reason: status === "rejected" ? rejection_reason?.trim() : undefined }),
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
            : "Не удалось обновить статус заявки";
        setToast({ type: "error", message: errorMessage });
        return;
      }

      setData((prev) => prev.filter((app) => app.id !== id));
      setPendingCount((prev) => Math.max(0, prev - 1));
      const claimUrl = status === "approved" && "claim_url" in json && typeof json.claim_url === "string" ? json.claim_url : "";
      if (claimUrl) setLastClaimUrl(claimUrl);
      if (status === "approved" && "email_sent" in json && json.email_sent === false) {
        const err = "email_error" in json ? json.email_error : "";
        if (claimUrl && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(claimUrl).catch(() => {});
        }
        setToast({
          type: "error",
          message: `Заявка одобрена. Письмо не отправлено${err ? `: ${err}` : ""}. Ссылка для входа скопирована в буфер — отправьте специалисту вручную.`,
        });
      } else {
        setToast({
          type: "success",
          message: status === "approved" ? "Заявка одобрена" : "Заявка отклонена",
        });
      }
    } catch (e: any) {
      setToast({
        type: "error",
        message: e?.message || "Ошибка сети при обновлении статуса",
      });
    } finally {
      setUpdatingById((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function hardDeleteSpecialist(specialistId: string) {
    const activeToken = token?.trim();
    if (!activeToken) {
      setToast({ type: "error", message: "Введите токен." });
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !anonKey) {
      setToast({
        type: "error",
        message:
          "Не заданы NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY (нужны для Edge Function).",
      });
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Безвозвратно удалить специалиста, файлы в Storage и связанные данные в БД?"
      )
    ) {
      return;
    }
    const deleteAuthUser =
      typeof window !== "undefined" &&
      window.confirm(
        "Также удалить учётную запись входа Supabase Auth (auth.users) для этого пользователя? «Отмена» — оставить только удаление профиля и данных."
      );

    setDeletingSpecialistById((prev) => ({ ...prev, [specialistId]: true }));
    setToast(null);
    try {
      const res = await fetch(`${baseUrl}/functions/v1/admin_delete_specialist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
          "x-admin-token": activeToken,
        },
        body: JSON.stringify({
          specialist_id: specialistId,
          delete_auth_user: deleteAuthUser,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        auth_user_deleted?: boolean;
      };
      if (!res.ok || !json.ok) {
        const msg =
          typeof json.error === "string"
            ? json.error
            : res.status === 404
              ? "Специалист не найден"
              : "Не удалось удалить специалиста";
        setToast({ type: "error", message: msg });
        return;
      }
      setToast({
        type: "success",
        message: json.auth_user_deleted
          ? "Специалист и учётная запись входа удалены."
          : "Специалист и связанные данные удалены.",
      });
      await fetchSpecialists(activeToken, activeStatus);
    } catch (e: unknown) {
      setToast({
        type: "error",
        message: e instanceof Error ? e.message : "Ошибка запроса",
      });
    } finally {
      setDeletingSpecialistById((prev) => ({ ...prev, [specialistId]: false }));
    }
  }

  async function handleResendClaim(appId: string) {
    const activeToken = token?.trim();
    if (!activeToken) return;
    setResendingById((prev) => ({ ...prev, [appId]: true }));
    setToast(null);
    try {
      const res = await fetch("/api/admin/specialists/update", {
        method: "POST",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "resend_claim", application_id: appId }),
      });
      const json = (await res.json()) as UpdateResponse & { claim_url?: string; email_sent?: boolean; email_error?: string };
      if (!res.ok) {
        const msg = "error" in json && typeof json.error === "string" ? json.error : "Не удалось выслать ссылку";
        setToast({ type: "error", message: msg });
        return;
      }
      const newClaimUrl = json.claim_url;
      if (newClaimUrl && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(newClaimUrl).catch(() => {});
      }
      setLastClaimUrl(newClaimUrl ?? null);
      setToast({
        type: "success",
        message: json.email_sent
          ? "Новая ссылка отправлена на email специалиста и скопирована в буфер."
          : "Новая ссылка создана и скопирована в буфер. Отправьте её специалисту вручную.",
      });
      await fetchSpecialists(activeToken, activeStatus);
    } catch (e: any) {
      setToast({ type: "error", message: e?.message ?? "Ошибка запроса" });
    } finally {
      setResendingById((prev) => ({ ...prev, [appId]: false }));
    }
  }

  async function updateSpecialistActive(specialistId: string, nextIsActive: boolean) {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken || !activeToken.trim()) {
      setError("Введите токен, чтобы менять активность специалиста.");
      return;
    }

    setTogglingActiveById((prev) => ({ ...prev, [specialistId]: true }));
    setToast(null);

    try {
      const res = await fetch(`/api/admin/update-specialist`, {
        method: "POST",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: specialistId, action: "activate", is_active: nextIsActive }),
      });

      const json = (await res.json()) as { success?: boolean; data?: { id: string; is_active: boolean }; error?: string };

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

      if (!res.ok || !json?.data) {
        setToast({ type: "error", message: json?.error || "Не удалось обновить активность специалиста" });
        return;
      }

      setData((prev) =>
        prev.map((app) =>
          app.specialist_id === specialistId ? { ...app, is_active: json.data!.is_active } : app
        )
      );
      setToast({
        type: "success",
        message: json.data.is_active ? "Специалист активирован" : "Специалист деактивирован",
      });
    } catch (e: any) {
      setToast({ type: "error", message: e?.message || "Ошибка сети при обновлении активности" });
    } finally {
      setTogglingActiveById((prev) => ({ ...prev, [specialistId]: false }));
    }
  }

  async function moderateSpecialist(
    specialistId: string,
    action: "approve" | "feature" | "deactivate"
  ) {
    const activeToken = token || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken || !activeToken.trim()) {
      setError("Введите токен, чтобы модерировать специалиста.");
      return;
    }

    setModeratingById((prev) => ({ ...prev, [specialistId]: true }));
    setToast(null);

    try {
      const res = await fetch(`/api/admin/update-specialist`, {
        method: "POST",
        headers: {
          "x-admin-token": activeToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: specialistId,
          action: action === "approve" ? "verify" : action,
        }),
      });

      const json = (await res.json()) as { error?: string };

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
        setToast({ type: "error", message: json?.error || "Не удалось обновить специалиста" });
        return;
      }

      setToast({
        type: "success",
        message:
          action === "approve"
            ? "Специалист верифицирован"
            : action === "feature"
              ? "Специалист отмечен как featured"
              : "Специалист деактивирован",
      });
      await fetchSpecialists(activeToken, activeStatus);
    } catch (e: any) {
      setToast({ type: "error", message: e?.message || "Ошибка сети при модерации специалиста" });
    } finally {
      setModeratingById((prev) => ({ ...prev, [specialistId]: false }));
    }
  }

  useEffect(() => {
    if (!hasToken || !token) return;
    fetchSpecialists(token, activeStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, token, activeStatus]);

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
    setPendingCount(0);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Заявки специалистов
            </h1>
            <p className="text-sm text-gray-600">
              Модерация заявок: одобрение / отклонение с указанием причины (admin-only)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {hasToken && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    token && fetchSpecialists(token, activeStatus)
                  }
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

        {hasToken && (
          <div className="mb-6 flex gap-1 border-b border-gray-200">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveStatus(tab.value);
                  setExpandedRejectionId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition ${
                  activeStatus === tab.value
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
                {tab.value === "pending_review" && pendingCount > 0 && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

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

        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Причина отклонения</h3>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => prev ? { ...prev, reason: e.target.value } : null)}
                placeholder="Укажите причину отклонения заявки (обязательно)"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (rejectModal.reason.trim()) {
                      updateSpecialistStatus(rejectModal.id, "rejected", rejectModal.reason);
                    } else {
                      setToast({ type: "error", message: "Укажите причину отклонения." });
                    }
                  }}
                  disabled={!rejectModal.reason.trim() || !!updatingById[rejectModal.id]}
                  className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  {updatingById[rejectModal.id] ? "…" : "Отклонить"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-700">
                <th className="px-3 py-2 border-b">Дата</th>
                <th className="px-3 py-2 border-b">Email</th>
                <th className="px-3 py-2 border-b">Имя</th>
                <th className="px-3 py-2 border-b">Телефон</th>
                <th className="px-3 py-2 border-b">Категория</th>
                <th className="px-3 py-2 border-b">Документ</th>
                <th className="px-3 py-2 border-b">О себе</th>
                <th className="px-3 py-2 border-b">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-gray-600" colSpan={8}>
                    {hasToken
                      ? activeStatus === "pending_review"
                        ? "Нет заявок на модерацию (или не удалось загрузить)."
                        : `Нет заявок со статусом ${STATUS_TABS.find((t) => t.value === activeStatus)?.label ?? activeStatus}.`
                      : "Введите токен, чтобы загрузить заявки."}
                  </td>
                </tr>
              ) : (
                data.map((app) => {
                  const createdAt = app.created_at ? new Date(app.created_at).toLocaleString("ru-RU") : "—";
                  const isUpdating = !!updatingById[app.id];
                  const specialistId = typeof app.specialist_id === "string" ? app.specialist_id : null;
                  const hasActiveValue = typeof app.is_active === "boolean";
                  const isTogglingActive = specialistId ? !!togglingActiveById[specialistId] : false;
                  const isModerating = specialistId ? !!moderatingById[specialistId] : false;
                  const isRejected = app.status === "rejected";
                  const isExpanded = expandedRejectionId === app.id && isRejected;

                  return (
                    <React.Fragment key={app.id}>
                      <tr className="align-top">
                        <td className="px-3 py-2 border-b whitespace-nowrap">{createdAt}</td>
                        <td className="px-3 py-2 border-b">{app.email || "—"}</td>
                        <td className="px-3 py-2 border-b font-medium text-gray-900">{app.name || "—"}</td>
                        <td className="px-3 py-2 border-b">{app.phone || "—"}</td>
                        <td className="px-3 py-2 border-b">{app.category || "—"}</td>
                        <td className="px-3 py-2 border-b">
                          {app.proof_link ? (
                            <a href={app.proof_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              Открыть
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 border-b max-w-[200px] truncate" title={app.about_short || ""}>
                          {app.about_short || "—"}
                        </td>
                        <td className="px-3 py-2 border-b">
                          <div className="flex flex-wrap items-center gap-2">
                            {specialistId && hasActiveValue ? (
                              <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={!!app.is_active}
                                  onChange={(e) => updateSpecialistActive(specialistId, e.target.checked)}
                                  disabled={isTogglingActive || !hasToken}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                                />
                                Active
                              </label>
                            ) : null}
                            {specialistId && (
                              <>
                                {activeStatus === "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => hardDeleteSpecialist(specialistId)}
                                    disabled={
                                      !!deletingSpecialistById[specialistId] || !hasToken
                                    }
                                    className="px-3 py-1 rounded-md border border-gray-800 text-xs font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                                  >
                                    {deletingSpecialistById[specialistId]
                                      ? "…"
                                      : "Удалить навсегда"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => moderateSpecialist(specialistId, "approve")}
                                  disabled={isModerating || !hasToken}
                                  className="px-3 py-1 rounded-md border border-green-300 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
                                >
                                  Верифицировать
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moderateSpecialist(specialistId, "feature")}
                                  disabled={isModerating || !hasToken}
                                  className="px-3 py-1 rounded-md border border-amber-300 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  Featured
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moderateSpecialist(specialistId, "deactivate")}
                                  disabled={isModerating || !hasToken}
                                  className="px-3 py-1 rounded-md border border-red-300 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  Деактивировать
                                </button>
                              </>
                            )}
                            {isRejected && (
                              <button
                                type="button"
                                onClick={() => setExpandedRejectionId((prev) => (prev === app.id ? null : app.id))}
                                className="text-xs font-medium text-gray-600 underline hover:text-gray-900"
                              >
                                {isExpanded ? "Скрыть причину" : "Причина"}
                              </button>
                            )}
                            {activeStatus === "pending_review" && app.status != null && ["pending", "pending_review"].includes(app.status) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => updateSpecialistStatus(app.id, "approved")}
                                  disabled={isUpdating}
                                  className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isUpdating ? "…" : "Одобрить"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectModal({ id: app.id, reason: "" })}
                                  disabled={isUpdating || !hasToken}
                                  className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
                                >
                                  Отклонить
                                </button>
                              </>
                            )}
                            {activeStatus === "approved" && !isRejected && (app.claim_url || app.email) && (
                              <>
                                {app.claim_url && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                                          navigator.clipboard.writeText(app.claim_url!).catch(() => {});
                                        }
                                        setLastClaimUrl(app.claim_url!);
                                        setToast({
                                          type: "success",
                                          message: "Ссылка на кабинет скопирована в буфер обмена.",
                                        });
                                      }}
                                      className="px-3 py-1 rounded-md border border-blue-300 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                    >
                                      Скопировать ссылку
                                    </button>
                                    {app.claim_token_used_at ? (
                                      <span className="px-3 py-1 text-xs text-gray-500">
                                        Кабинет уже активирован
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (app.claim_url) {
                                            window.open(app.claim_url, "_blank");
                                          }
                                        }}
                                        className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                                      >
                                        Открыть кабинет
                                      </button>
                                    )}
                                  </>
                                )}
                                {app.can_resend_claim !== false ? (
                                  <button
                                    type="button"
                                    onClick={() => handleResendClaim(app.id)}
                                    disabled={!!resendingById[app.id] || !hasToken}
                                    className="px-3 py-1 rounded-md border border-blue-300 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                  >
                                    {resendingById[app.id] ? "…" : "Выслать ссылку повторно"}
                                  </button>
                                ) : null}
                              </>
                            )}
                            {activeStatus !== "pending_review" && !isRejected && !app.claim_url && !app.email && "—"}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="border-b bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            <div className="space-y-1">
                              <div>
                                <span className="font-medium text-gray-700">Отклонено: </span>
                                {formatDateTime(app.rejected_at)}
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Причина: </span>
                                <span className="whitespace-pre-wrap">{app.rejection_reason?.trim() || "—"}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

