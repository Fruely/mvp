"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";

const LANG_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "uk", label: "Українська" },
  { value: "de", label: "Deutsch" },
] as const;

const SUGGEST_DEBOUNCE_MS = 200;
const SUGGEST_LIMIT = 8;

type HeroSearchProps = {
  lang: string;
  title?: string;
  subtitle?: string;
  primaryCta?: string;
  heroImageUrl?: string | null;
  isHeroLoading?: boolean;
};

const defaultTitle = "Специалисты в Германии на вашем языке.";
const defaultSubtitle = "Локально или онлайн.";
const defaultPrimaryCta = "Найти специалиста";

type CategoryOption = {
  slug: string;
  title: string;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
};

function getCategoryIcon(slug: string): string {
  const key = slug.toLowerCase();
  if (key.includes("psych")) return "🧠";
  if (key.includes("massage")) return "💆";
  if (key.includes("coach")) return "🎯";
  if (key.includes("tutor") || key.includes("education")) return "📚";
  if (key.includes("beauty") || key.includes("cosmet")) return "💅";
  if (key.includes("move") || key.includes("transport")) return "🚚";
  return "✨";
}

function mapSuggestRow(item: unknown): CategoryOption | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  if (!slug) return null;
  return {
    slug,
    title: typeof row.title === "string" ? row.title : "",
    title_ru: typeof row.title_ru === "string" ? row.title_ru : null,
    title_de: typeof row.title_de === "string" ? row.title_de : null,
    title_ua: typeof row.title_ua === "string" ? row.title_ua : null,
  };
}

export default function HeroSearch({
  lang: currentLocale,
  title = defaultTitle,
  subtitle = defaultSubtitle,
  primaryCta = defaultPrimaryCta,
  heroImageUrl,
  isHeroLoading = false,
}: HeroSearchProps) {
  const router = useRouter();
  const [language, setLanguage] = useState<"" | "ru" | "uk" | "de">("");
  const [location, setLocation] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CategoryOption[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    const normalized = currentLocale === "ua" ? "uk" : currentLocale === "ru" ? "ru" : currentLocale === "de" ? "de" : "ru";
    setLanguage(normalized);
  }, [currentLocale]);

  useEffect(() => {
    const q = categoryQuery.trim();
    const delay = q.length > 0 ? SUGGEST_DEBOUNCE_MS : 0;
    const controller = new AbortController();

    const t = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("q", q);
        if (language) {
          params.set("lang", normalizeSearchLangToDbCode(language) ?? language);
        }
        params.set("limit", String(SUGGEST_LIMIT));
        const res = await fetch(`/api/categories/suggest?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const json = (await res.json()) as { data?: unknown };
        if (!res.ok || !Array.isArray(json?.data)) {
          if (!controller.signal.aborted) setSuggestions([]);
          return;
        }
        const next: CategoryOption[] = [];
        for (const row of json.data) {
          const opt = mapSuggestRow(row);
          if (opt) next.push(opt);
        }
        if (!controller.signal.aborted) setSuggestions(next);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, delay);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [categoryQuery, language]);

  const canSubmit = Boolean(language && selectedCategorySlug);

  function toPathLocale(uiLanguage: "ru" | "uk" | "de") {
    return uiLanguage === "uk" ? "ua" : uiLanguage;
  }

  function handleRedirect() {
    if (!language) {
      setInlineError("Выберите язык общения");
      return;
    }
    if (!selectedCategorySlug) {
      setInlineError("Выберите категорию из списка");
      return;
    }

    setInlineError("");
    const chosenCategorySlug = selectedCategorySlug;
    const trimmedLocation = location.trim();

    if (trimmedLocation) {
      const params = new URLSearchParams({
        lang: language,
        place: trimmedLocation,
      });
      params.set("category", chosenCategorySlug);
      router.push(`/specialists?${params.toString()}`);
      return;
    }

    const locale = toPathLocale(language);
    router.push(`/${locale}/category/${chosenCategorySlug}?lang=${language}`);
  }

  function chooseCategory(option: CategoryOption) {
    setCategoryQuery(getCategoryTitle(option, toCategoryTitleLang(language || "ru")));
    setSelectedCategorySlug(option.slug);
    setCategoryOpen(false);
  }

  const showCategoryRequiredHint = Boolean(language && !selectedCategorySlug);

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
                    if (e.key === "Enter" && categoryOpen && suggestions.length > 0) {
                      e.preventDefault();
                      chooseCategory(suggestions[0]);
                    }
                  }}
                  placeholder="Категория"
                  className="w-full min-h-[2.25rem] py-1.5 text-sm bg-transparent border-none outline-none text-gray-800 placeholder-gray-400"
                  aria-label="Категория"
                  autoComplete="off"
                />
                {categoryOpen && (suggestionsLoading || suggestions.length > 0) ? (
                  <div
                    className={`absolute top-full left-0 mt-2 min-w-[320px] max-h-56 overflow-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/60 py-2 z-50 transition-all duration-[120ms] opacity-100 translate-y-0 pointer-events-auto`}
                  >
                    {suggestionsLoading ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Загрузка…</div>
                    ) : (
                      suggestions.map((option) => (
                        <button
                          key={option.slug}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => chooseCategory(option)}
                          className="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-all duration-150 hover:translate-x-1"
                        >
                          <span aria-hidden className="inline-flex w-5 items-center justify-center">
                            {getCategoryIcon(option.slug)}
                          </span>
                          <span>{getCategoryTitle(option, toCategoryTitleLang(language || "ru"))}</span>
                        </button>
                      ))
                    )}
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
            ) : showCategoryRequiredHint ? (
              <p className="mt-2 text-sm text-amber-600">Выберите категорию из списка</p>
            ) : null}
            <div className="mt-4 text-sm text-gray-500">
              Вы специалист?{" "}
              <Link
                href="/specialist"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Добавить услуги →
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
