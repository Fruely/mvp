"use client";

import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";
const fallbackDict: Dictionary = {
  "header.cabinet": "Кабінет",
  "header.joinButton": "Приєднатися до Freuly",
};

type HeaderProps = {
  lang: string;
  dict?: Dictionary;
};

export default function Header({ lang, dict = fallbackDict }: HeaderProps) {
  const d = dict ?? fallbackDict;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
      <nav className="mx-auto flex max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link
            href={`/${lang}`}
            className="text-xl font-bold text-[#3B5BDB] shrink-0 hover:text-[#364FC7] transition-colors duration-200"
          >
            FREULY
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href={`/${lang}/specialist/dashboard`}
              className="hidden text-gray-700 hover:text-blue-600 font-medium transition sm:inline"
            >
              {t(d, "header.cabinet")}
            </Link>
            <Link
              href={`/${lang}/become-specialist`}
              className="hidden shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-flex"
            >
              {t(d, "header.joinButton")}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 py-2.5 sm:hidden">
          <Link
            href={`/${lang}/specialist/dashboard`}
            className="text-sm font-medium text-gray-700 transition hover:text-blue-600"
          >
            {t(d, "header.cabinet")}
          </Link>
          <Link
            href={`/${lang}/become-specialist`}
            className="inline-flex shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {t(d, "header.joinButton")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
