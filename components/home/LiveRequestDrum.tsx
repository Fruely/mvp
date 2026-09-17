"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/lib/i18n";

const COPY: Record<
  Lang,
  {
    eyebrow: string;
    title: string;
    subtitle: string;
    online: string;
    offline: string;
    hybrid: string;
  }
> = {
  ru: {
    eyebrow: "Живой спрос",
    title: "Сейчас ищут на Freuly",
    subtitle: "Реальные опубликованные запросы клиентов без имён и контактных данных.",
    online: "онлайн",
    offline: "на месте",
    hybrid: "онлайн или на месте",
  },
  ua: {
    eyebrow: "Живий попит",
    title: "Зараз шукають на Freuly",
    subtitle: "Реальні опубліковані запити клієнтів без імен і контактних даних.",
    online: "онлайн",
    offline: "на місці",
    hybrid: "онлайн або на місці",
  },
  de: {
    eyebrow: "Live-Nachfrage",
    title: "Das wird gerade auf Freuly gesucht",
    subtitle: "Echte veröffentlichte Kundenanfragen ohne Namen oder Kontaktdaten.",
    online: "online",
    offline: "vor Ort",
    hybrid: "online oder vor Ort",
  },
};

export type RecentRequest = {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
};

type Props = {
  lang: Lang;
  previewItems?: RecentRequest[];
};

function localeFor(lang: Lang): string {
  if (lang === "ua") return "uk-UA";
  if (lang === "de") return "de-DE";
  return "ru-RU";
}

function relativeLabel(createdAt: string, lang: Lang): string {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: "auto" });
  if (diffMinutes < 1) return formatter.format(0, "second");
  if (diffMinutes < 60) return formatter.format(-diffMinutes, "minute");
  return formatter.format(-Math.floor(diffMinutes / 60), "hour");
}

function formatLabel(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const copy = COPY[lang];
  if (value === "online") return copy.online;
  if (value === "offline") return copy.offline;
  if (value === "hybrid") return copy.hybrid;
  return null;
}

function languageLabel(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const labels: Record<Lang, Record<string, string>> = {
    ru: { ru: "русский", ua: "украинский", uk: "украинский", de: "немецкий" },
    ua: { ru: "російська", ua: "українська", uk: "українська", de: "німецька" },
    de: { ru: "Russisch", ua: "Ukrainisch", uk: "Ukrainisch", de: "Deutsch" },
  };
  return labels[lang][value] ?? null;
}

function circularDistance(index: number, active: number, total: number): number {
  let distance = index - active;
  if (distance > total / 2) distance -= total;
  if (distance < -total / 2) distance += total;
  return distance;
}

function placeLabel(item: RecentRequest): string | null {
  if (item.work_format === "online") return null;
  return [item.postal_code, item.city].filter(Boolean).join(" ") || null;
}

export default function LiveRequestDrum({ lang, previewItems }: Props) {
  const copy = COPY[lang];
  const isPreview = Boolean(previewItems);
  const [items, setItems] = useState<RecentRequest[]>(previewItems ?? []);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (previewItems) {
      setItems(previewItems);
      setActive(0);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/public/recent-service-requests?lang=${encodeURIComponent(lang)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as { items?: RecentRequest[] };
        if (cancelled) return;
        const next = Array.isArray(payload.items) ? payload.items.filter((item) => item?.id) : [];
        setItems(next);
        setActive(0);
      } catch {
        if (!cancelled) setItems([]);
      }
    }

    void load();
    const refreshTimer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, [lang, previewItems]);

  useEffect(() => {
    if (paused || items.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % items.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [items.length, paused]);

  const visible = useMemo(
    () =>
      items.map((item, index) => ({
        item,
        distance: circularDistance(index, active, items.length),
      })),
    [active, items],
  );

  if (items.length === 0) return null;

  return (
    <section
      className="bg-[#eaf6f5] px-freuly-4 py-14 sm:px-freuly-6 sm:py-16 lg:px-16 lg:py-20"
      aria-labelledby="live-request-drum-title"
    >
      <div className="mx-auto w-full max-w-[980px]">
        <div className="mb-7 text-center">
          {isPreview ? (
            <p className="mx-auto mb-4 w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Предпросмотр · тестовые данные не опубликованы
            </p>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-freuly-primary">
            {copy.eyebrow}
          </p>
          <h2
            id="live-request-drum-title"
            className="mt-2 text-2xl font-bold text-freuly-text-primary sm:text-3xl"
          >
            {copy.title}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-freuly-text-secondary">
            {copy.subtitle}
          </p>
        </div>

        <div
          className="relative mx-auto h-[292px] max-w-3xl overflow-hidden rounded-[28px] border border-white/80 bg-white/70 shadow-sm [perspective:1000px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div
            className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-freuly-primary/10 to-transparent"
            aria-hidden
          />
          {visible.map(({ item, distance }) => {
            const abs = Math.abs(distance);
            if (abs > 2) return null;
            const meta = [
              formatLabel(item.work_format, lang),
              placeLabel(item),
              languageLabel(item.preferred_language, lang),
            ]
              .filter(Boolean)
              .join(" · ");
            const y = distance * 86;
            const rotateX = distance * -20;
            const scale = distance === 0 ? 1 : 0.93;
            const opacity = abs === 0 ? 1 : abs === 1 ? 0.62 : 0.24;

            return (
              <article
                key={item.id}
                className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-2xl border border-freuly-border-default bg-white px-5 py-4 shadow-sm transition-[transform,opacity] duration-700 ease-out sm:px-6"
                style={{
                  transform: `translate(-50%, calc(-50% + ${y}px)) rotateX(${rotateX}deg) scale(${scale})`,
                  opacity,
                  zIndex: 10 - abs,
                }}
                aria-hidden={abs !== 0}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-freuly-text-primary sm:text-lg">
                      {item.title}
                    </h3>
                    {meta ? (
                      <p className="mt-1 truncate text-sm font-medium text-freuly-primary/90">{meta}</p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-freuly-text-secondary">
                      {item.summary}
                    </p>
                  </div>
                  <time
                    dateTime={item.created_at}
                    className="shrink-0 text-xs font-medium text-freuly-text-muted"
                    suppressHydrationWarning
                  >
                    {relativeLabel(item.created_at, lang)}
                  </time>
                </div>
              </article>
            );
          })}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white via-white/70 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/70 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
