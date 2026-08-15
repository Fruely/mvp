"use client";

import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t, tCount } from "@/lib/i18n";
import GermanyStarMap from "@/components/starMap/GermanyStarMap";
import type { StarMapSummary } from "@/lib/starMap/types";

type StarMapSectionProps = {
  lang: Lang;
  dict: Dictionary;
  data: StarMapSummary;
};

export default function StarMapSection({ lang, dict, data }: StarMapSectionProps) {
  const counterLabel = tCount(dict, lang, "home.starMap.counter", data.total);

  return (
    <section className="relative overflow-hidden bg-[#0D2B2A] px-6 py-12 md:px-8 md:py-20 lg:h-[520px] lg:py-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[min(100%,720px)] bg-gradient-to-r from-[#0D2B2A] from-[35%] via-[#0D2B2A]/95 to-transparent lg:block"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#0D2B2A] to-transparent lg:hidden"
      />

      <div className="relative mx-auto h-full w-full max-w-[1160px] lg:min-h-[520px]">
        <div className="relative z-20 flex flex-col items-center text-center lg:h-full lg:max-w-[520px] lg:items-start lg:justify-center lg:py-10 lg:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5ECEC3]">
            {t(dict, "home.starMap.kicker")}
          </p>
          <h2 className="mt-3 max-w-[440px] text-[26px] font-bold leading-8 text-white md:text-[36px] md:leading-[44px]">
            <span className="md:hidden">{t(dict, "home.starMap.titleMobile")}</span>
            <span className="hidden md:inline">{t(dict, "home.starMap.title")}</span>
          </h2>
          <p className="mt-3 max-w-[440px] text-sm leading-[22px] text-[#B8D4D2] md:text-base md:leading-[26px]">
            {t(dict, "home.starMap.description")}
          </p>

          <div className="mt-6 hidden flex-col items-start gap-3 lg:flex">
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href={`/${lang}/become-specialist`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1A8A7D] px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#157a6f]"
              >
                {t(dict, "home.starMap.primaryCta")}
              </Link>
              <Link
                href={`/${lang}#home-service-search`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#5ECEC3] hover:text-[#7edfd4]"
              >
                {t(dict, "home.starMap.secondaryCta")}
              </Link>
            </div>
            <p className="text-[13px] text-[#7BA8A5]">{counterLabel}</p>
          </div>
        </div>

        <div className="relative z-0 mt-8 flex justify-center lg:absolute lg:inset-y-0 lg:right-[-40px] lg:mt-0 lg:w-[min(100%,900px)] lg:justify-end xl:right-[-80px]">
          <GermanyStarMap
            data={data}
            dict={dict}
            lang={lang}
            className="lg:-mt-12 lg:w-[850px] lg:max-w-none"
          />
        </div>

        <div className="relative z-20 mt-8 flex w-full flex-col items-center gap-4 lg:hidden">
          <Link
            href={`/${lang}/become-specialist`}
            className="inline-flex h-12 w-full max-w-[340px] items-center justify-center rounded-lg bg-[#1A8A7D] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#157a6f]"
          >
            {t(dict, "home.starMap.primaryCta")}
          </Link>
          <Link
            href={`/${lang}#home-service-search`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#5ECEC3] hover:text-[#7edfd4]"
          >
            {t(dict, "home.starMap.secondaryCta")}
          </Link>
          <p className="text-[13px] text-[#7BA8A5]">{counterLabel}</p>
        </div>
      </div>
    </section>
  );
}
