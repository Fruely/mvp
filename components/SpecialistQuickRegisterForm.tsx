"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { specialistDashboardHref, specialistDashboardHrefClient } from "@/lib/specialists/dashboardHref";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  lang?: string;
  dict: Dictionary;
};

export default function SpecialistQuickRegisterForm({ dict, lang }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [specialistRulesAccepted, setSpecialistRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulesHref = lang ? `/${lang}/specialist-rules` : "/ua/specialist-rules";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!specialistRulesAccepted) {
      setError(
        t(dict, "application.errors.specialistRulesRequired", {
          defaultValue: "Потрібно прийняти правила розміщення спеціалістів",
        })
      );
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (trimmedFirstName.length < 2 || trimmedLastName.length < 2) {
      setError(
        t(dict, "application.quickRegister.nameTooShort", {
          defaultValue: "Ім'я та прізвище мають бути не коротші за 2 символи.",
        })
      );
      return;
    }

    const name = `${trimmedFirstName} ${trimmedLastName}`.trim();
    setLoading(true);
    try {
      const res = await fetch("/api/specialists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          password,
          name,
          specialist_rules_accepted: true,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (payload?.error === "specialist_rules_required") {
          setError(
            t(dict, "application.errors.specialistRulesRequired", {
              defaultValue: "Потрібно прийняти правила розміщення спеціалістів",
            })
          );
          return;
        }
        setError(typeof payload?.error === "string" ? payload.error : "Не вдалося створити акаунт.");
        return;
      }

      const supabase = getSupabase();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError("Аккаунт створено, але не вдалося виконати вхід. Увійдіть вручну.");
        router.push("/login");
        return;
      }

      router.refresh();
      router.replace(lang ? specialistDashboardHref(lang) : specialistDashboardHrefClient());
    } catch {
      setError("Не вдалося створити акаунт. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">
        {t(dict, "application.quickRegister.title", { defaultValue: "Реєстрація спеціаліста" })}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {t(dict, "application.quickRegister.subtitle", {
          defaultValue: "Мінімальні кроки: email, телефон і пароль.",
        })}
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{t(dict, "auth.first_name")}</label>
          <input
            type="text"
            name="firstName"
            required
            minLength={2}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t(dict, "auth.first_name_placeholder")}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">{t(dict, "auth.last_name")}</label>
          <input
            type="text"
            name="lastName"
            required
            minLength={2}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t(dict, "auth.last_name_placeholder")}
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
            placeholder={t(dict, "application.quickRegister.emailPlaceholder", { defaultValue: "you@example.com" })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {t(dict, "application.quickRegister.phoneLabel", { defaultValue: "Телефон" })}
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t(dict, "application.quickRegister.phonePlaceholder", { defaultValue: "+49 …" })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            {t(dict, "application.quickRegister.password", { defaultValue: "Пароль" })}
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder={t(dict, "application.quickRegister.passwordPlaceholder", {
              defaultValue: "Мінімум 8 символів",
            })}
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={specialistRulesAccepted}
              onChange={(e) => setSpecialistRulesAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-800 leading-snug">
              {t(dict, "application.specialistRulesCheckbox.before")}{" "}
              <Link
                href={rulesHref}
                className="font-semibold text-blue-600 underline hover:text-blue-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(dict, "application.specialistRulesCheckbox.link")}
              </Link>{" "}
              {t(dict, "application.specialistRulesCheckbox.after")}
              <span className="text-red-500"> *</span>
            </span>
          </label>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !specialistRulesAccepted}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? t(dict, "application.quickRegister.creating", { defaultValue: "Створюємо акаунт…" })
            : t(dict, "application.quickRegister.button", {
                defaultValue: "Створити акаунт і перейти в кабінет",
              })}
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-500">
        {t(dict, "application.quickRegister.loginLine", { defaultValue: "Вже є акаунт?" })}{" "}
        <a className="text-blue-600 hover:text-blue-700" href="/login">
          {t(dict, "application.quickRegister.loginLink", { defaultValue: "Увійти" })}
        </a>
      </p>
    </div>
  );
}
