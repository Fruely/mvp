"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import {
  circularDistance,
  drumCardAccent,
  drumCardTransform,
  drumSlotStyle,
} from "@/lib/homepage/liveRequestDrumLayout";
import { requestPromotionPath } from "@/lib/serviceRequests/promotionUrl";

export type RecentRequest = {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  category?: string | null;
};

type Props = {
  lang: Lang;
  dict?: Dictionary;
  previewItems?: RecentRequest[];
};

const AUTO_ROTATE_MS = 4200;
const MANUAL_ROTATE_PAUSE_MS = 8000;

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

function formatLabel(value: string | null, dict: Dictionary): string | null {
  if (value === "online") return t(dict, "home.variantC.liveDemand.online", { defaultValue: "онлайн" });
  if (value === "offline") return t(dict, "home.variantC.liveDemand.offline", { defaultValue: "на месте" });
  if (value === "hybrid") return t(dict, "home.variantC.liveDemand.hybrid", { defaultValue: "онлайн или на месте" });
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

function placeLabel(item: RecentRequest): string | null {
  if (item.work_format === "online") return null;
  return [item.postal_code, item.city].filter(Boolean).join(" ") || null;
}

function controlLabels(lang: Lang) {
  if (lang === "ua") {
    return {
      group: "Керування барабаном заявок",
      previous: "Попередня заявка",
      next: "Наступна заявка",
    };
  }
  if (lang === "de") {
    return {
      group: "Anfragen-Karussell steuern",
      previous: "Vorherige Anfrage",
      next: "Nächste Anfrage",
    };
  }
  return {
    group: "Управление барабаном заявок",
    previous: "Предыдущая заявка",
    next: "Следующая заявка",
  };
}

export default function LiveRequestDrum({ lang, dict = {}, previewItems }: Props) {
  const isPreview = Boolean(previewItems);
  const [items, setItems] = useState<RecentRequest[]>(previewItems ?? []);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const itemsRef = useRef(items);
  const activeRef = useRef(active);
  const manualResumeTimerRef = useRef<number | null>(null);
  itemsRef.current = items;
  activeRef.current = active;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

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
        const currentId = itemsRef.current[activeRef.current]?.id;
        const nextActive = currentId ? next.findIndex((item) => item.id === currentId) : 0;
        setItems(next);
        setActive(nextActive >= 0 ? nextActive : 0);
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
    if (paused || manualPaused || reducedMotion || items.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % items.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [items.length, manualPaused, paused, reducedMotion]);

  useEffect(
    () => () => {
      if (manualResumeTimerRef.current !== null) {
        window.clearTimeout(manualResumeTimerRef.current);
      }
    },
    [],
  );

  function rotateManually(direction: -1 | 1) {
    setActive((current) => (current + direction + items.length) % items.length);
    setManualPaused(true);
    if (manualResumeTimerRef.current !== null) {
      window.clearTimeout(manualResumeTimerRef.current);
    }
    manualResumeTimerRef.current = window.setTimeout(() => {
      setManualPaused(false);
      manualResumeTimerRef.current = null;
    }, MANUAL_ROTATE_PAUSE_MS);
  }

  const visible = useMemo(
    () =>
      items.map((item, index) => ({
        item,
        distance: circularDistance(index, active, items.length),
      })),
    [active, items],
  );

  if (items.length === 0) return null;

  const registerHref = `/${lang}/become-specialist`;
  const loginHref = `/login?next=${encodeURIComponent(`/${lang}/specialist/dashboard`)}`;
  const controls = controlLabels(lang);
  const registerHint = t(dict, "home.variantC.liveDemand.registerHint", {
    defaultValue: "Нет регистрации? Зарегистрируйтесь — это займёт пару минут.",
  });
  const registerCta = t(dict, "home.variantC.liveDemand.registerCta", {
    defaultValue: "Зарегистрируйтесь",
  });

  return (
    <section
      className="bg-[#f8f7f5] px-freuly-4 py-14 sm:px-freuly-6 sm:py-16 lg:px-16 lg:py-20"
      aria-labelledby="live-request-drum-title"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:gap-8 xl:gap-12">
        <div className="w-full max-w-xl shrink-0 lg:max-w-[520px]">
          {isPreview ? (
            <p className="mb-4 w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              Предпросмотр · тестовые данные не опубликованы
            </p>
          ) : null}
          <h2
            id="live-request-drum-title"
            className="text-[1.375rem] font-semibold leading-tight text-freuly-text-primary sm:text-[22px]"
          >
            {t(dict, "home.variantC.liveDemand.sectionTitle", {
              defaultValue: "Живые запросы клиентов Freuly",
            })}
          </h2>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.08em] text-freuly-primary">
            {t(dict, "home.variantC.liveDemand.eyebrow", { defaultValue: "ХОТИТЕ ПОЛУЧАТЬ ЗАЯВКИ?" })}
          </p>
          <p className="mt-2.5 text-[1.75rem] font-bold leading-[1.15] text-freuly-text-primary sm:text-[36px] sm:leading-[1.17]">
            {t(dict, "home.variantC.liveDemand.title", { defaultValue: "Получите заявку прямо сейчас" })}
          </p>
          <p className="mt-4 max-w-[480px] text-base leading-6 text-freuly-text-secondary">
            {t(dict, "home.variantC.liveDemand.subtitle", {
              defaultValue:
                "Нажмите на подходящую карточку и перейдите по ссылке. Так вы получите доступ к заявке клиента.",
            })}
          </p>
          <p className="mt-6 inline-flex w-full max-w-[500px] items-center gap-3 rounded-xl border border-freuly-primary bg-[#e0f9f8] px-4 py-3.5 text-sm font-semibold text-freuly-primary">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-freuly-primary" aria-hidden />
            {t(dict, "home.variantC.liveDemand.warning", {
              defaultValue: "Только для зарегистрированных специалистов",
            })}
          </p>
          <p className="mt-4 max-w-[480px] text-sm leading-[22px] text-freuly-text-secondary">
            {registerHint.includes(registerCta) ? (
              <>
                {registerHint.slice(0, registerHint.indexOf(registerCta))}
                <Link href={registerHref} className="font-semibold text-freuly-primary hover:text-freuly-primary-hover">
                  {registerCta}
                </Link>
                {registerHint.slice(registerHint.indexOf(registerCta) + registerCta.length)}
              </>
            ) : (
              <Link href={registerHref} className="font-semibold text-freuly-primary hover:text-freuly-primary-hover">
                {registerHint}
              </Link>
            )}
          </p>
          <p className="mt-2">
            <Link href={loginHref} className="text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover">
              {t(dict, "home.variantC.liveDemand.loginCta", { defaultValue: "Войти" })}
            </Link>
          </p>
        </div>

        <div className="mx-auto flex w-full min-w-0 max-w-[780px] items-center gap-2 sm:gap-3 lg:mx-0 lg:flex-1">
          <div
            className="relative h-[300px] min-w-0 flex-1 overflow-hidden [perspective:1100px] [transform-style:preserve-3d] sm:h-[320px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            {visible.map(({ item, distance }) => {
            const style = drumSlotStyle(distance, { reducedMotion });
            if (!style) return null;
            const abs = Math.abs(distance);
            const meta = [
              placeLabel(item) || formatLabel(item.work_format, dict),
              languageLabel(item.preferred_language, lang),
            ]
              .filter(Boolean)
              .join(" · ");
            const href = isPreview ? null : requestPromotionPath(lang, item.id);
            const accent = drumCardAccent(item.category || item.id);
            const ariaLabel = t(dict, "home.variantC.liveDemand.cardAria", {
              defaultValue: "Открыть запрос: {{title}}",
            }).replace("{{title}}", item.title);

            const card = (
              <>
                <span
                  className="absolute bottom-4 left-0 top-4 w-[5px] rounded-r-[3px]"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <div className="flex items-start justify-between gap-3 pl-1">
                  {item.category ? (
                    <span className="inline-flex max-w-[70%] truncate rounded-full bg-[#e0f9f8] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-freuly-primary">
                      {item.category}
                    </span>
                  ) : (
                    <span />
                  )}
                  <time
                    dateTime={item.created_at}
                    className="shrink-0 text-xs font-medium text-freuly-text-muted"
                    suppressHydrationWarning
                  >
                    {relativeLabel(item.created_at, lang)}
                  </time>
                </div>
                <h3 className="mt-3 truncate text-[17px] font-bold text-freuly-text-primary">{item.title}</h3>
                <p className="mt-1 line-clamp-1 text-sm leading-snug text-freuly-text-secondary">{item.summary}</p>
                {meta ? (
                  <p className="mt-2 truncate text-xs font-semibold text-freuly-primary">{meta}</p>
                ) : null}
              </>
            );

            const className =
              "live-request-drum-card absolute left-1/2 top-1/2 overflow-hidden rounded-2xl border border-freuly-border-default bg-white px-5 py-4 transition-[transform,opacity] duration-1000 ease-in-out sm:px-6";
            const motionStyle = {
              width: `${style.widthPercent}%`,
              maxWidth: "640px",
              transform: drumCardTransform(style),
              opacity: style.opacity,
              zIndex: style.zIndex,
              boxShadow: abs === 0 ? "0 14px 28px rgba(0,46,46,0.12)" : "0 6px 12px rgba(0,46,46,0.04)",
            };

            if (href) {
              return (
                <Link
                  key={item.id}
                  href={href}
                  className={`${className} ${abs === 0 ? "pointer-events-auto" : "pointer-events-none lg:pointer-events-auto"}`}
                  style={motionStyle}
                  tabIndex={abs === 0 ? 0 : -1}
                  aria-hidden={abs !== 0}
                  aria-label={ariaLabel}
                >
                  {card}
                </Link>
              );
            }

            return (
              <article
                key={item.id}
                className={className}
                style={motionStyle}
                aria-hidden={abs !== 0}
              >
                {card}
              </article>
            );
            })}
          </div>

          {items.length > 1 ? (
            <div
              className="flex shrink-0 flex-col items-center gap-2"
              role="group"
              aria-label={controls.group}
            >
              <button
                type="button"
                onClick={() => rotateManually(-1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-freuly-border-default bg-white text-freuly-primary shadow-[0_6px_18px_rgba(0,46,46,0.08)] transition-[transform,background-color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-freuly-primary hover:bg-[#e0f9f8] hover:shadow-[0_8px_22px_rgba(0,46,46,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-freuly-primary focus-visible:ring-offset-2 active:translate-y-0 sm:h-12 sm:w-12"
                aria-label={controls.previous}
                title={controls.previous}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </button>

              <span
                className="min-w-10 text-center text-[11px] font-semibold tabular-nums text-freuly-text-muted"
                aria-live="polite"
                aria-atomic="true"
              >
                {active + 1} / {items.length}
              </span>

              <button
                type="button"
                onClick={() => rotateManually(1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-freuly-border-default bg-white text-freuly-primary shadow-[0_6px_18px_rgba(0,46,46,0.08)] transition-[transform,background-color,border-color,box-shadow] duration-200 hover:translate-y-0.5 hover:border-freuly-primary hover:bg-[#e0f9f8] hover:shadow-[0_8px_22px_rgba(0,46,46,0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-freuly-primary focus-visible:ring-offset-2 active:translate-y-0 sm:h-12 sm:w-12"
                aria-label={controls.next}
                title={controls.next}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
