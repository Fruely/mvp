"use client";

import { useEffect, useState } from "react";
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
  primaryCta?: string;
  categoryPlaceholder?: string;
  plzPlaceholder?: string;
  languageLabel?: string;
  className?: string;
};

const defaultPrimaryCta = "Найти специалиста";
const defaultCategoryPlaceholder = "Категория";
const defaultPlzPlaceholder = "PLZ или город";
const defaultLanguageLabel = "Язык";

type CategoryOption = {
  slug: string;
  /** Present when /api/categories/suggest returns category id (maps from category_id). */
  id?: string;
  title: string;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
};

function mapSuggestRow(item: unknown): CategoryOption | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  if (!slug) return null;
  const id =
    typeof row.id === "string" && row.id.trim().length > 0 ? row.id.trim() : undefined;
  return {
    slug,
    ...(id ? { id } : {}),
    title: typeof row.title === "string" ? row.title : "",
    title_ru: typeof row.title_ru === "string" ? row.title_ru : null,
    title_de: typeof row.title_de === "string" ? row.title_de : null,
    title_ua: typeof row.title_ua === "string" ? row.title_ua : null,
  };
}

export default function HeroSearch({
  lang: currentLocale,
  primaryCta = defaultPrimaryCta,
  categoryPlaceholder = defaultCategoryPlaceholder,
  plzPlaceholder = defaultPlzPlaceholder,
  languageLabel = defaultLanguageLabel,
  className,
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
    const normalized =
      currentLocale === "ua"
        ? "uk"
        : currentLocale === "ru"
          ? "ru"
          : currentLocale === "de"
            ? "de"
            : "ru";
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

  function logSearchSubmitted(routeTarget: string, trimmedLocation: string) {
    const langFilter = normalizeSearchLangToDbCode(language) ?? language;
    void fetch("/api/search/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        event_type: "search_submitted",
        lang_ui: currentLocale,
        lang_filter: langFilter,
        query_raw: categoryQuery.trim() || null,
        selected_via: "suggestion",
        place_query: trimmedLocation || null,
        route_target: routeTarget,
        metadata: { source: "hero_search" },
      }),
    }).catch(() => {});
  }

  function logSuggestionSelected(option: CategoryOption, queryRawBefore: string) {
    const langFilter = normalizeSearchLangToDbCode(language) ?? language;
    const body: Record<string, unknown> = {
      event_type: "suggestion_selected",
      lang_ui: currentLocale,
      lang_filter: langFilter,
      query_raw: queryRawBefore.trim() || null,
      selected_via: "suggestion",
      metadata: { source: "hero_search" },
    };
    if (typeof option.id === "string" && option.id.trim()) {
      body.selected_category_id = option.id.trim();
    }
    void fetch("/api/search/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(body),
    }).catch(() => {});
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

    let routeTarget: string;
    if (trimmedLocation) {
      const params = new URLSearchParams({
        lang: language,
        place: trimmedLocation,
      });
      params.set("category", chosenCategorySlug);
      routeTarget = `/specialists?${params.toString()}`;
    } else {
      const locale = toPathLocale(language);
      routeTarget = `/${locale}/category/${chosenCategorySlug}?lang=${language}`;
    }

    logSearchSubmitted(routeTarget, trimmedLocation);
    router.push(routeTarget);
  }

  function chooseCategory(option: CategoryOption) {
    const queryRawBefore = categoryQuery;
    logSuggestionSelected(option, queryRawBefore);
    setCategoryQuery(getCategoryTitle(option, toCategoryTitleLang(language || "ru")));
    setSelectedCategorySlug(option.slug);
    setCategoryOpen(false);
  }

  const showCategoryRequiredHint = Boolean(language && !selectedCategorySlug);
  const containerClass =
    className ??
    "mt-8 max-w-4xl mx-auto bg-white shadow-soft rounded-md p-3 flex flex-col sm:flex-row gap-3 text-left";

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRedirect();
        }}
        className={containerClass}
      >
        <div className="relative h-14 sm:flex-1 min-w-0">
          <input
            type="text"
            value={categoryQuery}
            onChange={(e) => {
              setCategoryQuery(e.target.value);
              setSelectedCategorySlug(null);
              setCategoryOpen(true);
              if (inlineError) setInlineError("");
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
            placeholder={categoryPlaceholder}
            className="h-14 w-full rounded-lg border border-gray-200 px-4 text-sm text-gray-700 placeholder:text-gray-500 outline-none focus:border-blue-400"
            aria-label={categoryPlaceholder}
            autoComplete="off"
          />
          {categoryOpen && (suggestionsLoading || suggestions.length > 0) ? (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              {suggestionsLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Загрузка…</div>
              ) : (
                suggestions.map((option) => (
                  <button
                    key={option.slug}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => chooseCategory(option)}
                    className="flex w-full items-center gap-2 whitespace-nowrap px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                  >
                    <span>{getCategoryTitle(option, toCategoryTitleLang(language || "ru"))}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={plzPlaceholder}
          className="h-14 sm:flex-1 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 placeholder:text-gray-500 outline-none focus:border-blue-400"
          aria-label={plzPlaceholder}
        />

        <select
          value={language}
          onChange={(e) => {
            setLanguage((e.target.value as "ru" | "uk" | "de") || "");
            if (inlineError) setInlineError("");
          }}
          className="h-14 sm:w-48 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 outline-none focus:border-blue-400"
          aria-label={languageLabel}
        >
          <option value="">{languageLabel}</option>
          {LANG_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 px-6 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-soft disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
        >
          {primaryCta}
        </button>
      </form>
      {inlineError ? (
        <p className="mt-2 text-sm text-red-600 text-center">{inlineError}</p>
      ) : showCategoryRequiredHint ? (
        <p className="mt-2 text-sm text-amber-600 text-center">Выберите категорию из списка</p>
      ) : null}
    </div>
  );
}
