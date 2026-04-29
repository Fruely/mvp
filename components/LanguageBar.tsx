"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

/** Same name as server routes and middleware (`middleware.ts`). */
const LANG_COOKIE = "freuly_lang";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
const ROOT_FALLBACK_LANG: Lang = "ru";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ua", label: "UA" },
  { code: "ru", label: "RU" },
  { code: "de", label: "DE" },
];

function stripLangPrefix(pathname: string) {
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts.length === 0) return { lang: ROOT_FALLBACK_LANG, rest: "/" };
  if (SUPPORTED_LANGS.includes(parts[0] as Lang)) {
    const rest = "/" + parts.slice(1).join("/");
    return { lang: parts[0] as Lang, rest: rest === "/" ? "/" : rest };
  }
  return { lang: ROOT_FALLBACK_LANG, rest: pathname || "/" };
}

function pathHasLangPrefix(pathname: string): boolean {
  const first = pathname.split("/").filter(Boolean)[0];
  return Boolean(first && SUPPORTED_LANGS.includes(first as Lang));
}

export type LanguageBarProps = {
  /**
   * Paths without `/{lang}/` (e.g. `/for-specialists`, legal pages): server-resolved
   * language from `freuly_lang` so the active chip matches SSR and cookie.
   */
  serverLang?: Lang;
};

export default function LanguageBar({ serverLang }: LanguageBarProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";

  const hasPrefix = useMemo(() => pathHasLangPrefix(pathname), [pathname]);
  const { lang: pathLang, rest } = useMemo(() => stripLangPrefix(pathname), [pathname]);
  const activeLang = hasPrefix ? pathLang : serverLang ?? pathLang;

  const langHref = (code: Lang) => {
    if (hasPrefix) {
      return `/${code}${rest === "/" ? "" : rest}${suffix}`;
    }
    return `/${code}${suffix}`;
  };

  const rememberLang = (code: Lang) => {
    document.cookie = `${LANG_COOKIE}=${code}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  };

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-center sm:justify-end">
        <div className="flex items-center gap-0.5 border border-gray-200 rounded-full overflow-hidden bg-white">
          {LANGS.map((l) => (
            <Link
              key={l.code}
              href={langHref(l.code)}
              onClick={() => rememberLang(l.code)}
              className={`px-3 py-1 text-sm font-medium transition ${
                activeLang === l.code
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-blue-600"
              }`}
              aria-current={activeLang === l.code ? "true" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
