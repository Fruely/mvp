"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { privacyPath } from "@/lib/legal/paths";
import type { Lang } from "@/lib/i18n";
import { publicCardClass, publicFieldClass, publicLinkSecondaryClass } from "@/components/public/publicStyles";

type WorkFormat = "online" | "offline" | "hybrid";

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  taskLabel: string;
  taskPlaceholder: string;
  languageTitle: string;
  formatTitle: string;
  formatOnline: string;
  formatOffline: string;
  formatHybrid: string;
  cityLabel: string;
  cityPlaceholder: string;
  contactTitle: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  contactHint: string;
  continue: string;
  back: string;
  submit: string;
  submitting: string;
  privacyBefore: string;
  privacyLink: string;
  privacyAfter: string;
  requiredTask: string;
  requiredLocation: string;
  requiredName: string;
  requiredContact: string;
  submitFailed: string;
  successTitle: string;
  successBody: string;
  successId: string;
  explore: string;
  step: string;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    eyebrow: "Freuly · подбор специалиста",
    title: "Расскажите, что вам нужно решить",
    subtitle: "Опишите задачу своими словами. Мы подберём подходящего специалиста под вашу ситуацию.",
    taskLabel: "Что нужно сделать?",
    taskPlaceholder: "Например: нужна помощь с налоговой декларацией, не работает домашняя сеть, ищу психолога для подростка…",
    languageTitle: "На каком языке вам удобнее общаться со специалистом?",
    formatTitle: "Как вам удобнее получить услугу?",
    formatOnline: "Онлайн",
    formatOffline: "На месте",
    formatHybrid: "Неважно",
    cityLabel: "Где нужна услуга?",
    cityPlaceholder: "Город или индекс",
    contactTitle: "Куда сообщить результат подбора?",
    nameLabel: "Как к вам обращаться?",
    emailLabel: "Email",
    phoneLabel: "Телефон / WhatsApp",
    contactHint: "Достаточно одного контакта: email или телефона.",
    continue: "Продолжить",
    back: "Назад",
    submit: "Отправить задачу",
    submitting: "Отправляем…",
    privacyBefore: "Отправляя задачу, вы соглашаетесь с обработкой данных согласно ",
    privacyLink: "политике конфиденциальности",
    privacyAfter: ".",
    requiredTask: "Опишите задачу хотя бы одним предложением.",
    requiredLocation: "Укажите город или индекс для услуги на месте.",
    requiredName: "Укажите, как к вам обращаться.",
    requiredContact: "Укажите email или телефон.",
    submitFailed: "Не удалось отправить задачу. Попробуйте ещё раз.",
    successTitle: "Задача принята",
    successBody: "Мы получили ваш запрос и начнём подбирать подходящих специалистов.",
    successId: "Номер заявки",
    explore: "Перейти на Freuly",
    step: "Шаг",
  },
  ua: {
    eyebrow: "Freuly · підбір спеціаліста",
    title: "Розкажіть, що вам потрібно вирішити",
    subtitle: "Опишіть завдання своїми словами. Ми підберемо відповідного спеціаліста під вашу ситуацію.",
    taskLabel: "Що потрібно зробити?",
    taskPlaceholder: "Наприклад: потрібна допомога з податковою декларацією, не працює домашня мережа, шукаю психолога для підлітка…",
    languageTitle: "Якою мовою вам зручніше спілкуватися зі спеціалістом?",
    formatTitle: "Як вам зручніше отримати послугу?",
    formatOnline: "Онлайн",
    formatOffline: "На місці",
    formatHybrid: "Неважливо",
    cityLabel: "Де потрібна послуга?",
    cityPlaceholder: "Місто або індекс",
    contactTitle: "Куди повідомити результат підбору?",
    nameLabel: "Як до вас звертатися?",
    emailLabel: "Email",
    phoneLabel: "Телефон / WhatsApp",
    contactHint: "Достатньо одного контакту: email або телефону.",
    continue: "Продовжити",
    back: "Назад",
    submit: "Надіслати завдання",
    submitting: "Надсилаємо…",
    privacyBefore: "Надсилаючи завдання, ви погоджуєтесь з обробкою даних відповідно до ",
    privacyLink: "політики конфіденційності",
    privacyAfter: ".",
    requiredTask: "Опишіть завдання хоча б одним реченням.",
    requiredLocation: "Вкажіть місто або індекс для послуги на місці.",
    requiredName: "Вкажіть, як до вас звертатися.",
    requiredContact: "Вкажіть email або телефон.",
    submitFailed: "Не вдалося надіслати завдання. Спробуйте ще раз.",
    successTitle: "Завдання прийнято",
    successBody: "Ми отримали ваш запит і почнемо підбирати відповідних спеціалістів.",
    successId: "Номер заявки",
    explore: "Перейти на Freuly",
    step: "Крок",
  },
  de: {
    eyebrow: "Freuly · passende Fachkraft",
    title: "Beschreiben Sie, was Sie lösen möchten",
    subtitle: "Beschreiben Sie Ihre Aufgabe in eigenen Worten. Wir finden eine passende Fachkraft für Ihre Situation.",
    taskLabel: "Was soll erledigt werden?",
    taskPlaceholder: "Zum Beispiel: Hilfe mit der Steuererklärung, Heimnetzwerk funktioniert nicht, Psychologe für einen Jugendlichen gesucht…",
    languageTitle: "In welcher Sprache möchten Sie mit der Fachkraft sprechen?",
    formatTitle: "Wie möchten Sie die Leistung erhalten?",
    formatOnline: "Online",
    formatOffline: "Vor Ort",
    formatHybrid: "Beides möglich",
    cityLabel: "Wo wird die Leistung benötigt?",
    cityPlaceholder: "Stadt oder PLZ",
    contactTitle: "Wohin dürfen wir das Ergebnis der Vermittlung senden?",
    nameLabel: "Wie dürfen wir Sie ansprechen?",
    emailLabel: "E-Mail",
    phoneLabel: "Telefon / WhatsApp",
    contactHint: "Ein Kontakt reicht: E-Mail oder Telefonnummer.",
    continue: "Weiter",
    back: "Zurück",
    submit: "Aufgabe senden",
    submitting: "Wird gesendet…",
    privacyBefore: "Mit dem Absenden stimmen Sie der Datenverarbeitung gemäß unserer ",
    privacyLink: "Datenschutzerklärung",
    privacyAfter: " zu.",
    requiredTask: "Beschreiben Sie die Aufgabe mindestens in einem Satz.",
    requiredLocation: "Bitte Stadt oder PLZ für eine Vor-Ort-Leistung angeben.",
    requiredName: "Bitte geben Sie an, wie wir Sie ansprechen dürfen.",
    requiredContact: "Bitte E-Mail oder Telefonnummer angeben.",
    submitFailed: "Die Aufgabe konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
    successTitle: "Aufgabe erhalten",
    successBody: "Wir haben Ihre Anfrage erhalten und beginnen mit der Auswahl passender Fachkräfte.",
    successId: "Anfragenummer",
    explore: "Freuly ansehen",
    step: "Schritt",
  },
};

