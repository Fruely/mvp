"use client";

import Link from "next/link";
import { useMemo, useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { isPrivateDashboardPath } from "@/lib/dashboard/isPrivateDashboardPath";
import { ensureArticleTranslationAction } from "@/lib/content/translationAction";

const LANG_COOKIE = "freuly_lang";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
const ROOT_FALLBACK_LANG: Lang = "ru";

const LANGS: Lang[] = ["ua", "ru", "de"];

const TRANSLATION_ERROR: Record<Lang, string> = {
  ru: "Не удалось подготовить перевод. Попробуйте ещё раз.",
  ua: "Не вдалося підготувати переклад. Спробуйте ще раз.",
  de: "Die Übersetzung konnte nicht erstellt werden. Bitte erneut versuchen.",
};

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";
  const [pendingTarget, setPendingTarget] = useState<Lang | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const hasPrefix = useMemo(() => pathHasLangPrefix(pathname), [pathname]);
  const { lang: pathLang, rest } = useMemo(() => stripLangPrefix(pathname), [pathname]);
  const activeLang = hasPrefix ? pathLang : lang;
  const disablePrefetch = isPrivateDashboardPath(pathname);
  const articleSlug = useMemo(() => {
    const match = rest.match(/^\/blog\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
    return match?.[1] ?? null;
  }, [rest]);

  const langHref = (code: Lang) => {
    if (hasPrefix) {
      return `/${code}${rest === "/" ? "" : rest}${suffix}`;
    }
    return `/${code}${suffix}`;
  };

  const rememberLang = (code: Lang) => {
    document.cookie = `${LANG_COOKIE}=${code}; Path=/; Max-Age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax`;
  };

  const handleLanguageClick = async (
    event: MouseEvent<HTMLAnchorElement>,
    code: Lang,
  ) => {
    if (pendingTarget) {
      event.preventDefault();
      return;
    }

    if (!articleSlug || code === activeLang) {
      rememberLang(code);
      return;
    }

    event.preventDefault();
    setPendingTarget(code);
    setTranslationError(null);

    try {
      const result = await ensureArticleTranslationAction({
        sourceLang: activeLang,
        targetLang: code,
        slug: articleSlug,
      });

      if (!result.ok) {
        setTranslationError(TRANSLATION_ERROR[activeLang]);
        return;
      }

      rememberLang(code);
      router.push(`${result.href}${suffix}`);
    } catch (error) {
      console.error("[language-switcher] article translation failed", error);
      setTranslationError(TRANSLATION_ERROR[activeLang]);
    } finally {
      setPendingTarget(null);
    }
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
            prefetch={articleSlug ? false : disablePrefetch ? false : undefined}
            onClick={(event) => void handleLanguageClick(event, code)}
            className={`text-[13px] font-medium transition-colors ${
              activeLang === code
                ? "text-white"
                : "text-freuly-text-secondary hover:text-white"
            } ${pendingTarget ? "opacity-70" : ""}`}
            aria-current={activeLang === code ? "true" : undefined}
            aria-busy={pendingTarget === code ? "true" : undefined}
          >
            {labels[code]}
            {pendingTarget === code ? "…" : ""}
          </Link>
        ))}
      </div>
      {translationError ? (
        <span className="basis-full pl-[19px] text-[11px] text-freuly-error">
          {translationError}
        </span>
      ) : null}
    </div>
  );
}
