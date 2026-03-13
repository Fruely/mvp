"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Пароль має містити мінімум 6 символів");
      return;
    }

    if (password !== confirm) {
      setError("Паролі не збігаються");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message || "Помилка оновлення пароля");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch {
      setError("Помилка мережі");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[40vh] px-4 py-10">
        <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <h2 className="text-lg font-semibold text-gray-900">Пароль оновлено</h2>
          <p className="mt-2 text-sm text-gray-600">
            Зараз вас буде перенаправлено на сторінку входу.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[40vh] px-4 py-10">
      <section className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Новий пароль</h2>
        <p className="mt-1 text-sm text-gray-600">
          Введіть новий пароль для вашого акаунту.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
              Новий пароль
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
              Підтвердіть пароль
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              required
              minLength={6}
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
            {loading ? "Оновлення…" : "Зберегти пароль"}
          </button>
        </form>
      </section>
    </div>
  );
}
