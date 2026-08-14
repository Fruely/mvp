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
    <section className="bg-[#0D2B2A] px-6 py-12 md:px-8 md:py-20 lg:py-[80px]">
      <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-8 md:gap-10 lg:flex-row lg:items-center lg:gap-12">
        <div className="flex w-full flex-col items-center text-center lg:w-[55%] lg:items-start lg:text-left">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5ECEC3]">
            {t(dict, "home.starMap.kicker")}
          </p>
          <h2 className="mt-3 max-w-[440px] text-[26px] font-bold leading-8 text-white md:text-[36px] md:leading-[1.2]">
            <span className="md:hidden">{t(dict, "home.starMap.titleMobile")}</span>
            <span className="hidden md:inline">{t(dict, "home.starMap.title")}</span>
          </h2>
          <p className="mt-4 max-w-[440px] text-sm leading-[22px] text-[#B8D4D2] md:text-base md:leading-6">
            {t(dict, "home.starMap.description")}
          </p>

          <div className="mt-8 hidden w-full max-w-[440px] flex-col gap-4 lg:flex">
            <Link
              href={`/${lang}/become-specialist`}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#1A8A7D] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#157a6f]"
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

        <div className="w-full lg:w-[45%]">
          <GermanyStarMap data={data} dict={dict} lang={lang} className="max-h-[320px] md:max-h-none" />
        </div>

        <div className="flex w-full max-w-[340px] flex-col items-center gap-4 lg:hidden">
          <Link
            href={`/${lang}/become-specialist`}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#1A8A7D] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#157a6f]"
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
