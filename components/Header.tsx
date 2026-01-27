"use client";

import { ReactNode, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n";

const fallbackDict: Dictionary = {
  "header.nav.categories": "Категорії",
  "header.nav.about": "Про нас",
  "header.nav.contacts": "Контакти",
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
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link
          href={`/${lang}`}
          className="text-xl font-bold text-blue-600 shrink-0 hover:text-blue-700 transition"
        >
          FREULY
        </Link>

        <div className="flex items-center gap-6">
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
            href={`/${lang}/about`}
            className="text-gray-700 hover:text-blue-600 font-medium transition hidden sm:inline"
          >
            {t(d, "header.nav.about")}
          </Link>
          <Link
            href={`/${lang}/contacts`}
            className="text-gray-700 hover:text-blue-600 font-medium transition hidden sm:inline"
          >
            {t(d, "header.nav.contacts")}
          </Link>
          <Link
            href={`/${lang}/become-specialist`}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition"
          >
            {t(d, "header.joinButton")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
