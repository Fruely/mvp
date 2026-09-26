"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type Preferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  timeZone: string | null;
  notificationLocale: string | null;
  marketingConsent: boolean;
};

const COPY: Record<Lang, {
  title: string;
  body: string;
  push: string;
  email: string;
  telegram: string;
  zone: string;
  save: string;
  saved: string;
  error: string;
}> = {
  ru: {
    title: "Уведомления",
    body: "Freuly сообщает о новых заявках и ответах. Разрешение на push запрашивает приложение в этот момент, а не при первом открытии сайта. История во входящих остаётся.",
    push: "Push",
    email: "Email",
    telegram: "Telegram",
    zone: "Часовой пояс",
    save: "Сохранить",
    saved: "Сохранено",
    error: "Не удалось сохранить",
  },
  ua: {
    title: "Сповіщення",
    body: "Freuly повідомляє про нові заявки і відповіді. Дозвіл на push запитує застосунок у цей момент, а не під час першого відкриття сайту. Історія у вхідних залишається.",
    push: "Push",
    email: "Email",
    telegram: "Telegram",
    zone: "Часовий пояс",
    save: "Зберегти",
    saved: "Збережено",
    error: "Не вдалося зберегти",
  },
  de: {
    title: "Benachrichtigungen",
    body: "Freuly meldet neue Anfragen und Antworten. Die Push-Erlaubnis fragt die App in diesem Moment ab, nicht beim ersten Öffnen der Website. Der Eingang bleibt erhalten.",
    push: "Push",
    email: "E-Mail",
    telegram: "Telegram",
    zone: "Zeitzone",
    save: "Speichern",
    saved: "Gespeichert",
    error: "Speichern fehlgeschlagen",
  },
};

export default function NotificationSettings({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [zone, setZone] = useState("Europe/Berlin");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notification-preferences")
      .then((response) => response.json())
      .then((payload: { preferences?: Preferences }) => {
        if (cancelled || !payload.preferences) return;
        setPrefs(payload.preferences);
        setZone(payload.preferences.timeZone || "Europe/Berlin");
      })
      .catch(() => {
        if (!cancelled) setMessage(copy.error);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.error]);

  async function save() {
    if (!prefs) return;
    setMessage(null);
    const response = await fetch("/api/notification-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pushEnabled: prefs.pushEnabled,
        emailEnabled: prefs.emailEnabled,
        telegramEnabled: prefs.telegramEnabled,
        timeZone: zone,
        marketingConsent: false,
      }),
    });
    if (!response.ok) {
      setMessage(copy.error);
      return;
    }
    setMessage(copy.saved);
  }

  if (!prefs) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
      <p className="mt-2 text-sm text-gray-600">{copy.body}</p>
      <div className="mt-4 space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.pushEnabled} onChange={(event) => setPrefs({ ...prefs, pushEnabled: event.target.checked })} />
          {copy.push}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.emailEnabled} onChange={(event) => setPrefs({ ...prefs, emailEnabled: event.target.checked })} />
          {copy.email}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.telegramEnabled} onChange={(event) => setPrefs({ ...prefs, telegramEnabled: event.target.checked })} />
          {copy.telegram}
        </label>
        <label className="block">
          <span className="mb-1 block text-gray-700">{copy.zone}</span>
          <input
            value={zone}
            onChange={(event) => setZone(event.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            placeholder="Europe/Berlin"
          />
        </label>
      </div>
      <button type="button" onClick={save} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
        {copy.save}
      </button>
      {message ? <p className="mt-2 text-sm text-gray-600">{message}</p> : null}
    </section>
  );
}
