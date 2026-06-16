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
      className="sticky top-14 z-30 border-b border-blue-100/70 bg-transparent px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-lg shadow-blue-950/10 backdrop-blur-md sm:px-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blue-100/80 via-indigo-50/60 to-transparent" />
          <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                {copy.eyebrow}
              </div>
              <p className="text-sm font-semibold text-gray-950 sm:text-base">{copy.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:text-sm">{copy.body}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/${lang}/become-specialist`}
                className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                {copy.primaryCta}
              </Link>
              <Link
                href={`/${lang}/specialist-rules`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-blue-100 bg-white/80 px-4 text-sm font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
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
