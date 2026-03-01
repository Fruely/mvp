"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

function extractTokensFromUrl(
  searchParams: URLSearchParams | null,
  hashValue: string
): { accessToken: string | null; refreshToken: string | null } {
  const safeSearchParams = searchParams ?? new URLSearchParams();
  const hashParams = new URLSearchParams(hashValue.startsWith("#") ? hashValue.slice(1) : hashValue);

  const accessToken =
    hashParams.get("access_token") || safeSearchParams.get("access_token") || null;
  const refreshToken =
    hashParams.get("refresh_token") || safeSearchParams.get("refresh_token") || null;

  return { accessToken, refreshToken };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [sessionReady, setSessionReady] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hashValue = useMemo(
    () => (typeof window !== "undefined" ? window.location.hash : ""),
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function initSession() {
      setLoadingSession(true);
      setError(null);

      try {
        const supabase = getSupabase();
        const { accessToken, refreshToken } = extractTokensFromUrl(searchParams, hashValue);

        if (accessToken && refreshToken) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setSessionError) {
            if (!cancelled) {
              setError("Ссылка сброса недействительна или истекла.");
              setSessionReady(false);
            }
            return;
          }
          if (!cancelled) setSessionReady(true);
          return;
        }

        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setSessionReady(Boolean(data.session));
          if (!data.session) {
            setError("Ссылка сброса недействительна или истекла.");
          }
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось обработать ссылку сброса.");
          setSessionReady(false);
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    }

    void initSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams, hashValue]);

  async function handleReset(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }
    if (!sessionReady) {
      setError("Ссылка сброса недействительна или истекла.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError("Не удалось обновить пароль. Попробуйте ещё раз.");
        return;
      }
      setSuccess("Пароль обновлён. Теперь можно войти с новым паролем.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Не удалось обновить пароль. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Сброс пароля</h1>
        <p className="mt-1 text-sm text-gray-500">
          Введите новый пароль для входа в кабинет специалиста.
        </p>

        {loadingSession ? (
          <p className="mt-4 text-sm text-gray-600">Проверяем ссылку...</p>
        ) : (
          <form onSubmit={handleReset} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Повторите новый пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                autoComplete="new-password"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

            <button
              type="submit"
              disabled={saving || !sessionReady}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Сохраняем..." : "Обновить пароль"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

