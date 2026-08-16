"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { mapSupabaseAuthError } from "@/lib/auth/mapSupabaseAuthError";
import {
  getDictionary,
  isSupportedLang,
  langFromCookie,
  t,
  type Dictionary,
  type Lang,
} from "@/lib/i18n";

export default function ResetPasswordPage() {
  const params = useParams();
  const paramLang = typeof params?.lang === "string" ? params.lang : "";
  const lang: Lang = isSupportedLang(paramLang) ? paramLang : langFromCookie(null);

  const [dict, setDict] = useState<Dictionary | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getDictionary(lang).then(setDict);
  }, [lang]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t(dict ?? {}, "login.errorRequired"));
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      });
      if (resetError) {
        setError(mapSupabaseAuthError(resetError, dict ?? {}, "recovery"));
        return;
      }
      setSent(true);
    } catch {
      setError(t(dict ?? {}, "login.errorNetwork"));
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
            href={`/${lang}/login`}
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
          href={`/${lang}/login`}
          className="mt-4 block text-center text-sm text-blue-600 hover:underline"
        >
          Повернутися до входу
        </a>
      </section>
    </div>
  );
}
