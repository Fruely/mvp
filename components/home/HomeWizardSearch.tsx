"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { t, type Dictionary, type Lang } from "@/lib/i18n";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";

const LANG_OPTIONS = [
  { value: "ru", labelKey: "home.wizard.lang.ru" },
  { value: "uk", labelKey: "home.wizard.lang.uk" },
  { value: "de", labelKey: "home.wizard.lang.de" },
] as const;

const WIZARD_PRIORITY_SLUGS = [
  "psychologists",
  "cosmetologists",
  "hairdressers",
  "tutors",
  "lawyers",
  "it-support",
  "tax-consultants",
  "housemaster",
] as const;

const MAX_WIZARD_CATEGORIES = 8;

type WizardLanguage = (typeof LANG_OPTIONS)[number]["value"];
type LocationMode = "online" | "city";

type WizardCategory = {
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  specialists_count: number;
};

type HomeWizardSearchProps = {
  lang: Lang;
  dict: Dictionary;
  submitLabel?: string;
  initialCity?: string;
  className?: string;
};

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function normalizeWizardCategories(raw: unknown[]): WizardCategory[] {
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
    )
    .map((item) => {
      const id = typeof item.id === "string" ? item.id.trim() : "";
      const slugRaw = typeof item.slug === "string" ? item.slug.trim() : "";
      const slug = slugRaw || id;

      return {
        slug,
        title: typeof item.title === "string" ? item.title : null,
        title_ru: typeof item.title_ru === "string" ? item.title_ru : null,
        title_de: typeof item.title_de === "string" ? item.title_de : null,
        title_ua: typeof item.title_ua === "string" ? item.title_ua : null,
        specialists_count: Number(item.specialists_count || 0),
      };
    })
    .filter((item) => item.slug.length > 0 && item.specialists_count > 0);
}

function orderWizardCategories(categories: WizardCategory[]): WizardCategory[] {
  const bySlug = new Map(categories.map((item) => [item.slug, item]));
  const ordered: WizardCategory[] = [];
  const used = new Set<string>();

  for (const slug of WIZARD_PRIORITY_SLUGS) {
    const item = bySlug.get(slug);
    if (!item) continue;
    ordered.push(item);
    used.add(slug);
    if (ordered.length >= MAX_WIZARD_CATEGORIES) return ordered;
  }

  for (const item of categories) {
    if (used.has(item.slug)) continue;
    ordered.push(item);
    if (ordered.length >= MAX_WIZARD_CATEGORIES) break;
  }

  return ordered;
}

async function fetchPopularCategories(): Promise<WizardCategory[]> {
  const res = await fetch("/api/homepage/popular-categories", { cache: "no-store" });
  if (!res.ok) return [];

  try {
    const json = (await res.json()) as { data?: unknown };
    return orderWizardCategories(
      normalizeWizardCategories(Array.isArray(json?.data) ? json.data : [])
    );
  } catch {
    return [];
  }
}

function buildSearchUrl(
  lang: Lang,
  opts: {
    categorySlug: string;
    language: WizardLanguage;
    locationMode: LocationMode;
    city: string;
  }
): string {
  const params = new URLSearchParams();
  params.set("category", opts.categorySlug);
  params.set("language", opts.language);
  if (opts.locationMode === "online") {
    params.set("remote", "true");
  } else if (opts.city.trim()) {
    params.set("city", opts.city.trim());
  }
  return `/${lang}/search?${params.toString()}`;
}

function formatWizardProgress(dict: Dictionary, step: number, total: number): string {
  return t(dict, "home.wizard.mobileProgress")
    .replace("{{step}}", String(step))
    .replace("{{total}}", String(total));
}

function chipClass(selected: boolean) {
  return selected
    ? "border-orange-500 bg-orange-50 text-orange-700 ring-1 ring-orange-500"
    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";
}

