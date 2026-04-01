"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";
import { SPECIALIST_OFFICE_PATH } from "@/lib/supabaseClient";

const fallbackDict: Dictionary = {
  "header.nav.categories": "Категорії",
  "header.nav.about": "Про нас",
  "header.nav.contacts": "Контакти",
  "header.cabinet": "Кабінет",
  "header.joinButton": "Приєднатися до Freuly",
};

type HeaderProps = {
  lang: string;
  dict?: Dictionary;
  children?: ReactNode;
};

export default function Header({ lang, dict = fallbackDict, children }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const d = dict ?? fallbackDict;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1 text-gray-700 hover:text-blue-600 font-medium transition"
                aria-expanded={open}
                aria-haspopup="true"
              >
                {t(d, "header.nav.categories")}
                <span className="text-xs" aria-hidden>▼</span>
              </button>
              {open && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 animate-fadeIn"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("a")) setOpen(false);
                  }}
                >
                  {children}
                </div>
              )}
            </div>

            <Link
              href={SPECIALIST_OFFICE_PATH}
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
            href={SPECIALIST_OFFICE_PATH}
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
