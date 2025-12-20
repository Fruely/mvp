"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

type Specialist = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  email?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  category?: string | null;
  city?: string | null;
  languages?: string[] | null;
  status?: string | null;
  created_at?: string | null;
  avatar_url?: string | null;
};

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_PASSWORD) {
      setError("Пароль администратора не настроен. Проверь .env.local");
      return;
    }

    if (passwordInput.trim() === ADMIN_PASSWORD) {
      setIsAuthed(true);
      setError(null);
    } else {
      setError("Неверный пароль");
    }
  };

  const fetchSpecialists = async () => {
    setLoadingList(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/specialists/pending');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch');
      }

      console.log('[admin page] Loaded specialists:', result.data?.length, result.data);
      setSpecialists(result.data || []);
    } catch (err: any) {
      console.error("[admin] fetchSpecialists error:", err);
      setError("Не удалось загрузить список специалистов");
    }

    setLoadingList(false);
  };

  useEffect(() => {
    if (isAuthed) {
      fetchSpecialists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    setActionId(id);
    setError(null);

    try {
      const response = await fetch('/api/admin/specialists/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update');
      }

      setToast({
        type: "success",
        message:
          newStatus === "approved"
            ? "✓ Специалист одобрен"
            : "✗ Специалист отклонён",
      });

      setSpecialists((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error("[admin] updateStatus error:", err);
      setToast({
        type: "error",
        message: "Ошибка при обновлении статуса",
      });
    }

    setActionId(null);
    setTimeout(() => setToast(null), 3000);
  };

  // Экран логина
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 p-8 border border-gray-100">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-3xl font-bold text-white">F</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Админ-панель
            </h1>
            <p className="text-gray-500 text-sm text-center mb-8">
              Управление заявками специалистов
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль администратора
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-gray-900"
                  placeholder="Введите пароль"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Войти
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Админ-панель
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Хедер */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                <span className="text-xl font-bold text-white">F</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Freuly Admin</h1>
                <p className="text-xs text-gray-500">Модерация специалистов</p>
              </div>
            </div>

            <button
              onClick={fetchSpecialists}
              disabled={loadingList}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-400 transition-all disabled:opacity-50"
            >
              {loadingList ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Загрузка...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm font-medium">Обновить</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Заявки на модерацию
            <span className="ml-3 text-lg font-normal text-gray-500">
              ({specialists.length})
            </span>
          </h2>
        </div>

        {loadingList && specialists.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Загрузка заявок...</p>
            </div>
          </div>
        )}

        {!loadingList && specialists.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">Нет заявок на модерации</p>
            <p className="text-sm text-gray-400 mt-1">Все заявки обработаны</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-auto">
          {specialists.map((s) => {
            const displayName = s.name || s.full_name || "Без имени";
            const email = s.contact_email || s.email || "—";
            const phone = s.contact_phone || s.phone || "—";
            const city = s.city || "—";
            const category = s.category || "—";
            const langs = Array.isArray(s.languages) ? s.languages : [];

            console.log('[admin card render]', s.id, 'name:', displayName, 'email:', email);

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-gray-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 relative"
                style={{ minHeight: '450px' }}
              >
                {/* Хедер карточки */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    {s.avatar_url ? (
                      <Image
                        src={s.avatar_url}
                        alt={displayName}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs text-white/80">{category}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-yellow-400 text-yellow-900 text-[10px] font-bold uppercase tracking-wide">
                      NEW
                    </span>
                  </div>
                </div>

                {/* Детали */}
                <div className="p-4 space-y-3 pb-20">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Email</div>
                      <div className="text-gray-900 font-medium truncate">{email}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Телефон</div>
                      <div className="text-gray-900 font-medium">{phone}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-gray-500 mb-1">Город</div>
                      <div className="text-gray-900 font-medium">{city}</div>
                    </div>
                  </div>

                  {langs.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {langs.map((lng) => (
                        <span
                          key={lng}
                          className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium"
                        >
                          {lng}
                        </span>
                      ))}
                    </div>
                  )}

                  {s.created_at && (
                    <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                      {new Date(s.created_at).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {/* Кнопки действий */}
                <div className="p-4 flex gap-2 border-t border-gray-200 bg-white rounded-b-2xl shadow-sm absolute bottom-0 left-0 right-0">
                  <button
                    onClick={() => updateStatus(s.id, "approved")}
                    disabled={!!actionId}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-sm ring-1 ring-inset ring-blue-700/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionId === s.id ? "..." : "✓ Одобрить"}
                  </button>
                  <button
                    onClick={() => updateStatus(s.id, "rejected")}
                    disabled={!!actionId}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-sm ring-1 ring-inset ring-blue-700/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionId === s.id ? "..." : "✗ Отклонить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toast уведомление */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
            <div
              className={`px-6 py-4 rounded-2xl shadow-2xl border-2 ${
                toast.type === "success"
                  ? "bg-green-500 text-white border-green-400"
                  : "bg-red-500 text-white border-red-400"
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === "success" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{toast.message}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
