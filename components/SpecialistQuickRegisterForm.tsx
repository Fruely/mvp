"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";
import { specialistDashboardHref, specialistDashboardHrefClient } from "@/lib/specialists/dashboardHref";
import SpecialistLegalAcceptanceFields from "@/components/legal/SpecialistLegalAcceptanceFields";
import { t, type Dictionary } from "@/lib/i18n";

type Props = {
  lang?: string;
  dict: Dictionary;
};

function getEarlyAccessConsentHint(lang?: string) {
  if (lang === "de") {
    return "Dazu gehören die Bedingungen des kostenlosen 3-monatigen Startangebots für die ersten 50 veröffentlichten Spezialisten. Es wird kein kostenpflichtiges Abo automatisch aktiviert und es erfolgen keine automatischen Abbuchungen ohne separate Zustimmung.";
  }

  if (lang === "ua") {
    return "До них входять умови безкоштовного стартового розміщення на 3 місяці для перших 50 опублікованих спеціалістів. Платна підписка не підключається автоматично, автоматичних списань без окремої згоди не буде.";
  }

  return "В них входят условия бесплатного стартового размещения на 3 месяца для первых 50 опубликованных специалистов. Платная подписка не подключается автоматически, автоматических списаний без отдельного согласия не будет.";
}

export default function SpecialistQuickRegisterForm({ dict, lang }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [b2bAccepted, setB2bAccepted] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rulesHref = lang ? `/${lang}/specialist-rules` : "/ua/specialist-rules";

  function validateLegalAcceptance(): boolean {
    if (!b2bAccepted || !agbAccepted || !rulesAccepted || !privacyAcknowledged) {
      setLegalError(
        lang === "de"
          ? "Bitte bestätigen Sie alle erforderlichen rechtlichen Angaben."
          : lang === "ru"
            ? "Пожалуйста, подтвердите все обязательные юридические пункты."
            : "Будь ласка, підтвердьте всі обов’язкові юридичні пункти."
      );
      return false;
    }
    setLegalError(null);
    return true;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!validateLegalAcceptance()) {
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
          b2b_declaration_accepted: true,
          agb_accepted: true,
          privacy_acknowledged: true,
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

      const onboardingHref = lang
        ? `/${lang}/specialist/dashboard/onboarding?step=welcome&reason=incomplete_profile`
        : "/ru/specialist/dashboard/onboarding?step=welcome&reason=incomplete_profile";
      router.replace(onboardingHref);
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

        <SpecialistLegalAcceptanceFields
          lang={(lang ?? "ua") as "de" | "ru" | "ua"}
          b2bAccepted={b2bAccepted}
          agbAccepted={agbAccepted}
          rulesAccepted={rulesAccepted}
          privacyAcknowledged={privacyAcknowledged}
          onB2bChange={setB2bAccepted}
          onAgbChange={setAgbAccepted}
          onRulesChange={setRulesAccepted}
          onPrivacyChange={setPrivacyAcknowledged}
          error={legalError}
        />
        <p className="text-xs leading-relaxed text-gray-600">{getEarlyAccessConsentHint(lang)}</p>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={
            loading ||
            !b2bAccepted ||
            !agbAccepted ||
            !rulesAccepted ||
            !privacyAcknowledged
          }
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
        {t(dict, "application.quickRegister.loginLine", { defaultValue: "Вже є акаунт?" })} {" "}
        <a className="text-blue-600 hover:text-blue-700" href="/login">
          {t(dict, "application.quickRegister.loginLink", { defaultValue: "Увійти" })}
        </a>
      </p>
    </div>
  );
}
