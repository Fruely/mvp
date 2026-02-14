"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

const PLACEHOLDER_CATEGORIES = [
  { id: "psychologists", icon: "🧠" },
  { id: "masseurs", icon: "💆" },
  { id: "tutors", icon: "📚" },
];

export default function HomeClient({ lang, dict }: { lang: Lang; dict: Dictionary }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const categoryHierarchyMode =
    process.env.NEXT_PUBLIC_CATEGORY_HIERARCHY_MODE === "parents"
      ? "parents"
      : "children";

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
      }
    }

    async function loadCategories() {
      try {
        if (categoryHierarchyMode === "parents") {
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

    loadBlocks();
    loadCategories();

    // Быстрая реакция на публикацию из админки
    const handler = () => loadBlocks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [categoryHierarchyMode]);

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

  const placeholderIconByCategoryId = useMemo(
    () =>
      new Map(
        PLACEHOLDER_CATEGORIES.map((category) => [category.id, category.icon] as const)
      ),
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <>
      <HeroSearch
        lang={lang}
        title={t(dict, "hero.title")}
        subtitle={t(dict, "hero.subtitle")}
        heroImageUrl={heroContent.url}
      />

      <section className="bg-[#F8FAFD] py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-2xl md:text-3xl font-medium text-gray-900 leading-snug">
            {t(dict, "transitional.line1")}
          </p>

          <p className="mt-6 text-lg md:text-xl text-gray-500 leading-relaxed">
            {t(dict, "transitional.line2")}<br />
            {t(dict, "transitional.line3")}
          </p>

          <p className="mt-10 text-xl md:text-2xl text-gray-900 font-semibold">
            {t(dict, "transitional.final")}
          </p>
        </div>
      </section>

      {true && (
        <section className="py-24 overflow-x-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative min-h-[520px] overflow-hidden rounded-3xl bg-white">

              {textImageContent?.url && (
                <>
                  {/* Layer 1: Background image (z-0) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={textImageContent.url}
                    alt={textImageContent.title || ""}
                    className="absolute inset-0 w-full h-full object-cover object-right rounded-3xl z-0"
                  />
                  {/* Layer 2: Gradient overlay (z-1) */}
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent pointer-events-none z-[1]"
                    aria-hidden
                  />
                </>
              )}

              {/* Layer 3: Floating card (z-10) */}
              <div className="absolute left-6 top-6 w-[calc(80%-1.6rem)] md:left-8 md:top-8 md:w-auto max-w-[22.4rem] bg-white rounded-2xl shadow-2xl p-[1.6rem] z-10">

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
        </section>
      )}

      {/* Mosaic Section (dynamic) */}
      <section id="categories" className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t(dict, "home.categories.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t(dict, "home.categories.subtitle")}
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-12">
              {categories.map((category, idx) => {
                const categoryTitle = category.title || t(dict, `categories.${category.slug}`, {
                  defaultValue: t(dict, "categories.default"),
                });
                const categoryCountLabel = t(dict, "category.parent.found", {
                  defaultValue: "{{count}} специалистов",
                }).replace(/\{\{\s*count\s*\}\}/g, String(category.specialists_count));
                const slugKey = typeof category.slug === "string" ? category.slug.trim().toLowerCase() : "";
                const idKey = typeof category.id === "string" ? category.id.trim().toLowerCase() : "";
                const imageByChildren =
                  category.children?.find((child) => {
                    const childSlugKey = child.slug.trim().toLowerCase();
                    const childIdKey = child.id.trim().toLowerCase();
                    return (
                      mosaicImageByCategory.has(childSlugKey) ||
                      mosaicImageByCategory.has(childIdKey)
                    );
                  }) ?? null;
                const categoryImage =
                  mosaicImageByCategory.get(slugKey) ||
                  mosaicImageByCategory.get(idKey) ||
                  (imageByChildren
                    ? mosaicImageByCategory.get(imageByChildren.slug.trim().toLowerCase()) ||
                      mosaicImageByCategory.get(imageByChildren.id.trim().toLowerCase())
                    : undefined) ||
                  mosaicImages[idx % Math.max(mosaicImages.length, 1)];
                const icon = placeholderIconByCategoryId.get(category.slug) || "📁";
                const clickable = category.is_clickable;

                const card = (
                  <div className="group relative w-full max-w-[200px] md:max-w-[220px] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white">
                    <div
                      className={`relative w-full h-[180px] sm:h-[200px] md:h-[220px] ${clickable ? "" : "opacity-70"}`}
                    >
                      {categoryImage?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={categoryImage.url}
                          alt={categoryImage.alt || categoryTitle}
                          className="mosaic-card-img absolute inset-0 object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="16"%3EImage%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-4xl">
                          {icon}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none">
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                          <span className="block text-white text-sm font-semibold drop-shadow-lg line-clamp-1">
                            {categoryTitle}
                          </span>
                          <span className="block text-white/90 text-[11px] drop-shadow line-clamp-1">
                            {categoryCountLabel}
                          </span>
                        </div>
                      </div>
                      {!clickable && (
                        <div className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-700">
                          {t(dict, "common.soon", { defaultValue: "Soon" })}
                        </div>
                      )}
                    </div>
                    <style jsx>{`
                      .group:hover :global(.mosaic-card-img) {
                        transform: scale(1.02);
                      }
                    `}</style>
                  </div>
                );

                if (!clickable) {
                  return (
                    <div
                      key={`${category.id}-${idx}`}
                      className="block w-full mx-auto cursor-not-allowed"
                      aria-disabled="true"
                    >
                      {card}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${category.id}-${idx}`}
                    href={`/${lang}/category/${category.slug}`}
                    className="block w-full mx-auto"
                  >
                    {card}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {PLACEHOLDER_CATEGORIES.map((category) => (
                <div key={category.id} className="relative">
                  <div className="group bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center cursor-not-allowed border border-gray-100 opacity-80">
                    <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center text-4xl shadow-md group-hover:shadow-lg transition">
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition">
                      {t(dict, `categories.${category.id}`, {
                        defaultValue: t(dict, "categories.default"),
                      })}
                    </h3>
                  </div>
                  <span className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-700">
                    {t(dict, "common.soon", { defaultValue: "Soon" })}
                  </span>
                </div>
              ))}
            </div>
          )}
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