function choiceClass(active: boolean): string {
  return [
    "w-full rounded-2xl border px-5 py-4 text-left text-base font-semibold transition",
    active
      ? "border-freuly-primary bg-freuly-primary/5 text-freuly-primary"
      : "border-freuly-border-default bg-white text-freuly-text-primary hover:border-freuly-primary/40",
  ].join(" ");
}

export default function ClientDemandEntry({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>(lang);
  const [workFormat, setWorkFormat] = useState<WorkFormat>("online");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const needsLocation = workFormat === "offline" || workFormat === "hybrid";
  const progress = useMemo(() => Math.round((step / 4) * 100), [step]);

  function nextFromTask() {
    if (!description.trim()) {
      setError(copy.requiredTask);
      return;
    }
    setError(null);
    setStep(2);
  }

  function nextFromFormat() {
    if (needsLocation && !location.trim()) {
      setError(copy.requiredLocation);
      return;
    }
    setError(null);
    setStep(4);
  }

  async function submit() {
    if (!name.trim()) {
      setError(copy.requiredName);
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError(copy.requiredContact);
      return;
    }

    setLoading(true);
    setError(null);
    if (!idempotencyKey.current) {
      idempotencyKey.current = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    try {
      const payload = {
        client_name: name.trim(),
        client_email: email.trim() || null,
        client_phone: phone.trim() || null,
        description: description.trim(),
        preferred_language: preferredLanguage,
        work_format: workFormat,
        city: needsLocation ? location.trim() : null,
        postal_code: null,
        country_code: "DE",
        radius_km: null,
        service_timing_type: "flexible_period",
        service_timing_period: "flexible",
        service_timing_date: null,
        service_timing_time: null,
        service_timing_date_end: null,
        service_timing_note: null,
        locale: lang,
        category_id: null,
        category_text: null,
        source_path: `/${lang}/request`,
        idempotency_key: idempotencyKey.current,
        hp,
      };

      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        public_id?: string;
      };
      if (!response.ok || result.ok !== true || !result.public_id) {
        setError(copy.submitFailed);
        return;
      }
      setPublicId(result.public_id);
    } catch {
      setError(copy.submitFailed);
    } finally {
      setLoading(false);
    }
  }

  if (publicId) {
    return (
      <div className={`mx-auto max-w-2xl p-8 text-center sm:p-10 ${publicCardClass}`}>
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-freuly-primary/10 text-2xl text-freuly-primary">✓</div>
        <h1 className="text-3xl font-bold text-freuly-text-primary">{copy.successTitle}</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-freuly-text-secondary">{copy.successBody}</p>
        <p className="mt-6 text-sm font-semibold text-freuly-text-primary">{copy.successId}: {publicId}</p>
        <Link href={`/${lang}`} className={`${publicLinkSecondaryClass} mt-8 inline-flex`}>
          {copy.explore}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-freuly-primary">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-freuly-text-primary sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-freuly-text-secondary">{copy.subtitle}</p>
      </div>

      <div className={`p-6 sm:p-8 ${publicCardClass}`}>
        <div className="mb-7">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-freuly-text-muted">
            <span>{copy.step} {step}/4</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-freuly-border-subtle">
            <div className="h-full rounded-full bg-freuly-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <input
          type="text"
          name="hp"
          value={hp}
          onChange={(event) => setHp(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-lg font-semibold text-freuly-text-primary">{copy.taskLabel}</label>
              <textarea
                autoFocus
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={copy.taskPlaceholder}
                className={publicFieldClass}
              />
            </div>
            <Button type="button" className="w-full" onClick={nextFromTask}>{copy.continue}</Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-freuly-text-primary">{copy.languageTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["ru", "ua", "de"] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={choiceClass(preferredLanguage === code)}
                  onClick={() => setPreferredLanguage(code)}
                >
                  {code === "ru" ? "Русский" : code === "ua" ? "Українська" : "Deutsch"}
                </button>
              ))}
            </div>
            <Button type="button" className="w-full" onClick={() => { setError(null); setStep(3); }}>{copy.continue}</Button>
            <button type="button" className="w-full text-sm text-freuly-text-muted hover:text-freuly-text-primary" onClick={() => { setError(null); setStep(1); }}>{copy.back}</button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-freuly-text-primary">{copy.formatTitle}</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["online", copy.formatOnline],
                ["offline", copy.formatOffline],
                ["hybrid", copy.formatHybrid],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" className={choiceClass(workFormat === value)} onClick={() => setWorkFormat(value)}>{label}</button>
              ))}
            </div>
            {needsLocation ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.cityLabel}</label>
                <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={copy.cityPlaceholder} className={publicFieldClass} />
              </div>
            ) : null}
            <Button type="button" className="w-full" onClick={nextFromFormat}>{copy.continue}</Button>
            <button type="button" className="w-full text-sm text-freuly-text-muted hover:text-freuly-text-primary" onClick={() => { setError(null); setStep(2); }}>{copy.back}</button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-freuly-text-primary">{copy.contactTitle}</h2>
            <div>
              <label className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.nameLabel}</label>
              <input value={name} onChange={(event) => setName(event.target.value)} className={publicFieldClass} autoComplete="name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.emailLabel}</label>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={publicFieldClass} autoComplete="email" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-freuly-text-primary">{copy.phoneLabel}</label>
                <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={publicFieldClass} autoComplete="tel" />
              </div>
            </div>
            <p className="text-xs text-freuly-text-muted">{copy.contactHint}</p>
            <p className="text-xs leading-relaxed text-freuly-text-muted">
              {copy.privacyBefore}<Link href={privacyPath(lang)} className="underline hover:text-freuly-text-secondary">{copy.privacyLink}</Link>{copy.privacyAfter}
            </p>
            <Button type="button" className="w-full" disabled={loading} onClick={() => void submit()}>{loading ? copy.submitting : copy.submit}</Button>
            <button type="button" className="w-full text-sm text-freuly-text-muted hover:text-freuly-text-primary" disabled={loading} onClick={() => { setError(null); setStep(3); }}>{copy.back}</button>
          </div>
        ) : null}

        {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
