"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type PlanKind = "professional" | "growth";

const PRO_EXAMPLE_SLUG = "business-kirchhundem-natalya-sheshenya";
const PRO_PREMIUM_EXAMPLE_SLUG = "artur-niskubin";

const COPY: Record<
  Lang,
  {
    close: string;
    proTitle: string;
    proPremiumTitle: string;
    proBadge: string;
    proPremiumBadge: string;
    proNote: string;
    proPremiumNote: string;
    openFull: string;
  }
> = {
  ru: {
    close: "Закрыть",
    proTitle: "Пример реальной страницы Freuly Pro",
    proPremiumTitle: "Пример реальной страницы Freuly Pro Premium",
    proBadge: "Живой пример Pro",
    proPremiumBadge: "Живой пример Pro Premium",
    proNote:
      "Это реальная опубликованная страница специалиста в формате Freuly Pro. Ваши фото, тексты, услуги и наполнение будут зависеть от вашего предложения.",
    proPremiumNote:
      "Это реальная опубликованная Pro Page в формате Freuly Pro Premium. Ваши фото, тексты, услуги и структура будут зависеть от вашего предложения.",
    openFull: "Открыть пример полностью",
  },
  ua: {
    close: "Закрити",
    proTitle: "Приклад реальної сторінки Freuly Pro",
    proPremiumTitle: "Приклад реальної сторінки Freuly Pro Premium",
    proBadge: "Живий приклад Pro",
    proPremiumBadge: "Живий приклад Pro Premium",
    proNote:
      "Це реальна опублікована сторінка спеціаліста у форматі Freuly Pro. Ваші фото, тексти, послуги та наповнення залежатимуть від вашої пропозиції.",
    proPremiumNote:
      "Це реальна опублікована Pro Page у форматі Freuly Pro Premium. Ваші фото, тексти, послуги та структура залежатимуть від вашої пропозиції.",
    openFull: "Відкрити приклад повністю",
  },
  de: {
    close: "Schließen",
    proTitle: "Beispiel einer echten Freuly Pro Seite",
    proPremiumTitle: "Beispiel einer echten Freuly Pro Premium Seite",
    proBadge: "Live-Beispiel Pro",
    proPremiumBadge: "Live-Beispiel Pro Premium",
    proNote:
      "Dies ist die tatsächlich veröffentlichte Seite einer Spezialistin im Freuly-Pro-Format. Fotos, Texte, Leistungen und Inhalte richten sich nach Ihrem eigenen Angebot.",
    proPremiumNote:
      "Dies ist eine tatsächlich veröffentlichte Pro Page im Freuly-Pro-Premium-Format. Fotos, Texte, Leistungen und Seitenstruktur richten sich nach Ihrem eigenen Angebot.",
    openFull: "Beispiel vollständig öffnen",
  },
};

export default function PlanVisualPreview({
  plan,
  lang,
  label,
}: {
  plan: PlanKind;
  lang: Lang;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const copy = COPY[lang] ?? COPY.ua;
  const isPremium = plan === "growth";
  const exampleSlug = isPremium ? PRO_PREMIUM_EXAMPLE_SLUG : PRO_EXAMPLE_SLUG;
  const examplePath = `/${lang}/specialist/${exampleSlug}`;
  const title = isPremium ? copy.proPremiumTitle : copy.proTitle;
  const badge = isPremium ? copy.proPremiumBadge : copy.proBadge;
  const note = isPremium ? copy.proPremiumNote : copy.proNote;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 transition hover:text-indigo-900 hover:decoration-indigo-400"
      >
        <span aria-hidden>◫</span>
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">{badge}</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">{title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {copy.close}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-[560px] flex-1 bg-gray-100 sm:min-h-[680px]">
                <iframe
                  src={examplePath}
                  title={title}
                  className="h-full min-h-[560px] w-full border-0 bg-white sm:min-h-[680px]"
                />
              </div>
              <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="max-w-3xl text-xs leading-relaxed text-gray-500">{note}</p>
                <Link
                  href={examplePath}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-900"
                >
                  {copy.openFull} ↗
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
