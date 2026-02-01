"use client";

import { useState } from "react";

export default function SetPasswordBlock() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/specialist/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data.error as string) || "Не удалось установить пароль");
        return;
      }
      setSuccess(true);
      setPassword("");
      setConfirm("");
      window.location.reload();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  if (success) return null;

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-semibold text-amber-900">
        Для защиты ваших данных задайте пароль
      </h2>
      <p className="mt-1 text-sm text-amber-800">
        После установки пароля вы сможете входить в кабинет по email и паролю.
        Ссылка из письма станет недействительной.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Пароль (мин. 8 символов)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Повторите пароль
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {loading ? "Сохранение…" : "Задать пароль"}
        </button>
      </form>
      <p className="mt-3 text-xs text-amber-700">
        Можно отложить и задать пароль позже, но для доступа к кабинету после
        истечения ссылки потребуется пароль или запрос новой ссылки на
        info@freuly.de.
      </p>
    </section>
  );
}
