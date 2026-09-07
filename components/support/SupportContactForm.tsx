"use client";

import { useState, type FormEvent } from "react";
import type { Lang } from "@/lib/i18n";

const copy = {
  ru: {
    name: "Ваше имя",
    email: "Email",
    subject: "Тема",
    message: "Сообщение",
    subjectPlaceholder: "Например: вопрос об оплате",
    messagePlaceholder: "Опишите, чем мы можем помочь",
    submit: "Отправить сообщение",
    sending: "Отправляем…",
    success: "Спасибо! Сообщение отправлено. Мы свяжемся с вами.",
    error: "Не удалось отправить сообщение. Попробуйте ещё раз или напишите нам на email.",
  },
  ua: {
    name: "Ваше ім’я",
    email: "Email",
    subject: "Тема",
    message: "Повідомлення",
    subjectPlaceholder: "Наприклад: запитання щодо оплати",
    messagePlaceholder: "Опишіть, чим ми можемо допомогти",
    submit: "Надіслати повідомлення",
    sending: "Надсилаємо…",
    success: "Дякуємо! Повідомлення надіслано. Ми зв’яжемося з вами.",
    error: "Не вдалося надіслати повідомлення. Спробуйте ще раз або напишіть нам на email.",
  },
  de: {
    name: "Ihr Name",
    email: "E-Mail",
    subject: "Betreff",
    message: "Nachricht",
    subjectPlaceholder: "Zum Beispiel: Frage zur Zahlung",
    messagePlaceholder: "Beschreiben Sie, wie wir Ihnen helfen können",
    submit: "Nachricht senden",
    sending: "Wird gesendet…",
    success: "Vielen Dank! Ihre Nachricht wurde gesendet. Wir melden uns bei Ihnen.",
    error: "Die Nachricht konnte nicht gesendet werden. Versuchen Sie es erneut oder schreiben Sie uns per E-Mail.",
  },
} as const;

const fieldClass =
  "mt-2 w-full rounded-xl border border-freuly-border-default bg-white px-4 py-3 text-freuly-text-primary outline-none transition focus:border-freuly-primary focus:ring-2 focus:ring-freuly-primary/20";

export default function SupportContactForm({ lang }: { lang: Lang }) {
  const text = copy[lang];
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
          lang,
        }),
      });
      if (!response.ok) throw new Error("request_failed");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-freuly-text-primary">
          {text.name}
          <input className={fieldClass} name="name" autoComplete="name" maxLength={100} required />
        </label>
        <label className="text-sm font-medium text-freuly-text-primary">
          {text.email}
          <input
            className={fieldClass}
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-freuly-text-primary">
        {text.subject}
        <input
          className={fieldClass}
          name="subject"
          maxLength={140}
          placeholder={text.subjectPlaceholder}
          required
        />
      </label>

      <label className="block text-sm font-medium text-freuly-text-primary">
        {text.message}
        <textarea
          className={fieldClass}
          name="message"
          rows={6}
          minLength={10}
          maxLength={5000}
          placeholder={text.messagePlaceholder}
          required
        />
      </label>

      <label className="hidden" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      {status === "success" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {text.success}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {text.error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-freuly-primary px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? text.sending : text.submit}
      </button>
    </form>
  );
}
