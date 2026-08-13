"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { publicPageContainerClass } from "@/components/public/publicStyles";
import SpecialistLegalAcceptanceFields from "@/components/legal/SpecialistLegalAcceptanceFields";
import { getSupabase } from "@/lib/supabaseClient";
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

  function validateLegalAcceptance(): boolean {
    if (!b2bAccepted || !agbAccepted || !rulesAccepted || !privacyAcknowledged) {
      setLegalError(
        lang === "de"
          ? "Bitte bestätigen Sie alle erforderlichen rechtlichen Angaben."
          : lang === "ru"
            ? "Пожалуйста, подтвердите все обязательные юридические пункты."
            : "Будь ласка, підтвердьте всі обов’язкові юридичні пункти.",
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
        }),
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
            }),
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
        ? `/${lang}/specialist/dashboard/onboarding?reason=incomplete_profile`
        : "/ru/specialist/dashboard/onboarding?reason=incomplete_profile";
      router.replace(onboardingHref);
    } catch {
      setError("Не вдалося створити акаунт. Спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-freuly-page py-freuly-10">
      <div className={publicPageContainerClass}>
        <Card padding="lg" className="mx-auto max-w-xl shadow-none">
          <CardHeader>
            <CardTitle className="text-freuly-page-title">
              {t(dict, "application.quickRegister.title", { defaultValue: "Реєстрація спеціаліста" })}
            </CardTitle>
            <p className="mt-freuly-1 text-freuly-body-sm text-freuly-text-secondary">
              {t(dict, "application.quickRegister.subtitle", {
                defaultValue: "Мінімальні кроки: email, телефон і пароль.",
              })}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-freuly-4" onSubmit={onSubmit}>
              <Input
                id="register-first-name"
                label={t(dict, "auth.first_name")}
                type="text"
                name="firstName"
                required
                minLength={2}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t(dict, "auth.first_name_placeholder")}
              />
              <Input
                id="register-last-name"
                label={t(dict, "auth.last_name")}
                type="text"
                name="lastName"
                required
                minLength={2}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t(dict, "auth.last_name_placeholder")}
              />
              <Input
                id="register-email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(dict, "application.quickRegister.emailPlaceholder", { defaultValue: "you@example.com" })}
              />
              <Input
                id="register-phone"
                label={t(dict, "application.quickRegister.phoneLabel", { defaultValue: "Телефон" })}
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t(dict, "application.quickRegister.phonePlaceholder", { defaultValue: "+49 …" })}
              />
              <Input
                id="register-password"
                label={t(dict, "application.quickRegister.password", { defaultValue: "Пароль" })}
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t(dict, "application.quickRegister.passwordPlaceholder", {
                  defaultValue: "Мінімум 8 символів",
                })}
              />

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
              <p className="text-freuly-helper leading-relaxed text-freuly-text-secondary">
                {getEarlyAccessConsentHint(lang)}
              </p>

              {error ? <Alert variant="error">{error}</Alert> : null}

              <Button
                type="submit"
                disabled={loading || !b2bAccepted || !agbAccepted || !rulesAccepted || !privacyAcknowledged}
                className="w-full"
              >
                {loading
                  ? t(dict, "application.quickRegister.creating", { defaultValue: "Створюємо акаунт…" })
                  : t(dict, "application.quickRegister.button", {
                      defaultValue: "Створити акаунт і перейти в кабінет",
                    })}
              </Button>
            </form>
            <p className="mt-freuly-4 text-freuly-helper text-freuly-text-muted">
              {t(dict, "application.quickRegister.loginLine", { defaultValue: "Вже є акаунт?" })}{" "}
              <Link href="/login" className="font-medium text-freuly-primary hover:text-freuly-primary-hover">
                {t(dict, "application.quickRegister.loginLink", { defaultValue: "Увійти" })}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
