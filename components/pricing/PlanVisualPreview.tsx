"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";

type PlanKind = "professional" | "growth";

const COPY: Record<Lang, { close: string; profile: string; services: string; about: string; gallery: string; request: string; growth: string }> = {
  ru: {
    close: "Закрыть",
    profile: "Профиль специалиста",
    services: "Услуги и цены",
    about: "О специалисте",
    gallery: "Галерея",
    request: "Оставить заявку",
    growth: "Расширенная профессиональная страница",
  },
  ua: {
    close: "Закрити",
    profile: "Профіль спеціаліста",
    services: "Послуги та ціни",
    about: "Про спеціаліста",
    gallery: "Галерея",
    request: "Залишити запит",
    growth: "Розширена професійна сторінка",
  },
  de: {
    close: "Schließen",
    profile: "Spezialistenprofil",
    services: "Leistungen und Preise",
    about: "Über den Spezialisten",
    gallery: "Galerie",
    request: "Anfrage senden",
    growth: "Erweiterte professionelle Seite",
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
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
                  {plan === "growth" ? "Freuly Growth" : "Freuly Professional"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-gray-950">
                  {plan === "growth" ? copy.growth : copy.profile}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {copy.close}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-inner">
              <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                <div className="ml-3 h-6 flex-1 rounded-full bg-gray-100 px-3 text-[10px] leading-6 text-gray-400">
                  freuly.de/specialist/example
                </div>
              </div>

              {plan === "professional" ? (
                <ProfessionalMock copy={copy} />
              ) : (
                <GrowthMock copy={copy} />
              )}
            </div>

            <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
              {lang === "de"
                ? "Schematisches Beispiel. Inhalte, Fotos und Texte hängen vom jeweiligen Spezialisten ab."
                : lang === "ru"
                  ? "Схематичный пример. Реальные фото, тексты и наполнение зависят от конкретного специалиста."
                  : "Схематичний приклад. Реальні фото, тексти та наповнення залежать від конкретного спеціаліста."}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ProfessionalMock({ copy }: { copy: (typeof COPY)[Lang] }) {
  return (
    <div className="bg-white p-5 sm:p-8">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div>
          <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-indigo-100 via-gray-100 to-slate-200" />
          <div className="mt-4 rounded-xl border border-gray-200 p-4">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="mt-3 h-2.5 w-full rounded bg-gray-100" />
            <div className="mt-2 h-2.5 w-4/5 rounded bg-gray-100" />
          </div>
        </div>
        <div>
          <div className="h-3 w-28 rounded bg-indigo-100" />
          <div className="mt-3 h-8 w-3/5 rounded bg-gray-900/90" />
          <div className="mt-2 h-4 w-2/5 rounded bg-gray-200" />
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-11/12 rounded bg-gray-100" />
            <div className="h-3 w-4/5 rounded bg-gray-100" />
          </div>
          <button type="button" tabIndex={-1} className="mt-6 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
            {copy.request}
          </button>
          <MockSection title={copy.services} rows={3} />
          <MockSection title={copy.about} rows={4} />
          <div className="mt-7">
            <div className="text-sm font-semibold text-gray-900">{copy.gallery}</div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="aspect-square rounded-xl bg-gray-100" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GrowthMock({ copy }: { copy: (typeof COPY)[Lang] }) {
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-800 px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-2xl">
          <div className="h-3 w-28 rounded bg-white/30" />
          <div className="mt-4 h-10 w-4/5 rounded bg-white/90" />
          <div className="mt-3 h-4 w-2/3 rounded bg-white/35" />
          <div className="mt-6 flex gap-3">
            <div className="h-10 w-32 rounded-full bg-white" />
            <div className="h-10 w-28 rounded-full border border-white/30" />
          </div>
        </div>
        <div className="absolute -bottom-10 right-8 hidden h-56 w-44 rounded-t-[3rem] bg-white/15 md:block" />
      </div>
      <div className="grid gap-8 px-6 py-8 sm:px-10 md:grid-cols-2">
        <MockSection title={copy.about} rows={5} />
        <div className="rounded-2xl bg-indigo-50 p-5">
          <div className="h-3 w-28 rounded bg-indigo-200" />
          <div className="mt-4 h-5 w-4/5 rounded bg-indigo-900/80" />
          <div className="mt-3 h-3 w-full rounded bg-white" />
          <div className="mt-2 h-3 w-5/6 rounded bg-white" />
          <div className="mt-5 h-10 w-36 rounded-full bg-indigo-600" />
        </div>
      </div>
      <div className="border-t border-gray-100 px-6 py-8 sm:px-10">
        <MockSection title={copy.services} rows={4} />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="aspect-[4/3] rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MockSection({ title, rows }: { title: string; rows: number }) {
  return (
    <div className="mt-7 first:mt-0">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={`h-3 rounded bg-gray-100 ${index === rows - 1 ? "w-3/4" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}
