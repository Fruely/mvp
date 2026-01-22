import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, t } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";

const LANGS = [
  { code: "ua", label: "UA" },
  { code: "ru", label: "RU" },
  { code: "de", label: "DE" },
];

function stripLangPrefix(pathname) {
  const parts = (pathname || "/").split("/").filter(Boolean);
  if (parts.length === 0) return { lang: "ua", rest: "/" };
  if (["ua", "ru", "de"].includes(parts[0])) {
    const rest = "/" + parts.slice(1).join("/");
    return { lang: parts[0], rest: rest === "/" ? "/" : rest };
  }
  return { lang: "ua", rest: pathname || "/" };
}

export default function Header({ dict: dictProp } = {}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const { lang, rest } = useMemo(() => stripLangPrefix(pathname), [pathname]);
  const qs = searchParams?.toString();
  const suffix = qs ? `?${qs}` : "";

  const [dict, setDict] = useState(dictProp || uaDict);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (dictProp) {
        setDict(dictProp);
        return;
      }
      try {
        const nextDict = await getDictionary(lang);
        if (!cancelled) setDict(nextDict);
      } catch {
        // keep fallback (uaDict)
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [lang, dictProp]);

  const changeLang = (code) => {
    const nextPath = `/${code}${rest === "/" ? "" : rest}${suffix}`;
    router.push(nextPath);
  };

  const onCategoriesClick = (e) => {
    if (typeof document !== "undefined" && document.getElementById("categories")) {
      return;
    }
    e.preventDefault();
    router.push(`/${lang}#categories`);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href={`/${lang}`} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                F
              </div>
              <div className="leading-tight">
                <div className="text-2xl font-bold text-blue-600">Freuly</div>
                <div className="text-xs text-gray-600">{t(dict, "site.slogan")}</div>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a className="text-gray-700 hover:text-blue-600 font-medium transition" href="#categories" onClick={onCategoriesClick}>
              {t(dict, "header.nav.categories")}
            </a>
            <Link href={`/${lang}/about`} className="text-gray-700 hover:text-blue-600 font-medium transition">
              {t(dict, "header.nav.about")}
            </Link>
            <Link href={`/${lang}/contacts`} className="text-gray-700 hover:text-blue-600 font-medium transition">
              {t(dict, "header.nav.contacts")}
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-sm text-gray-600 mr-2">{t(dict, "header.joinQuestion")}</div>
              <Link href={`/${lang}/specialist`} className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md transition">
                {t(dict, "header.joinButton")}
              </Link>
            </div>

            <div className="flex items-center gap-2 border border-gray-200 rounded-full overflow-hidden bg-gray-50">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={`px-3 py-1 text-sm font-medium transition ${lang === l.code ? "bg-blue-600 text-white" : "text-gray-600 hover:text-blue-600"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
