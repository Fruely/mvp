"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";

const COPY: Record<Lang, {
  eyebrow: string;
  title: string;
  subtitle: string;
  generic: string;
  cta: string;
  online: string;
  offline: string;
  hybrid: string;
  justNow: string;
  minutes: string;
  hours: string;
}> = {
  ru: {
    eyebrow: "Живой спрос",
    title: "Сейчас ищут на Freuly",
    subtitle: "Реальные недавние запросы клиентов. Контактные данные здесь не публикуются.",
    generic: "Новая задача клиента",
    cta: "Получать такие заявки",
    online: "онлайн",
    offline: "на месте",
    hybrid: "онлайн или на месте",
    justNow: "только что",
    minutes: "мин назад",
    hours: "ч назад",
  },
  ua: {
    eyebrow: "Живий попит",
    title: "Зараз шукають на Freuly",
    subtitle: "Реальні нещодавні запити клієнтів. Контактні дані тут не публікуються.",
    generic: "Нове завдання клієнта",
    cta: "Отримувати такі заявки",
    online: "онлайн",
    offline: "на місці",
    hybrid: "онлайн або на місці",
    justNow: "щойно",
    minutes: "хв тому",
    hours: "год тому",
  },
  de: {
    eyebrow: "Live-Nachfrage",
    title: "Das wird gerade auf Freuly gesucht",
    subtitle: "Echte aktuelle Kundenanfragen. Kontaktdaten werden hier nicht veröffentlicht.",
    generic: "Neue Kundenaufgabe",
    cta: "Solche Anfragen erhalten",
    online: "online",
    offline: "vor Ort",
    hybrid: "online oder vor Ort",
    justNow: "gerade eben",
    minutes: "Min. her",
    hours: "Std. her",
  },
};

type RecentRequest = {
  id: string;
  created_at: string;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  category: { ru: string | null; ua: string | null; de: string | null } | null;
};

function relativeLabel(createdAt: string, lang: Lang): string {
  const copy = COPY[lang];
  const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return copy.justNow;
  if (minutes < 60) return `${minutes} ${copy.minutes}`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ${copy.hours}`;
}

function formatLabel(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const copy = COPY[lang];
  if (value === "online") return copy.online;
  if (value === "offline") return copy.offline;
  if (value === "hybrid") return copy.hybrid;
  return value;
}

function languageLabel(value: string | null): string | null {
  if (value === "ru") return "RU";
  if (value === "ua" || value === "uk") return "UA";
  if (value === "de") return "DE";
  return value ? value.toUpperCase() : null;
}

function circularDistance(index: number, active: number, total: number): number {
  let distance = index - active;
  if (distance > total / 2) distance -= total;
  if (distance < -total / 2) distance += total;
  return distance;
}

export default function LiveRequestDrum({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  const [items, setItems] = useState<RecentRequest[]>([]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/recent-service-requests", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { items?: RecentRequest[] }) => {
        if (cancelled) return;
        const next = Array.isArray(payload.items) ? payload.items.filter((item) => item?.id) : [];
        setItems(next);
        setActive(0);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % items.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const visible = useMemo(() => {
    return items.map((item, index) => ({
      item,
      distance: circularDistance(index, active, items.length),
    }));
  }, [active, items]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-12 w-full max-w-[980px] text-left" aria-label={copy.title}>
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-freuly-primary">{copy.eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-freuly-text-primary sm:text-3xl">{copy.title}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-freuly-text-secondary">{copy.subtitle}</p>
      </div>

      <div
        className="relative mx-auto h-[248px] max-w-3xl overflow-hidden rounded-[28px] border border-freuly-border-default bg-white/70 shadow-sm [perspective:1000px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-freuly-primary/10 to-transparent" aria-hidden />
        {visible.map(({ item, distance }) => {
          const abs = Math.abs(distance);
          if (abs > 2) return null;
          const category = item.category?.[lang] || copy.generic;
          const meta = [languageLabel(item.preferred_language), formatLabel(item.work_format, lang), item.city]
            .filter(Boolean)
            .join(" · ");
          const y = distance * 72;
          const rotateX = distance * -20;
          const scale = distance === 0 ? 1 : 0.93;
          const opacity = abs === 0 ? 1 : abs === 1 ? 0.64 : 0.28;
          const zIndex = 10 - abs;
          const href = `/${lang}/become-specialist?source=live-requests&request=${encodeURIComponent(item.id)}`;

          return (
            <Link
              key={item.id}
              href={href}
              className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-freuly-border-default bg-white px-5 py-4 shadow-sm transition-[transform,opacity] duration-700 ease-out hover:border-freuly-primary/40 sm:px-6"
              style={{
                transform: `translate(-50%, calc(-50% + ${y}px)) rotateX(${rotateX}deg) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: abs === 0 ? "auto" : "none",
              }}
              aria-hidden={abs !== 0}
              tabIndex={abs === 0 ? 0 : -1}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-freuly-text-primary sm:text-lg">{category}</p>
                  {meta ? <p className="mt-1 truncate text-sm text-freuly-text-secondary">{meta}</p> : null}
                </div>
                <span className="shrink-0 text-xs font-medium text-freuly-text-muted">{relativeLabel(item.created_at, lang)}</span>
              </div>
            </Link>
          );
        })}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/70 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/70 to-transparent" aria-hidden />
      </div>

      <div className="mt-5 text-center">
        <Link
          href={`/${lang}/become-specialist?source=live-requests`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-freuly-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-freuly-primary-hover"
        >
          {copy.cta}
        </Link>
      </div>
    </section>
  );
}
