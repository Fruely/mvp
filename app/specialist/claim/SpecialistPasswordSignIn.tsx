"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, SPECIALIST_OFFICE_PATH } from "@/lib/supabaseClient";

export default function SpecialistPasswordSignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Введите email и пароль");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (signInError) {
        if (signInError.message?.toLowerCase().includes("invalid login")) {
          setError("Неверный email или пароль");
        } else {
          setError(signInError.message || "Ошибка входа");
        }
        return;
      }
      if (data.session) {
        router.replace(SPECIALIST_OFFICE_PATH);
        router.refresh();
      } else {
        setError(
          "Вход выполнен, но сессия не создана. Проверьте подтверждение email в письме или попробуйте ещё раз."
        );
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Вход в кабинет</h2>
      <p className="mt-1 text-sm text-gray-600">
        Введите email и пароль, которые вы задали при первом входе.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="claim-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="claim-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="claim-password" className="block text-sm font-medium text-gray-700">
            Пароль
          </label>
          <input
            id="claim-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Вход…" : "Войти"}
        </button>
        <a
          href="/ua/reset-password"
          className="mt-1 block text-center text-sm text-blue-600 hover:underline"
        >
          Забули пароль?
        </a>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        Нет пароля? Откройте ссылку из письма или запросите новую на{" "}
        <a href="mailto:info@freuly.de" className="text-blue-600 underline">
          info@freuly.de
        </a>
        .
      </p>
    </section>
  );
}