export default function HomeWizardSearch({
  lang,
  dict,
  submitLabel,
  initialCity = "",
  className,
}: HomeWizardSearchProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const categoryTitleLang = toCategoryTitleLang(lang === "ua" ? "uk" : lang);

  const [categories, setCategories] = useState<WizardCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [mobileStep, setMobileStep] = useState(1);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [locationMode, setLocationMode] = useState<LocationMode | null>(null);
  const [city, setCity] = useState(initialCity);
  const [language, setLanguage] = useState<WizardLanguage | null>(null);
  const [inlineError, setInlineError] = useState("");

  useEffect(() => {
    setCity(initialCity);
  }, [initialCity]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);
      try {
        const next = await fetchPopularCategories();
        if (!cancelled) setCategories(next);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = Boolean(
    categorySlug && locationMode && language && (locationMode === "online" || city.trim())
  );

  const visibleStep = useMemo(() => {
    if (!isMobile) return 3;
    return mobileStep;
  }, [isMobile, mobileStep]);

  const step2Enabled = Boolean(categorySlug);
  const step3Enabled = Boolean(
    categorySlug && locationMode && (locationMode === "online" || city.trim())
  );

  function selectCategory(slug: string) {
    setCategorySlug(slug);
    setInlineError("");
    if (isMobile) setMobileStep(2);
  }

  function selectLocation(mode: LocationMode) {
    setLocationMode(mode);
    setInlineError("");
    if (mode === "online" && isMobile) {
      setMobileStep(3);
    }
  }

  function selectLanguage(value: WizardLanguage) {
    setLanguage(value);
    setInlineError("");
  }

  function handleSubmit() {
    if (!categorySlug) {
      setInlineError(t(dict, "home.wizard.errors.category"));
      if (isMobile) setMobileStep(1);
      return;
    }
    if (!locationMode) {
      setInlineError(t(dict, "home.wizard.errors.location"));
      if (isMobile) setMobileStep(2);
      return;
    }
    if (locationMode === "city" && !city.trim()) {
      setInlineError(t(dict, "home.wizard.errors.city"));
      if (isMobile) setMobileStep(2);
      return;
    }
    if (!language) {
      setInlineError(t(dict, "home.wizard.errors.language"));
      if (isMobile) setMobileStep(3);
      return;
    }

    setInlineError("");
    router.push(
      buildSearchUrl(lang, {
        categorySlug,
        language,
        locationMode,
        city,
      })
    );
  }

  const containerClass =
    className ??
    "mt-8 max-w-4xl mx-auto rounded-xl bg-white shadow-soft border border-gray-100 p-4 sm:p-6 text-left";

  const showStep = (step: number) => {
    if (isMobile) return visibleStep === step;
    if (step === 1) return true;
    if (step === 2) return step2Enabled;
    if (step === 3) return step3Enabled;
    return false;
  };

  return (
    <div className="w-full">
      <div className={containerClass}>
        {isMobile ? (
          <p className="mb-4 text-sm font-medium text-textSecondary">
            {formatWizardProgress(dict, visibleStep, 3)}
          </p>
        ) : null}

        {showStep(1) ? (
          <section
            className="transition-opacity duration-200"
            aria-label={t(dict, "home.wizard.step1.title")}
          >
            <h2 className="text-base sm:text-lg font-semibold text-textPrimary">
              {t(dict, "home.wizard.step1.title")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoriesLoading ? (
                <p className="text-sm text-textSecondary">{t(dict, "home.wizard.loading")}</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-textSecondary">{t(dict, "home.wizard.noCategories")}</p>
              ) : (
                categories.map((category) => {
                  const selected = categorySlug === category.slug;
                  return (
                    <button
                      key={category.slug}
                      type="button"
                      onClick={() => selectCategory(category.slug)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${chipClass(selected)}`}
                    >
                      {getCategoryTitle(category, categoryTitleLang)}
                    </button>
                  );
                })
              )}
            </div>
            {isMobile && categorySlug ? (
              <button
                type="button"
                onClick={() => setMobileStep(2)}
                className="mt-4 w-full rounded-md bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                {t(dict, "home.wizard.next")}
              </button>
            ) : null}
          </section>
        ) : null}

        {showStep(2) ? (
          <section
            className={`mt-5 sm:mt-6 transition-all duration-200 ${
              step2Enabled ? "opacity-100" : "opacity-60 pointer-events-none"
            }`}
            aria-label={t(dict, "home.wizard.step2.title")}
          >
            <h2 className="text-base sm:text-lg font-semibold text-textPrimary">
              {t(dict, "home.wizard.step2.title")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectLocation("online")}
                disabled={!step2Enabled}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${chipClass(locationMode === "online")}`}
              >
                {t(dict, "home.wizard.step2.online")}
              </button>
              <button
                type="button"
                onClick={() => selectLocation("city")}
                disabled={!step2Enabled}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${chipClass(locationMode === "city")}`}
              >
                {t(dict, "home.wizard.step2.city")}
              </button>
            </div>

            {locationMode === "city" ? (
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (inlineError) setInlineError("");
                }}
                placeholder={t(dict, "home.wizard.step2.cityPlaceholder")}
                className="mt-3 h-12 w-full rounded-lg border border-gray-200 px-4 text-sm text-gray-700 placeholder:text-gray-500 outline-none transition-colors focus:border-blue-400"
                aria-label={t(dict, "home.wizard.step2.cityPlaceholder")}
              />
            ) : null}

            {isMobile ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep(1)}
                  className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t(dict, "home.wizard.back")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!locationMode) {
                      setInlineError(t(dict, "home.wizard.errors.location"));
                      return;
                    }
                    if (locationMode === "city" && !city.trim()) {
                      setInlineError(t(dict, "home.wizard.errors.city"));
                      return;
                    }
                    setInlineError("");
                    setMobileStep(3);
                  }}
                  disabled={!step2Enabled}
                  className="flex-1 rounded-md bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t(dict, "home.wizard.next")}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {showStep(3) ? (
          <section
            className={`mt-5 sm:mt-6 transition-all duration-200 ${
              step3Enabled ? "opacity-100" : "opacity-60 pointer-events-none"
            }`}
            aria-label={t(dict, "home.wizard.step3.title")}
          >
            <h2 className="text-base sm:text-lg font-semibold text-textPrimary">
              {t(dict, "home.wizard.step3.title")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {LANG_OPTIONS.map((option) => {
                const selected = language === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectLanguage(option.value)}
                    disabled={!step3Enabled}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed ${chipClass(selected)}`}
                  >
                    {t(dict, option.labelKey)}
                  </button>
                );
              })}
            </div>

            {isMobile ? (
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMobileStep(2)}
                  className="flex-1 rounded-md border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {t(dict, "home.wizard.back")}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 rounded-md bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitLabel ?? t(dict, "home.wizard.submit")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="mt-5 w-full rounded-md bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-orange-500 sm:w-auto"
              >
                {submitLabel ?? t(dict, "home.wizard.submit")}
              </button>
            )}
          </section>
        ) : null}
      </div>

      {inlineError ? (
        <p className="mt-2 text-center text-sm text-red-600">{inlineError}</p>
      ) : null}
    </div>
  );
}
