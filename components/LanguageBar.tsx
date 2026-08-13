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
  const isSpecialistsSearch =
    pathname === "/specialists" || pathname.startsWith("/specialists/");
  const queryLang = searchParams?.get("lang");
  const specialistsQueryLang =
    queryLang === "ua" || queryLang === "ru" || queryLang === "de" ? queryLang : null;
  const activeLang = hasPrefix
    ? pathLang
    : specialistsQueryLang ?? serverLang ?? pathLang;

  const langHref = (code: Lang) => {
    if (isSpecialistsSearch) {
      const params = new URLSearchParams(qs);
      params.set("lang", code);
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    }
    if (hasPrefix) {
      return `/${code}${rest === "/" ? "" : rest}${suffix}`;
    }
    return `/${code}${suffix}`;
  };

  const rememberLang = (code: Lang) => {
    document.cookie = `${LANG_COOKIE}=${code}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  };

  return (
    <div className="border-b border-freuly-border-subtle bg-freuly-page">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-freuly-4 sm:justify-end sm:px-freuly-6 lg:px-freuly-16">
        <div className="flex items-center gap-0.5 overflow-hidden rounded-full border border-freuly-border-default bg-freuly-surface">
          {LANGS.map((l) => (
            <Link
              key={l.code}
              href={langHref(l.code)}
              onClick={() => rememberLang(l.code)}
              className={`px-3 py-1 text-sm font-medium transition ${
                activeLang === l.code
                  ? "bg-freuly-primary text-freuly-text-on-primary"
                  : "text-freuly-text-secondary hover:text-freuly-primary"
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
