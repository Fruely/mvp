"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

type Props = {
  lang: Lang;
};

type Copy = {
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  ariaLabel: string;
};

function getCopy(lang: Lang): Copy {
  if (lang === "de") {
    return {
      eyebrow: "Startangebot",
      title: "Erste 50 Spezialisten: 3 Monate kostenlos",
      body: "Profilplatzierung ohne automatische Abos oder Abbuchungen. Danach nur freiwillige Tarife.",
      primaryCta: "Spezialist werden",
      secondaryCta: "Bedingungen",
      ariaLabel: "Startangebot für Spezialisten auf Freuly",
    };
  }

  if (lang === "ua") {
    return {
      eyebrow: "Стартова пропозиція",
      title: "Перші 50 спеціалістів — 3 місяці безкоштовно",
      body: "Розміщення профілю без автопідписок і списань. Після тестового періоду — лише добровільні тарифи.",
      primaryCta: "Стати спеціалістом",
      secondaryCta: "Умови",
      ariaLabel: "Стартова пропозиція для спеціалістів на Freuly",
    };
  }

  return {
    eyebrow: "Стартовое предложение",
    title: "Первые 50 специалистов — 3 месяца бесплатно",
    body: "Размещение профиля без автоподписок и списаний. После тестового периода — только добровольные тарифы.",
    primaryCta: "Стать специалистом",
    secondaryCta: "Условия",
    ariaLabel: "Стартовое предложение для специалистов на Freuly",
  };
}

function shouldShow(pathname: string | null, lang: Lang) {
  if (!pathname) return false;

  const visiblePaths = new Set([`/${lang}`, `/${lang}/become-specialist`, `/${lang}/pricing`]);
  return visiblePaths.has(pathname);
}

export default function EarlyAccessPromoBanner({ lang }: Props) {
  const pathname = usePathname();

  if (!shouldShow(pathname, lang)) {
    return null;
  }

  const copy = getCopy(lang);

  return (
    <section
      aria-label={copy.ariaLabel}
      className="sticky top-14 z-30 border-b border-blue-100/70 bg-transparent px-3 py-2 sm:px-6 sm:py-3 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-xl border border-white/70 bg-white/85 px-3 py-2 shadow-lg shadow-blue-950/10 backdrop-blur-md sm:rounded-2xl sm:px-5 sm:py-3">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-100/80 via-indigo-50/60 to-transparent" />
          <div className="relative flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-0.5 hidden items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100 sm:mb-1 sm:inline-flex">
                {copy.eyebrow}
              </div>
              <p className="text-xs font-semibold leading-snug text-gray-950 sm:text-base">
                {copy.title}
              </p>
              <p className="mt-0.5 hidden text-xs leading-relaxed text-gray-600 sm:block sm:text-sm">
                {copy.body}
              </p>
            </div>

            <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:flex-nowrap">
              <Link
                href={`/${lang}/become-specialist`}
                className="inline-flex h-8 min-w-0 flex-1 items-center justify-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:h-9 sm:px-4 sm:text-sm sm:flex-none"
              >
                {copy.primaryCta}
              </Link>
              <Link
                href={`/${lang}/specialist-rules`}
                className="hidden h-9 min-w-0 items-center justify-center rounded-full border border-gray-200 bg-white/80 px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 sm:inline-flex"
              >
                {copy.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
