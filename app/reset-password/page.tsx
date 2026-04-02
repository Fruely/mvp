"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { isSupportedLang } from "@/lib/i18n";

function readFreulyLangFromCookie(): string {
  if (typeof document === "undefined") return "ua";
  const match = document.cookie.match(/(?:^|;\s*)freuly_lang=([^;]*)/);
  if (!match?.[1]) return "ua";
  const v = decodeURIComponent(match[1].trim());
  return isSupportedLang(v) ? v : "ua";
}

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginHref, setLoginHref] = useState("/ua/login");

  useEffect(() => {
    setLoginHref(`/${readFreulyLangFromCookie()}/login`);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Введіть email");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (resetError) {
        setError(resetError.message || "Помилка відправки");
        return;
      }
      setSent(true);
    } catch {
      setError("Помилка мережі");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-[40vh] px-4 py-10">
        <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">Перевірте пошту</h2>
          <p className="mt-2 text-sm text-gray-600">
            Ми надіслали лист для відновлення пароля.
          </p>
          <a
            href={loginHref}
            className="mt-4 inline-block text-sm text-blue-600 hover:underline"
          >
            Повернутися до входу
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Відновлення пароля</h2>
        <p className="mt-1 text-sm text-gray-600">
          Введіть email, на який зареєстрований ваш акаунт.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Надсилання…" : "Надіслати лист"}
          </button>
        </form>
        <a
          href={loginHref}
          className="mt-4 block text-center text-sm text-blue-600 hover:underline"
        >
          Повернутися до входу
        </a>
      </section>
    </div>
  );
}
