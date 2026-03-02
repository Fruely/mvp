"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const LANG_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
  { value: "de", label: "Deutsch" },
] as const;

type HeroSearchProps = {
  lang: string;
  title?: string;
  subtitle?: string;
  primaryCta?: string;
  secondaryCta?: string;
  heroImageUrl?: string | null;
  isHeroLoading?: boolean;
};

const defaultTitle = "Специалисты в Германии на вашем языке.";
const defaultSubtitle = "Локально или онлайн.";
const defaultPrimaryCta = "Найти специалиста";
const defaultSecondaryCta = "Присоединиться к Freuly";

type CategoryOption = {
  slug: string;
  title: string;
};

export default function HeroSearch({
  lang: currentLocale,
  title = defaultTitle,
  subtitle = defaultSubtitle,
  primaryCta = defaultPrimaryCta,
  secondaryCta = defaultSecondaryCta,
  heroImageUrl,
  isHeroLoading = false,
}: HeroSearchProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<"" | "ru" | "uk" | "de">("");
  const [location, setLocation] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    const normalized = currentLocale === "ua" ? "uk" : currentLocale === "ru" ? "ru" : currentLocale === "de" ? "de" : "ru";
    setLanguage(normalized);
  }, [currentLocale]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const res = await fetch("/api/specialists/categories?mode=children", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !Array.isArray(json?.data)) return;

        const normalized = json.data
          .filter(
            (item: { slug?: unknown; title?: unknown }) =>
              typeof item?.slug === "string" &&
              item.slug.trim().length > 0 &&
              typeof item?.title === "string" &&
              item.title.trim().length > 0
          )
          .map((item: { slug: string; title: string }) => ({
            slug: item.slug.trim(),
            title: item.title.trim(),
          }));

        if (!cancelled) {
          setCategories(normalized);
        }
      } catch {
        // keep search usable without category hints
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return categories.slice(0, 8);
    return categories
      .filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.slug.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [categories, categoryQuery]);

  const canSubmit = Boolean(language);

  function toPathLocale(uiLanguage: "ru" | "uk" | "de") {
    return uiLanguage === "uk" ? "ua" : uiLanguage;
  }

  function resolveCategorySlug() {
    if (selectedCategorySlug) return selectedCategorySlug;
    const query = categoryQuery.trim().toLowerCase();
    if (!query) return null;
    const match = categories.find(
      (item) => item.title.toLowerCase() === query || item.slug.toLowerCase() === query
    );
    return match?.slug ?? null;
  }

  function handleRedirect() {
    if (!language) {
      setInlineError("Выберите язык общения");
      return;
    }

    setInlineError("");
    const chosenCategorySlug = resolveCategorySlug();
    const trimmedLocation = location.trim();

    if (trimmedLocation) {
      const params = new URLSearchParams({
        lang: language,
        place: trimmedLocation,
      });
      if (chosenCategorySlug) {
        params.set("category", chosenCategorySlug);
      }
      router.push(`/specialists?${params.toString()}`);
      return;
    }

    if (chosenCategorySlug) {
      const locale = toPathLocale(language);
      router.push(`/${locale}/category/${chosenCategorySlug}?lang=${language}`);
      return;
    }

    router.push(`/${toPathLocale(language)}`);
  }

  function chooseCategory(option: CategoryOption) {
    setCategoryQuery(option.title);
    setSelectedCategorySlug(option.slug);
    setCategoryOpen(false);
  }

  return (
    <section className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: title, subtitle, intent form */}
          <div className="order-2 md:order-1">
            <div className="rounded-3xl bg-white/30 px-6 py-8 backdrop-blur-md md:px-12 md:py-10">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-gray-700 mb-6">{subtitle}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRedirect();
              }}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-0 border border-gray-200 rounded-xl overflow-visible bg-white shadow-sm min-w-0"
            >
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 flex items-center">
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage((e.target.value as "ru" | "uk" | "de") || "");
                    if (inlineError) setInlineError("");
                  }}
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800"
                  aria-label="Язык"
                >
                  <option value="">Язык</option>
                  {LANG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 relative">
                <input
                  type="text"
                  value={categoryQuery}
                  onChange={(e) => {
                    setCategoryQuery(e.target.value);
                    setSelectedCategorySlug(null);
                    setCategoryOpen(true);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setCategoryOpen(false), 120);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && categoryOpen && filteredCategories.length > 0) {
                      e.preventDefault();
                      chooseCategory(filteredCategories[0]);
                    }
                  }}
                  placeholder="Категория"
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                  aria-label="Категория"
                  autoComplete="off"
                />
                {categoryOpen && filteredCategories.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredCategories.map((option) => (
                      <button
                        key={option.slug}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseCategory(option)}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {option.title}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="border-b sm:border-b-0 sm:border-r border-gray-200 p-3 min-w-0 flex items-center">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="PLZ или город"
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                  aria-label="Локация"
                />
              </div>
              <div className="p-3 flex items-center shrink-0">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full sm:w-auto px-5 py-2 min-h-[2.25rem] text-sm font-semibold rounded-lg bg-[#3B5BDB] text-white hover:bg-[#364FC7] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3B5BDB]"
                >
                  {primaryCta}
                </button>
              </div>
            </form>
            {inlineError ? (
              <p className="mt-2 text-sm text-red-600">{inlineError}</p>
            ) : null}
            <div className="mt-4">
              <Link
                href={`/${currentLocale}/become-specialist`}
                className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 transition hover:bg-blue-50"
              >
                {secondaryCta}
              </Link>
            </div>
            </div>
          </div>

          {/* Right: hero image */}
          <div className="order-1 md:order-2 hidden md:flex items-center justify-center">
            {isHeroLoading ? (
              <div className="max-w-md w-full aspect-square rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 animate-pulse" />
            ) : heroImageUrl ? (
              <Image
                unoptimized
                src={heroImageUrl}
                alt=""
                width={512}
                height={512}
                className="max-w-md rounded-3xl shadow-2xl border border-blue-100 h-auto w-full object-cover"
              />
            ) : (
              <div className="relative w-80 h-80">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-6xl shadow-lg">
                    🌍
                  </div>
                </div>
                <div
                  className="absolute top-0 left-8 animate-bounce"
                  style={{ animationDelay: "0s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-blue-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Deutsch
                  </p>
                </div>
                <div
                  className="absolute top-32 right-4 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-purple-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Русский
                  </p>
                </div>
                <div
                  className="absolute bottom-8 left-12 animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                >
                  <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl border-2 border-pink-200" />
                  <p className="text-center text-sm font-semibold text-gray-700 mt-2">
                    Українська
                  </p>
                </div>
                <div className="absolute bottom-0 right-8 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-3xl shadow-lg">
                    👨‍⚕️
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
