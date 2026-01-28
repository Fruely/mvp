"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string }[] = [
  { code: "ua", label: "UA" },
  { code: "ru", label: "RU" },
  { code: "de", label: "DE" },
];

function stripLangPrefix(pathname: string) {
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts.length === 0) return { lang: "ua" as Lang, rest: "/" };
  if (SUPPORTED_LANGS.includes(parts[0] as Lang)) {
    const rest = "/" + parts.slice(1).join("/");
    return { lang: parts[0] as Lang, rest: rest === "/" ? "/" : rest };
  }
  return { lang: "ua" as Lang, rest: pathname || "/" };
}

export default function LanguageBar() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";

  const { lang, rest } = useMemo(() => stripLangPrefix(pathname), [pathname]);

  const changeLang = (code: Lang) => {
    const nextPath = `/${code}${rest === "/" ? "" : rest}${suffix}`;
    router.push(nextPath);
  };

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-center sm:justify-end">
        <div className="flex items-center gap-0.5 border border-gray-200 rounded-full overflow-hidden bg-white">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => changeLang(l.code)}
              className={`px-3 py-1 text-sm font-medium transition ${
                lang === l.code
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-blue-600"
              }`}
              aria-current={lang === l.code ? "true" : undefined}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
