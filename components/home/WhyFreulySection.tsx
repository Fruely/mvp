"use client";

import type { Dictionary } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type WhyItem = {
  titleKey: string;
};

const WHY_ITEMS: WhyItem[] = [
  { titleKey: "home.why.item1" },
  { titleKey: "home.why.item2" },
  { titleKey: "home.why.item3" },
];

export default function WhyFreulySection({ dict }: { dict: Dictionary }) {
  return (
    <section className="mt-16 mb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">
          {t(dict, "home.why.title")}
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {WHY_ITEMS.map((item) => (
            <div key={item.titleKey} className="flex items-center justify-center gap-3 text-center md:justify-start md:text-left">
              <span
                aria-hidden
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"
              >
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-base text-gray-700">{t(dict, item.titleKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
