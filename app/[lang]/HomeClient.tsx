"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type MosaicImage = { url: string; alt?: string; category_id?: string };

type ImageBlockContent = {
  url?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
};

type MosaicBlockContent = {
  title?: string;
  subtitle?: string;
  images?: MosaicImage[];
};

type TextImageBlockContent = {
  title?: string;
  text?: string;
  url?: string;
};

type Block = {
  key: string;
  type: "image" | "mosaic";
  content: ImageBlockContent | MosaicBlockContent | TextImageBlockContent;
};

type CategoryStat = {
  id: string;
  slug: string;
  title: string | null;
  parent_id?: string | null;
  specialists_count: number;
  is_clickable: boolean;
  children?: Array<{
    id: string;
    slug: string;
    title: string | null;
    specialists_count: number;
    is_clickable: boolean;
  }>;
};

type PopularCategory = {
  id: string;
  slug: string;
  title: string | null;
  image_url?: string | null;
  specialists_count: number;
  sort_order?: number | null;
};

type RecommendedSpecialist = {
  id: string;
  slug: string | null;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  languages: string[];
  category_title: string | null;
  about_line?: string | null;
  rating_avg: number | null;
  reviews_count: number;
};

const CATEGORY_ICON_HINTS = [
  { id: "psychologists", icon: "🧠" },
  { id: "masseurs", icon: "💆" },
  { id: "tutors", icon: "📚" },
];

const FALLBACK_PLACEHOLDERS = [
  { id: "placeholder-1", icon: "🧩" },
  { id: "placeholder-2", icon: "✨" },
  { id: "placeholder-3", icon: "🫶" },
];

const HERO_COPY: Record<Lang, { titleLines: [string, string, string]; subtitle: string; search: string; plzLabel: string; popularLabel: string }> = {
  ru: {
    titleLines: ["Найдите специалиста", "на вашем языке", "в Германии"],
    subtitle: "Рядом с вами и онлайн. Выберите того, с кем вам удобно.",
    search: "Найти специалиста",
    plzLabel: "PLZ / почтовый индекс",
    popularLabel: "Популярные категории:",
  },
  ua: {
    titleLines: ["Знайдіть спеціаліста", "вашою мовою", "в Німеччині"],
    subtitle: "Поруч із вами та онлайн. Оберіть того, з ким вам зручно.",
    search: "Знайти спеціаліста",
    plzLabel: "PLZ / поштовий індекс",
    popularLabel: "Популярні категорії:",
  },
  de: {
    titleLines: ["Finden Sie einen Spezialisten", "in Ihrer Sprache", "in\u00a0Deutschland"],
    subtitle: "In Ihrer Nähe und online. Wählen Sie jemanden, mit dem Sie sich wohlfühlen.",
    search: "Spezialisten finden",
    plzLabel: "PLZ / Postleitzahl",
    popularLabel: "Beliebte Kategorien:",
  },
};

