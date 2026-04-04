"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getDictionary, t, type Dictionary, type Lang } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { normalizeLang } from "@/lib/normalizeLang";
import uaDict from "@/locales/ua.json";
import SpecialistPreviewCard from "@/components/specialist/SpecialistPreviewCard";

interface SpecialistPreview {
  id: string;
  slug?: string | null;
  name: string | null;
  avatar_url: string | null;
  specialization_line?: string | null;
  about_line?: string | null;
  city: string | null;
  work_format: "online" | "offline" | "hybrid";
  languages?: string[];
  is_verified: boolean;
  rating?: number | null;
  reviews_count?: number | null;
  years_of_experience?: number | null;
  is_new: boolean;
  new_until?: string | null;
  min_price_from?: number | null;
  min_price_to?: number | null;
  min_pricing_type?: "fixed" | "range" | "hourly" | null;
  min_currency?: string | null;
  active_services_count?: number | null;
  mobile_service?: boolean;
  service_radius_km?: number | null;
}

interface Category {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  specialists_count: number;
  is_clickable: boolean;
}

interface ParentChildCategory {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  specialists_count: number;
  is_clickable: boolean;
}

interface ParentCategory {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  specialists_count: number;
  is_clickable: boolean;
  children: ParentChildCategory[];
}

interface SpecialistsMeta {
  total?: number;
  has_more?: boolean;
  next_offset?: number;
  filter_options?: {
    languages?: string[];
    cities?: string[];
  };
}

const PAGE_LIMIT = 12;
type SortKey = "best_match" | "newest" | "rating" | "price_low" | "price_high";
const SORT_TO_API: Record<SortKey, "relevance" | "new" | "experience"> = {
  best_match: "relevance",
  newest: "new",
  rating: "experience",
  price_low: "relevance",
  price_high: "relevance",
};

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSpecialistPreview(input: unknown): SpecialistPreview | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  if (!id) return null;
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;
  const slug =
    typeof row.slug === "string" && row.slug.trim()
      ? row.slug.trim()
      : `specialist-${id.slice(0, 8)}`;
  const workFormat =
    row.work_format === "offline" || row.work_format === "hybrid" || row.work_format === "online"
      ? row.work_format
      : "online";

  return {
    id,
    slug,
    name,
    avatar_url: typeof row.avatar_url === "string" && row.avatar_url.trim() ? row.avatar_url : null,
    specialization_line:
      typeof row.specialization_line === "string" && row.specialization_line.trim()
        ? row.specialization_line.trim()
        : null,
    about_line:
      typeof row.about_line === "string" && row.about_line.trim() ? row.about_line.trim() : null,
    city: typeof row.city === "string" && row.city.trim() ? row.city.trim() : null,
    work_format: workFormat,
    languages: Array.isArray(row.languages)
      ? row.languages
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .slice(0, 8)
      : [],
    is_verified: Boolean(row.is_verified),
    rating: toNullableNumber(row.rating),
    reviews_count: toNullableNumber(row.reviews_count),
    years_of_experience: toNullableNumber(row.years_of_experience),
    is_new: Boolean(row.is_new),
    new_until: typeof row.new_until === "string" && row.new_until.trim() ? row.new_until : null,
    min_price_from: toNullableNumber(row.min_price_from),
    min_price_to: toNullableNumber(row.min_price_to),
    min_pricing_type:
      row.min_pricing_type === "fixed" || row.min_pricing_type === "range" || row.min_pricing_type === "hourly"
        ? row.min_pricing_type
        : null,
    min_currency: typeof row.min_currency === "string" && row.min_currency.trim() ? row.min_currency : null,
    active_services_count: toNullableNumber(row.active_services_count),
    mobile_service: Boolean(row.mobile_service),
    service_radius_km: toNullableNumber(row.service_radius_km),
  };
}

