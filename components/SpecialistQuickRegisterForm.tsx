"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, SPECIALIST_OFFICE_PATH } from "@/lib/supabaseClient";

type Props = {
  lang?: string;
};

export default function SpecialistQuickRegisterForm({}: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
      setError("Имя и фамилия должны быть не короче 2 символов.");
      return;
    }

    const name = `${trimmedFirstName} ${trimmedLastName}`.trim();
    setLoading(true);
    try {
      const res = await fetch("/api/specialists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, password, name }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Не удалось создать аккаунт.");
        return;
      }

      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError("Аккаунт создан, но не удалось выполнить вход. Войдите вручную.");
        router.push("/login");
        return;
      }

      router.push(SPECIALIST_OFFICE_PATH);
      router.refresh();
    } catch {
      setError("Не удалось создать аккаунт. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">Регистрация специалиста</h1>
      <p className="mt-1 text-sm text-gray-500">
        Минимальные шаги: email, телефон и пароль. После создания аккаунта вы сразу попадете в кабинет.
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">First name</label>
          <input
            type="text"
            name="firstName"
            required
            minLength={2}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Anna"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Last name</label>
          <input
            type="text"
            name="lastName"
            required
            minLength={2}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Muller"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Телефон</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="+49 ..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Пароль</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Минимум 8 символов"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Создаем аккаунт..." : "Создать аккаунт и перейти в кабинет"}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        Уже есть аккаунт? <a className="text-blue-600 hover:text-blue-700" href="/login">Войти</a>
      </p>
    </div>
  );
}