export default function HomeClient({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const catName = (slug: string, fallback: string | null) => {
    const key = `categories.${slug}`;
    const val = t(dict, key);
    return val === key ? (fallback || slug) : val;
  };

  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [recommendedSpecialists, setRecommendedSpecialists] = useState<RecommendedSpecialist[]>([]);
  const [isBlocksLoading, setIsBlocksLoading] = useState(true);
  const [isPopularLoading, setIsPopularLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroCategorySlug, setHeroCategorySlug] = useState("");
  const [heroCity, setHeroCity] = useState("");
  const [heroLanguage, setHeroLanguage] = useState<"ru" | "uk" | "de">("ru");
  const searchParams = useSearchParams();
  const placeFromUrl = searchParams?.get("place")?.trim() ?? "";
  const specialistLang = lang === "ua" ? "uk" : lang;

  function buildDisplayCategories(all: PopularCategory[]): PopularCategory[] {
    const MAX = 12;
    const featured = all.filter((c) => typeof c.sort_order === "number" && c.sort_order <= 3);
    const rest = all.filter((c) => typeof c.sort_order !== "number" || c.sort_order > 3);
    const restCopy = [...rest];
    for (let i = restCopy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [restCopy[i], restCopy[j]] = [restCopy[j], restCopy[i]];
    }
    return [...featured.slice(0, 4), ...restCopy.slice(0, 8)].slice(0, MAX);
  }

  useEffect(() => {
    setHeroLanguage(lang === "ua" ? "uk" : lang === "de" ? "de" : "ru");
  }, [lang]);

  useEffect(() => {
    function normalizeCategories(rawData: any[]): CategoryStat[] {
      return rawData
        .filter(
          (item: any) =>
            item &&
            typeof item.id === "string" &&
            typeof item.slug === "string" &&
            item.slug.trim().length > 0
        )
        .map((item: any) => ({
          id: String(item.id),
          slug: String(item.slug),
          title: item.title ? String(item.title) : null,
          parent_id:
            typeof item.parent_id === "string" ? item.parent_id : null,
          specialists_count: Number(item.specialists_count || 0),
          is_clickable: Boolean(item.is_clickable),
          children: Array.isArray(item.children)
            ? item.children
                .filter(
                  (child: any) =>
                    child &&
                    typeof child.id === "string" &&
                    typeof child.slug === "string" &&
                    child.slug.trim().length > 0
                )
                .map((child: any) => ({
                  id: String(child.id),
                  slug: String(child.slug),
                  title: child.title ? String(child.title) : null,
                  specialists_count: Number(child.specialists_count || 0),
                  is_clickable: Boolean(child.is_clickable),
                }))
            : undefined,
        }));
    }

    async function loadBlocks() {
      try {
        const res = await fetch(`/api/site-blocks?ts=${Date.now()}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Ошибка загрузки блоков");
        setBlocks(json.blocks || []);
      } catch (e: any) {
        setError(e.message || "Ошибка загрузки блоков");
      } finally {
        setIsBlocksLoading(false);
      }
    }

    async function loadCategories() {
      try {
        const parentRes = await fetch(
          "/api/specialists/categories?mode=parents&include_children=1",
          { cache: "no-store" }
        );
        const parentJson = await parentRes.json();
        if (!parentRes.ok) {
          throw new Error(parentJson.error || "Ошибка загрузки parent-категорий");
        }
        const parentData = normalizeCategories(
          Array.isArray(parentJson.data) ? parentJson.data : []
        );

        if (parentData.length > 0) {
          setCategories(parentData);
          return;
        }

        const childRes = await fetch("/api/specialists/categories", {
          cache: "no-store",
        });
        const childJson = await childRes.json();
        if (!childRes.ok) {
          throw new Error(childJson.error || "Ошибка загрузки категорий");
        }
        setCategories(
          normalizeCategories(Array.isArray(childJson.data) ? childJson.data : [])
        );
      } catch (e: any) {
        setError((prev) => prev || e.message || "Ошибка загрузки категорий");
      }
    }

    async function loadPopularCategories() {
      try {
        const res = await fetch("/api/homepage/popular-categories", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !Array.isArray(json?.data)) {
          setPopularCategories([]);
          return;
        }
        const normalized = json.data
          .filter(
            (item: { id?: unknown }) => item && typeof item.id === "string"
          )
          .map((item: { id: string; slug?: string | null; title?: string | null; image_url?: string | null; specialists_count?: number | null; sort_order?: number | null }) => ({
            id: item.id,
            slug: typeof item.slug === "string" && item.slug.trim() ? item.slug : item.id,
            title: typeof item.title === "string" ? item.title : null,
            image_url: typeof item.image_url === "string" ? item.image_url : null,
            specialists_count: typeof item.specialists_count === "number" ? item.specialists_count : 0,
            sort_order: item.sort_order ?? null,
          }));
        setPopularCategories(normalized);
      } catch {
        // Silently skip popular block on RPC/network issues.
        setPopularCategories([]);
      } finally {
        setIsPopularLoading(false);
      }
    }

    async function loadRecommendedSpecialists() {
      try {
        const res = await fetch("/api/recommended-specialists", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !Array.isArray(json?.data)) {
          setRecommendedSpecialists([]);
          return;
        }
        const normalized = json.data
          .filter((item: any) => item && typeof item.id === "string")
          .map((item: any) => ({
            id: String(item.id),
            slug: typeof item.slug === "string" ? item.slug : null,
            name: typeof item.name === "string" ? item.name : null,
            avatar_url: typeof item.avatar_url === "string" ? item.avatar_url : null,
            city: typeof item.city === "string" ? item.city : null,
            languages: Array.isArray(item.languages)
              ? item.languages.filter((lang: unknown): lang is string => typeof lang === "string" && lang.trim().length > 0)
              : [],
            category_title: typeof item.category_title === "string" ? item.category_title : null,
            about_line: typeof item.about_line === "string" ? item.about_line : null,
            rating_avg: typeof item.rating_avg === "number" ? item.rating_avg : null,
            reviews_count: typeof item.reviews_count === "number" ? item.reviews_count : 0,
          }));
        setRecommendedSpecialists(normalized);
      } catch {
        setRecommendedSpecialists([]);
      } finally {
        setIsRecommendedLoading(false);
      }
    }

    loadBlocks();
    loadCategories();
    loadPopularCategories();
    loadRecommendedSpecialists();

    // Быстрая реакция на публикацию из админки
    const handler = () => loadBlocks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const textImage = useMemo(
    () => blocks.find((b) => b.key === "homepage_text_image"),
    [blocks]
  );

  const textImageContent = (textImage?.content as TextImageBlockContent) || {};

  const renderRecommendedSpecialists = (data: RecommendedSpecialist[] | null | undefined) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="mt-10">
        <div className="mb-4 md:mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-textPrimary">{t(dict, "home.recommended.title")}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((specialist) => (
            <Link
              key={specialist.id}
              href={`/${lang}/specialist/${encodeURIComponent(specialist.id)}`}
              className="rounded-xl border bg-white shadow-card overflow-hidden flex h-full flex-col hover:shadow-soft transition"
            >
              <div className="aspect-square w-full overflow-hidden bg-gray-100">
                {specialist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={specialist.avatar_url}
                    alt={specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-100" />
                )}
              </div>
              <div className="p-4 flex flex-col gap-1">
                <p className="font-semibold line-clamp-1 text-textPrimary">
                  {specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  <span className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, idx) => (
                      <span key={idx} style={{ color: idx < Math.round(specialist.rating_avg ?? 0) ? "#f5b301" : "#d1d5db" }}>★</span>
                    ))}
                  </span>
                  {specialist.reviews_count > 0 ? (
                    <>
                      <span className="font-medium text-textPrimary">{specialist.rating_avg?.toFixed(1)}</span>
                      <span className="text-textSecondary">({specialist.reviews_count})</span>
                    </>
                  ) : (
                    <span className="text-textSecondary">{t(dict, "home.recommended.newSpecialist")}</span>
                  )}
                </div>
                <p className="text-sm font-normal text-textSecondary line-clamp-1">
                  {specialist.category_title || t(dict, "home.recommended.defaultCategory")}
                </p>
                <p className="text-sm font-normal text-textSecondary line-clamp-1">
                  {[specialist.city, specialist.languages[0]].filter(Boolean).join(" • ")}
                </p>
                {specialist.about_line ? (
                  <p className="mt-1 text-sm font-normal text-textSecondary line-clamp-2">
                    {specialist.about_line}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const placeholderIconByCategoryId = useMemo(
    () =>
      new Map(
        CATEGORY_ICON_HINTS.map((category) => [category.id, category.icon] as const)
      ),
    []
  );

  const heroCategoryOptions = useMemo(() => {
    const options: Array<{ slug: string; title: string }> = [];
    const seen = new Set<string>();

    for (const category of categories) {
      if (Array.isArray(category.children) && category.children.length > 0) {
        for (const child of category.children) {
          const slug = child.slug?.trim();
          const title = child.title?.trim();
          if (!slug || !title || seen.has(slug)) continue;
          seen.add(slug);
          options.push({ slug, title });
        }
        continue;
      }

      const slug = category.slug?.trim();
      const title = category.title?.trim();
      if (!slug || !title || seen.has(slug)) continue;
      seen.add(slug);
      options.push({ slug, title });
    }

    return options.sort((a, b) => a.title.localeCompare(b.title, "uk"));
  }, [categories]);

  const copy = HERO_COPY[lang] ?? HERO_COPY.ru;

  function handleHeroSearch() {
    const locale = heroLanguage === "uk" ? "ua" : heroLanguage;
    const trimmedCity = heroCity.trim();

    if (trimmedCity) {
      const params = new URLSearchParams({
        lang: heroLanguage,
        place: trimmedCity,
      });
      if (heroCategorySlug) params.set("category", heroCategorySlug);
      router.push(`/specialists?${params.toString()}`);
      return;
    }

    if (heroCategorySlug) {
      router.push(`/${locale}/category/${heroCategorySlug}?lang=${heroLanguage}`);
      return;
    }

    router.push(`/${locale}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <>
      <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight text-textPrimary">
            <span className="block">{copy.titleLines[0]}</span>
            <span className="block">{copy.titleLines[1]}</span>
            <span className="block">{copy.titleLines[2]}</span>
          </h1>
          <p className="text-lg font-normal text-textSecondary mt-4 max-w-2xl mx-auto">
            {copy.subtitle}
          </p>

          <div className="mt-8 bg-white shadow-soft rounded-xl p-3 flex flex-col sm:flex-row gap-3">
            <select
              value={heroCategorySlug}
              onChange={(e) => setHeroCategorySlug(e.target.value)}
              className="h-14 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 sm:flex-1"
              aria-label={t(dict, "categories.default", { defaultValue: "Категория" })}
            >
              <option value="">{t(dict, "categories.default", { defaultValue: "Категория" })}</option>
              {heroCategoryOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {catName(option.slug, option.title)}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={heroCity}
              onChange={(e) => setHeroCity(e.target.value)}
              placeholder={copy.plzLabel}
              className="h-14 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 placeholder:text-gray-500 sm:flex-1"
              aria-label={copy.plzLabel}
            />

            <select
              value={heroLanguage}
              onChange={(e) => setHeroLanguage((e.target.value as "ru" | "uk" | "de") || "ru")}
              className="h-14 rounded-lg border border-gray-200 px-4 text-sm text-gray-700 sm:w-48"
              aria-label={t(dict, "filters.language.label", { defaultValue: "Язык" })}
            >
              <option value="ru">{t(dict, "home.heroLang.ru", { defaultValue: "Русский" })}</option>
              <option value="uk">{t(dict, "home.heroLang.uk", { defaultValue: "Українська" })}</option>
              <option value="de">Deutsch</option>
            </select>

            <button
              type="button"
              onClick={handleHeroSearch}
              className="h-14 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-soft"
            >
              {copy.search}
            </button>
          </div>

          <div className="mt-4 text-sm font-normal text-textSecondary flex flex-wrap justify-center gap-3">
            <span>{copy.popularLabel}</span>
            <span>{t(dict, "home.hero.popularTags")}</span>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="max-w-3xl mx-auto text-2xl md:text-3xl font-medium text-gray-900 leading-snug">
            {t(dict, "transitional.line1")}
          </p>

          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl font-normal text-textSecondary leading-relaxed">
            {t(dict, "transitional.line2")}<br />
            {t(dict, "transitional.line3")}
          </p>

          <p className="mt-8 max-w-4xl mx-auto text-xl md:text-2xl text-gray-900 font-semibold">
            {t(dict, "transitional.final")}
          </p>
        </div>
      </section>

      <section className="pt-14 pb-10 md:pt-16 md:pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#EEF1FF] px-6 py-8 md:px-12 md:py-10">
            {true && (
              <div className="mt-7 md:mt-8 overflow-x-hidden">
                <div className="relative min-h-[520px] overflow-hidden rounded-2xl">
                  {textImageContent?.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={textImageContent.url}
                        alt={textImageContent.title || ""}
                        className="absolute inset-0 w-full h-full object-cover object-right rounded-2xl z-0"
                      />
                    </>
                  ) : null}

                  <div className="absolute left-6 top-6 w-[calc(80%-1.6rem)] md:left-8 md:top-8 md:w-auto max-w-[22.4rem] bg-white/90 rounded-2xl shadow-sm p-[1.6rem] backdrop-blur-sm z-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                      {t(dict, "home.howItWorks.title")}
                    </h2>

                    <div className="space-y-6 text-gray-700">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                          1
                        </div>
                        <p>{t(dict, "home.howItWorks.step1")}</p>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                          2
                        </div>
                        <p>{t(dict, "home.howItWorks.step2")}</p>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                          3
                        </div>
                        <p>{t(dict, "home.howItWorks.step3")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isPopularLoading ? (
              <div className="mt-8 md:mt-10" aria-hidden>
                <div className="mb-6 h-8 w-64 rounded-lg bg-gray-200/80 animate-pulse" />
                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={`popular-skeleton-${idx}`}
                      className="rounded-2xl bg-white shadow-card overflow-hidden"
                    >
                      <div className="w-full aspect-square bg-gray-200/80 animate-pulse" />
                      <div className="px-4 py-3 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-gray-200/80 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-gray-200/80 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : popularCategories.length > 0 ? (
              <div className="mt-8 md:mt-10">
                <div className="mb-4 md:mb-6 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {t(dict, "home.popularServices.title")}
                  </h2>
                </div>

                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-4">
                  {buildDisplayCategories(popularCategories).map((category) => {
                    const href = placeFromUrl
                      ? `/specialists?lang=${encodeURIComponent(specialistLang)}&place=${encodeURIComponent(placeFromUrl)}&category=${encodeURIComponent(category.slug)}`
                      : `/${lang}/category/${category.slug}`;
                    const imageUrl = category.image_url ?? null;

                    return (
                      <Link
                        key={category.slug}
                        href={href}
                        className="rounded-2xl bg-white shadow-card transition hover:shadow-soft overflow-hidden flex flex-col"
                      >
                        <div className="w-full aspect-square overflow-hidden">
                          {imageUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageUrl}
                                alt={catName(category.slug, category.title)}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gray-100" aria-hidden />
                          )}
                        </div>

                        <div className="px-4 py-3">
                          <p className="text-base font-semibold text-textPrimary line-clamp-1">
                            {catName(category.slug, category.title)}
                          </p>
                          <p className="mt-1 text-sm font-normal text-textSecondary">
                            {t(dict, "category.parent.found").replace(
                              /\{\{\s*count\s*\}\}/g,
                              String(category.specialists_count)
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isRecommendedLoading ? (
              <div className="mt-10">
                <div className="mb-4 h-8 w-80 rounded-lg bg-gray-200/80 animate-pulse" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`recommended-skeleton-${idx}`}
                      className="rounded-xl border bg-white aspect-[4/3] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-gray-200/80 animate-pulse shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="h-4 w-2/3 rounded bg-gray-200/80 animate-pulse" />
                          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200/80 animate-pulse" />
                          <div className="mt-2 h-3 w-3/4 rounded bg-gray-200/80 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              renderRecommendedSpecialists(recommendedSpecialists)
            )}
          </div>
        </div>
      </section>

      </>

      {/* CTA for specialists */}
      <section className="bg-gray-50 px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t(dict, "home.cta.title")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">
          {t(dict, "home.cta.subtitle")}
        </p>
        <Link
          href="/for-specialists"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {t(dict, "home.cta.button")}
        </Link>
        <p className="mt-3 text-xs text-gray-500">{t(dict, "home.cta.socialProof")}</p>
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}

