"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import uaDict from "@/locales/ua.json";

export default function NotFound() {
  const pathname = usePathname() || "/";
  const lang = useMemo<Lang>(() => {
    const seg = pathname.split("/").filter(Boolean)[0];
    return seg === "ua" || seg === "ru" || seg === "de" ? (seg as Lang) : "ua";
  }, [pathname]);

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

  useEffect(() => {
    let cancelled = false;
    getDictionary(lang)
      .then((d) => {
        if (!cancelled) setDict(d);
      })
      .catch(() => {
        if (!cancelled) setDict(uaDict as unknown as Dictionary);
      });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t(dict, "specialist.notFound")}</h1>
        <p className="text-gray-600 mb-6">{t(dict, "specialist.notFoundHint")}</p>
        <Link
          href={`/${lang}`}
          className="inline-block px-6 py-3 bg-primary text-white rounded-full shadow hover:shadow-lg transition"
        >
          {t(dict, "common.toHome")}
        </Link>
      </div>
    </div>
  );
}

