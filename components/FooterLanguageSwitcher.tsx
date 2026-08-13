"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

const LANG_COOKIE = "freuly_lang";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
const ROOT_FALLBACK_LANG: Lang = "ru";

const LANGS: Lang[] = ["ua", "ru", "de"];

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

type Props = {
  lang: Lang;
  labels: Record<Lang, string>;
};

export default function FooterLanguageSwitcher({ lang, labels }: Props) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";

  const hasPrefix = useMemo(() => pathHasLangPrefix(pathname), [pathname]);
  const { lang: pathLang, rest } = useMemo(() => stripLangPrefix(pathname), [pathname]);
  const activeLang = hasPrefix ? pathLang : lang;

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
    <div className="flex flex-wrap items-center gap-1.5">
      <Globe className="h-[13px] w-[13px] shrink-0 text-freuly-text-secondary" aria-hidden />
      <span className="sr-only">{labels[activeLang]}</span>
      <div className="flex flex-wrap items-center gap-3">
        {LANGS.map((code) => (
          <Link
            key={code}
            href={langHref(code)}
            onClick={() => rememberLang(code)}
            className={`text-[13px] font-medium transition-colors ${
              activeLang === code
                ? "text-white"
                : "text-freuly-text-secondary hover:text-white"
            }`}
            aria-current={activeLang === code ? "true" : undefined}
          >
            {labels[code]}
          </Link>
        ))}
      </div>
    </div>
  );
}
