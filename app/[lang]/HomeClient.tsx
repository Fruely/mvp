"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import HeroSearch from "@/components/HeroSearch";

type ImageBlockContent = {
  url?: string;
  title?: string;
  subtitle?: string;
  alt?: string;
};

type MosaicImage = { url: string; alt?: string; category_id?: string };

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

export default function HomeClient({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const featuredHomeBlockEnabled =
    process.env.NEXT_PUBLIC_FEATURED_HOME_BLOCK_ENABLED === "1" ||
    process.env.NEXT_PUBLIC_FEATURED_HOME_BLOCK_ENABLED === "true";
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [recommendedSpecialists, setRecommendedSpecialists] = useState<RecommendedSpecialist[]>([]);
  const [isBlocksLoading, setIsBlocksLoading] = useState(true);
  const [isPopularLoading, setIsPopularLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const placeFromUrl = searchParams?.get("place")?.trim() ?? "";
  const specialistLang = lang === "ua" ? "uk" : lang;

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
        const res = await fetch("/api/site-blocks", { cache: "no-store" });
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
            (item: { slug?: unknown; title?: unknown; image_url?: unknown; specialists_count?: unknown; sort_order?: unknown }) =>
              item &&
              typeof item.slug === "string" &&
              item.slug.trim().length > 0 &&
              (typeof item.title === "string" || item.title == null) &&
              typeof item.specialists_count === "number"
          )
          .map((item: { slug: string; title: string | null; image_url?: string | null; specialists_count: number; sort_order?: number | null }) => ({
            slug: item.slug,
            title: item.title,
            image_url: typeof item.image_url === "string" ? item.image_url : null,
            specialists_count: item.specialists_count,
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
    if (featuredHomeBlockEnabled) {
      loadRecommendedSpecialists();
    } else {
      setIsRecommendedLoading(false);
    }

    // Быстрая реакция на публикацию из админки
    const handler = () => loadBlocks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [featuredHomeBlockEnabled]);

  const hero = useMemo(() => blocks.find((b) => b.key === "homepage_hero"), [blocks]);
  const mosaic = useMemo(() => blocks.find((b) => b.key === "homepage_mosaic"), [blocks]);
  const textImage = useMemo(
    () => blocks.find((b) => b.key === "homepage_text_image"),
    [blocks]
  );

  const heroContent = (hero?.content as ImageBlockContent) || {};
  const mosaicContent = (mosaic?.content as MosaicBlockContent) || {};
  const textImageContent = (textImage?.content as TextImageBlockContent) || {};
  const mosaicImages = useMemo(
    () =>
      (Array.isArray(mosaicContent.images) ? mosaicContent.images : []).filter(
        (item): item is MosaicImage => Boolean(item && typeof item.url === "string" && item.url)
      ),
    [mosaicContent.images]
  );

  const mosaicImageByCategory = useMemo(() => {
    const map = new Map<string, MosaicImage>();
    for (const img of mosaicImages) {
      const raw = typeof img.category_id === "string" ? img.category_id.trim().toLowerCase() : "";
      if (!raw || map.has(raw)) continue;
      map.set(raw, img);
    }
    return map;
  }, [mosaicImages]);

  const renderRecommendedSpecialists = () => {
    if (!recommendedSpecialists || recommendedSpecialists.length === 0) return null;

    return (
      <div className="mt-10">
        <div className="mb-4 md:mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Рекомендованные специалисты</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedSpecialists.map((specialist) => (
            <Link
              key={specialist.id}
              href={`/${lang}/specialist/${encodeURIComponent(specialist.slug || specialist.id)}`}
              className="rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 h-14 w-14 overflow-hidden rounded-full bg-gray-100">
                {specialist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={specialist.avatar_url} alt={specialist.name || "specialist"} className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <p className="line-clamp-1 text-base font-semibold text-gray-900">{specialist.name || "Специалист"}</p>
              <p className="mt-1 text-sm text-gray-600 line-clamp-1">{specialist.category_title || "Услуги"}</p>
              <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                {[specialist.city, specialist.languages[0]].filter(Boolean).join(" • ")}
              </p>
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

  return (
    <div className="min-h-screen flex flex-col">
      <>
      <HeroSearch
        lang={lang}
        title={t(dict, "hero.title")}
        subtitle={t(dict, "hero.subtitle")}
        primaryCta={t(dict, "hero.primaryCta")}
        heroImageUrl={heroContent.url}
        isHeroLoading={isBlocksLoading}
      />

      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="max-w-3xl mx-auto text-2xl md:text-3xl font-medium text-gray-900 leading-snug">
            {t(dict, "transitional.line1")}
          </p>

          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-gray-500 leading-relaxed">
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
                      {textImageContent?.title || t(dict, "home.howItWorks.title")}
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
                      className="rounded-2xl bg-white shadow-sm overflow-hidden"
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
                    {t(dict, "home.popularServices.title", { defaultValue: "Популярные услуги" })}
                  </h2>
                </div>

                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-4">
                  {popularCategories.map((category) => {
                    const href = placeFromUrl
                      ? `/specialists?lang=${encodeURIComponent(specialistLang)}&place=${encodeURIComponent(placeFromUrl)}&category=${encodeURIComponent(category.slug)}`
                      : `/${lang}/category/${category.slug}`;

                    return (
                      <Link
                        key={category.slug}
                        href={href}
                        className="rounded-2xl bg-white shadow-sm transition hover:shadow-md overflow-hidden flex flex-col"
                      >
                        <div className="w-full aspect-square overflow-hidden">
                          {category.image_url ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={category.image_url}
                                alt={category.title ?? category.slug}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </>
                          ) : (
                            <div className="w-full h-full bg-gray-100" aria-hidden />
                          )}
                        </div>

                        <div className="px-4 py-3">
                          <p className="text-base font-semibold text-gray-900 line-clamp-1">
                            {category.title || category.slug}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
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
                    <div key={`recommended-skeleton-${idx}`} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="mb-3 h-14 w-14 rounded-full bg-gray-200/80 animate-pulse" />
                      <div className="h-4 w-2/3 rounded bg-gray-200/80 animate-pulse" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-gray-200/80 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              renderRecommendedSpecialists()
            )}
          </div>
        </div>
      </section>

      </>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}