export default function CategoryPage({ params }: { params: { lang: string; slug: string } }) {
  const { slug } = params;
  const lang = params.lang as Lang;
  const langPrefix = `/${lang}`;

  const [dict, setDict] = useState<Dictionary>(uaDict as unknown as Dictionary);

  const [category, setCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<ParentCategory | null>(null);
  const [specialists, setSpecialists] = useState<SpecialistPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSpecialists, setLoadingSpecialists] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalSpecialists, setTotalSpecialists] = useState(0);
  const [languageOptions, setLanguageOptions] = useState<string[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [sort, setSort] = useState<SortKey>("best_match");
  const [loadError, setLoadError] = useState<string | null>(null);
  const mergeUniqueSpecialists = (
    current: SpecialistPreview[],
    incoming: SpecialistPreview[]
  ): SpecialistPreview[] => {
    const seen = new Set(current.map((item) => item.id));
    const merged = [...current];
    for (const item of incoming) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  };

  const loadSpecialists = async (reset: boolean) => {
    if (!category?.id) return;
    setLoadingSpecialists(true);
    setLoadError(null);
    try {
      const offset = reset ? 0 : nextOffset;
      const params = new URLSearchParams({
        category_id: category.id,
        limit: String(PAGE_LIMIT),
        offset: String(offset),
        sort: SORT_TO_API[sort],
      });
      if (selectedLanguage) params.set("language", selectedLanguage);
      if (selectedCity) params.set("city", selectedCity);

      const response = await fetch(`/api/specialists/list?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Failed to load specialists");
      }

      const incoming: SpecialistPreview[] = Array.isArray(result?.data)
        ? result.data
            .map((item) => normalizeSpecialistPreview(item))
            .filter((item): item is SpecialistPreview => Boolean(item))
        : [];
      const meta = (result?.meta ?? {}) as SpecialistsMeta;

      console.log("incoming specialists", incoming);
      setSpecialists((prev) => (reset ? incoming : mergeUniqueSpecialists(prev, incoming)));
      setHasMore(Boolean(meta.has_more));
      setNextOffset(Number(meta.next_offset ?? offset + incoming.length));
      setTotalSpecialists(Number(meta.total ?? incoming.length));

      if (meta.filter_options?.languages) {
        setLanguageOptions(meta.filter_options.languages);
      } else if (reset) {
        const fallbackLanguages: string[] = Array.from(
          new Set<string>(
            incoming
              .flatMap((item) => item.languages ?? [])
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "uk"));
        setLanguageOptions(
          fallbackLanguages
        );
      }

      if (meta.filter_options?.cities) {
        setCityOptions(meta.filter_options.cities);
      } else if (reset) {
        setCityOptions(
          Array.from(
            new Set(
              incoming
                .map((item) => item.city?.trim())
                .filter((value): value is string => Boolean(value))
            )
          ).sort((a, b) => a.localeCompare(b, "uk"))
        );
      }
    } catch (error) {
      console.error("Failed to load specialists", error);
      if (reset) setSpecialists([]);
      setHasMore(false);
      setLoadError(t(dict, "common.tryLater"));
    } finally {
      setLoadingSpecialists(false);
    }
  };

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const parentCategoriesRes = await fetch(
          "/api/specialists/categories?mode=parents&include_children=1",
          { cache: "no-store" }
        );
        const parentCategoriesJson = await parentCategoriesRes.json();
        const parentCategories = Array.isArray(parentCategoriesJson?.data)
          ? parentCategoriesJson.data
          : [];
        const parentData = parentCategories.find(
          (c: any) => c && typeof c.slug === "string" && c.slug === slug
        );

        if (parentData) {
          const normalizedParent: ParentCategory = {
            id: String(parentData.id),
            slug: String(parentData.slug),
            title: parentData.title ? String(parentData.title) : null,
            title_ru: parentData.title_ru != null ? String(parentData.title_ru) : null,
            title_de: parentData.title_de != null ? String(parentData.title_de) : null,
            title_ua: parentData.title_ua != null ? String(parentData.title_ua) : null,
            specialists_count: Number(parentData.specialists_count || 0),
            is_clickable: Boolean(parentData.is_clickable),
            children: (Array.isArray(parentData.children) ? parentData.children : [])
              .filter(
                (child: any) =>
                  child &&
                  typeof child.id === "string" &&
                  typeof child.slug === "string"
              )
              .map((child: any) => ({
                id: String(child.id),
                slug: String(child.slug),
                title: child.title ? String(child.title) : null,
                title_ru: child.title_ru != null ? String(child.title_ru) : null,
                title_de: child.title_de != null ? String(child.title_de) : null,
                title_ua: child.title_ua != null ? String(child.title_ua) : null,
                specialists_count: Number(child.specialists_count || 0),
                is_clickable: Boolean(child.is_clickable),
              })),
          };

          setParentCategory(normalizedParent);
          setCategory(null);
          setSpecialists([]);
          setLanguageOptions([]);
          setCityOptions([]);
          setHasMore(false);
          setNextOffset(0);
          setTotalSpecialists(0);
          setLoading(false);
          return;
        }

        const categoriesRes = await fetch("/api/specialists/categories", {
          cache: "no-store",
        });
        const categoriesJson = await categoriesRes.json();
        const categories = Array.isArray(categoriesJson?.data)
          ? categoriesJson.data
          : [];
        const catData = categories.find(
          (c: any) => c && typeof c.slug === "string" && c.slug === slug
        );

        if (!catData) {
          setLoading(false);
          return;
        }

        const normalizedCategory: Category = {
          id: String(catData.id),
          slug: String(catData.slug),
          title: catData.title ? String(catData.title) : null,
          title_ru: catData.title_ru != null ? String(catData.title_ru) : null,
          title_de: catData.title_de != null ? String(catData.title_de) : null,
          title_ua: catData.title_ua != null ? String(catData.title_ua) : null,
          specialists_count: Number(catData.specialists_count || 0),
          is_clickable: Boolean(catData.is_clickable),
        };

        setCategory(normalizedCategory);
        setParentCategory(null);
        setSelectedLanguage("");
        setSelectedCity("");
        setSort("best_match");
        setSpecialists([]);
        setLanguageOptions([]);
        setCityOptions([]);
        setHasMore(false);
        setNextOffset(0);
        setTotalSpecialists(0);

      } catch (err) {
        console.error("Error fetching category data:", err);
        setSpecialists([]);
        setCategory(null);
        setParentCategory(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, lang]);

  useEffect(() => {
    if (!category?.id || parentCategory) return;
    loadSpecialists(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.id, selectedLanguage, selectedCity, sort, parentCategory]);

  const foundText = useMemo(() => {
    const visibleCount = totalSpecialists;
    const template = (t as any)(dict, "category.found", {
      count: visibleCount,
    }) as string;
    return String(template).replace(/\{\{\s*count\s*\}\}/g, String(visibleCount));
  }, [dict, totalSpecialists, category]);

  const categoryLabel = category ? getCategoryTitle(category, normalizeLang(lang)) : "";

  const uspHeading = useMemo(() => {
    if (!categoryLabel) return "";
    if (lang === "ru") return `${categoryLabel} в Германии на вашем языке`;
    if (lang === "de") return `${categoryLabel} in Deutschland – in Ihrer Sprache`;
    return `${categoryLabel} в Німеччині вашою мовою`;
  }, [categoryLabel, lang]);

  const uspSubtext = useMemo(() => {
    if (lang === "ru") return "Выберите специалиста и отправьте заявку напрямую.";
    if (lang === "de") return "Wählen Sie einen Spezialisten und senden Sie direkt eine Anfrage.";
    return "Оберіть фахівця та надішліть заявку напряму.";
  }, [lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t(dict, "category.loading")}</p>
        </div>
      </div>
    );
  }

  if (!category) {
    if (parentCategory) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12">
              <Link href={langPrefix} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
                {t(dict, "common.backToHome")}
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                {getCategoryTitle(parentCategory, normalizeLang(lang))}
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                {t(dict, "category.parent.subtitle")}
              </p>
            </div>

            {parentCategory.children.length === 0 ? (
              <div className="bg-white rounded-md shadow-lg p-12 text-center max-w-2xl mx-auto">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {t(dict, "category.parent.empty.title")}
                </h2>
                <p className="text-gray-600 mb-6">
                  {t(dict, "category.parent.empty.subtitle")}
                </p>
                <Link
                  href={langPrefix}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                >
                  {t(dict, "common.toHome")}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {parentCategory.children.map((child) => (
                  <div
                    key={child.id}
                    className={`bg-white rounded-md border border-gray-100 shadow-sm p-6 ${
                      child.is_clickable ? "hover:shadow-md transition" : "opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {getCategoryTitle(child, normalizeLang(lang))}
                      </h3>
                      {!child.is_clickable ? (
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                          {t(dict, "common.soon")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {t(dict, "category.parent.found").replace(
                        /\{\{\s*count\s*\}\}/g,
                        String(child.specialists_count)
                      )}
                    </p>
                    {child.is_clickable ? (
                      <Link
                        href={`/${lang}/category/${child.slug}`}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {t(dict, "common.more")}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center text-textSecondary font-medium">
                        {t(dict, "category.comingSoon.title")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t(dict, "category.notFound")}</h1>
          <Link
            href={langPrefix}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
          >
            {t(dict, "common.toHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <Link href={langPrefix} className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-block">
            {t(dict, "common.backToHome")}
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            {uspHeading}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{uspSubtext}</p>
          <p className="text-lg text-gray-600 mt-2">{foundText}</p>
        </div>

        <div className="space-y-6">
            <div className="sticky top-0 z-20 rounded-md border border-gray-100 bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-4 items-end md:mx-auto md:flex md:max-w-4xl md:flex-wrap md:items-end md:justify-center md:gap-3">
                <label className="text-sm md:flex-none">
                  <span className="mb-2 block text-xs font-medium text-gray-600 md:sr-only">
                    {t(dict, "filters.language.label")}
                  </span>
                  <div className="relative md:w-56">
                    <select
                      value={selectedLanguage}
                      onChange={(event) => setSelectedLanguage(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t(dict, "filters.language.all")}</option>
                      {languageOptions.map((value) => (
                        <option key={value} value={value.toLowerCase()}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    >
                      <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </label>

                <label className="text-sm md:flex-none">
                  <span className="mb-2 block text-xs font-medium text-gray-600 md:sr-only">
                    {t(dict, "filters.city.label")}
                  </span>
                  <div className="relative md:w-56">
                    <select
                      value={selectedCity}
                      onChange={(event) => setSelectedCity(event.target.value)}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t(dict, "filters.city.all")}</option>
                      {cityOptions.map((value) => (
                        <option key={value} value={value.toLowerCase()}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    >
                      <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </label>

                <label className="text-sm md:flex-none">
                  <span className="mb-2 block text-xs font-medium text-gray-600 md:sr-only">
                    {t(dict, "filters.sort.label")}
                  </span>
                  <div className="relative md:w-56">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortKey)}
                      className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="best_match">{t(dict, "filters.sort.best_match")}</option>
                      <option value="newest">{t(dict, "filters.sort.newest")}</option>
                      <option value="rating">{t(dict, "filters.sort.rating")}</option>
                      <option value="price_low">{t(dict, "filters.sort.price_low")}</option>
                      <option value="price_high">{t(dict, "filters.sort.price_high")}</option>
                    </select>
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                    >
                      <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </label>
              </div>
            </div>

            {loadError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            ) : null}

            {specialists.length === 0 && loadingSpecialists ? (
              <div className="py-10 text-center text-gray-500">
                {t(dict, "category.loadingSpecialists", { defaultValue: "Loading specialists..." })}
              </div>
            ) : null}

            <div className="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-6">
              {specialists.map((specialist) => (
                <SpecialistPreviewCard
                  key={specialist.id}
                  specialist={specialist}
                  lang={lang}
                  dict={dict}
                  categoryLabel={categoryLabel}
                />
              ))}
            </div>

            {!loadingSpecialists && specialists.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-white px-6 py-10 text-center text-gray-600">
                {t(dict, "category.empty.subtitle")}
              </div>
            ) : null}

            {hasMore ? (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => loadSpecialists(false)}
                  disabled={loadingSpecialists}
                  className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingSpecialists
                    ? t(dict, "category.loadingMore", { defaultValue: "Loading..." })
                    : t(dict, "category.loadMore", { defaultValue: "Show more" })}
                </button>
              </div>
            ) : null}
          </div>
      </div>
    </div>
  );
}

