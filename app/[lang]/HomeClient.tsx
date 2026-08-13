"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import ServiceSearchFlow, {
  SERVICE_SEARCH_FLOW_TEXT,
} from "@/components/search-flow/ServiceSearchFlow";
import VariantCCategoryIcon from "@/components/home/variantC/VariantCCategoryIcon";
import VariantCSpecialistCard from "@/components/home/variantC/VariantCSpecialistCard";
import VariantCHowItWorksSteps from "@/components/home/variantC/VariantCHowItWorksSteps";
import {
  publicCardClass,
  publicPageContainerClass,
} from "@/components/public/publicStyles";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";

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
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id?: string | null;
  specialists_count: number;
  is_clickable: boolean;
  children?: Array<{
    id: string;
    slug: string;
    title: string | null;
    title_ru?: string | null;
    title_de?: string | null;
    title_ua?: string | null;
    image_url?: string | null;
    specialists_count: number;
    is_clickable: boolean;
  }>;
};

type PopularCategory = {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  image_url?: string | null;
  specialists_count: number;
  sort_order?: number | null;
};

type RecommendationBadge =
  | "founder_first_50"
  | "premium_placement"
  | "new_discovery";

type RecommendationPlacementGroup =
  | "founder"
  | "premium"
  | "discovery"
  | "general";

type RecommendedSpecialist = {
  id: string;
  slug: string | null;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  languages: string[];
  category_title: string | null;
  category_title_ru: string | null;
  category_title_de: string | null;
  category_title_ua: string | null;
  about_line?: string | null;
  rating_avg: number | null;
  reviews_count: number;
  founder_badge?: boolean;
  is_featured?: boolean;
  placement_group?: RecommendationPlacementGroup;
  recommendation_row?: number;
  badges?: RecommendationBadge[];
};

const BOOSTED_CHILD_CATEGORY_SLUGS = ["it-support"] as const;

const TRUST_AVATAR_FALLBACKS = ["#1a8a7d", "#d35a3b", "#6366f1"] as const;

export default function HomeClient({ lang, dict, place }: { lang: Lang; dict: Dictionary; place?: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [recommendedSpecialists, setRecommendedSpecialists] = useState<RecommendedSpecialist[]>([]);
  const [homepageParentSlotSlugs, setHomepageParentSlotSlugs] = useState<string[]>([]);
  const [isBlocksLoading, setIsBlocksLoading] = useState(true);
  const [isPopularLoading, setIsPopularLoading] = useState(true);
  const [isRecommendedLoading, setIsRecommendedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const placeFromUrl = place?.trim() ?? "";

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
          title_ru: item.title_ru != null ? String(item.title_ru) : null,
          title_de: item.title_de != null ? String(item.title_de) : null,
          title_ua: item.title_ua != null ? String(item.title_ua) : null,
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
                  title_ru: child.title_ru != null ? String(child.title_ru) : null,
                  title_de: child.title_de != null ? String(child.title_de) : null,
                  title_ua: child.title_ua != null ? String(child.title_ua) : null,
                  image_url: typeof child.image_url === "string" ? child.image_url : null,
                  specialists_count: Number(child.specialists_count || 0),
                  is_clickable: Boolean(child.is_clickable),
                }))
            : undefined,
        }));
    }

    async function loadBlocks() {
      try {
        const res = await fetch("/api/site-blocks");
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
          "/api/specialists/categories?mode=parents&include_children=1"
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

    async function loadHomepageParentSlots() {
      try {
        const res = await fetch("/api/homepage/parent-category-slots");
        const json = await res.json();
        if (!res.ok || !Array.isArray(json?.slots)) {
          setHomepageParentSlotSlugs([]);
          return;
        }

        const slugs = json.slots
          .filter(
            (item: any) =>
              item &&
              typeof item.slot === "number" &&
              typeof item.slug === "string" &&
              item.slug.trim().length > 0
          )
          .sort((a: any, b: any) => Number(a.slot) - Number(b.slot))
          .map((item: any) => String(item.slug).trim());

        setHomepageParentSlotSlugs(slugs);
      } catch {
        setHomepageParentSlotSlugs([]);
      }
    }

    async function loadPopularCategories() {
      try {
        const res = await fetch("/api/homepage/popular-categories");
        const json = await res.json();
        if (!res.ok || !Array.isArray(json?.data)) {
          setPopularCategories([]);
          return;
        }
        const normalized = json.data
          .filter(
            (item: { id?: unknown }) => item && typeof item.id === "string"
          )
          .map((item: any) => ({
            id: item.id,
            slug: typeof item.slug === "string" && item.slug.trim() ? item.slug : item.id,
            title: typeof item.title === "string" ? item.title : null,
            title_ru: typeof item.title_ru === "string" ? item.title_ru : null,
            title_de: typeof item.title_de === "string" ? item.title_de : null,
            title_ua: typeof item.title_ua === "string" ? item.title_ua : null,
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
        const res = await fetch(`/api/recommended-specialists?lang=${encodeURIComponent(lang)}`);
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
            category_title_ru: typeof item.category_title_ru === "string" ? item.category_title_ru : null,
            category_title_de: typeof item.category_title_de === "string" ? item.category_title_de : null,
            category_title_ua: typeof item.category_title_ua === "string" ? item.category_title_ua : null,
            about_line: typeof item.about_line === "string" ? item.about_line : null,
            rating_avg: typeof item.rating_avg === "number" ? item.rating_avg : null,
            reviews_count: typeof item.reviews_count === "number" ? item.reviews_count : 0,
            founder_badge: item.founder_badge === true,
            is_featured: item.is_featured === true,
            placement_group:
              item.placement_group === "founder" ||
              item.placement_group === "premium" ||
              item.placement_group === "discovery" ||
              item.placement_group === "general"
                ? item.placement_group
                : undefined,
            recommendation_row:
              typeof item.recommendation_row === "number" ? item.recommendation_row : undefined,
            badges: Array.isArray(item.badges)
              ? item.badges.filter(
                  (badge: unknown): badge is RecommendationBadge =>
                    badge === "founder_first_50" ||
                    badge === "premium_placement" ||
                    badge === "new_discovery"
                )
              : [],
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
    loadHomepageParentSlots();
    loadPopularCategories();
    loadRecommendedSpecialists();

    // Быстрая реакция на публикацию из админки
    const handler = () => loadBlocks();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [lang]);

  const textImage = useMemo(
    () => blocks.find((b) => b.key === "homepage_text_image"),
    [blocks]
  );

  const textImageContent = (textImage?.content as TextImageBlockContent) || {};

  const trustAvatars = useMemo(() => {
    return recommendedSpecialists
      .map((item) => item.avatar_url)
      .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
      .slice(0, 3);
  }, [recommendedSpecialists]);

  const storyQuote =
    textImageContent.text?.trim() ||
    textImageContent.title?.trim() ||
    t(dict, "transitional.final");

  const orderedCategorySections = useMemo(() => {
    const preparedParents: CategoryStat[] = [];

    for (const parent of categories) {
      if (!Array.isArray(parent.children)) continue;

      const hasActiveChild = parent.children.some(
        (child) => child.specialists_count > 0
      );
      if (!hasActiveChild) continue;

      const orderedChildren = [...parent.children]
        .sort((a, b) => {
          const aBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(a.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]);
          const bBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(b.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]);

          if (aBoosted && !bBoosted) return -1;
          if (!aBoosted && bBoosted) return 1;
          return b.specialists_count - a.specialists_count;
        })
        .slice(0, 3);

      preparedParents.push({
        ...parent,
        children: orderedChildren,
      });
    }

    if (homepageParentSlotSlugs.length === 0) {
      const fallbackBoosted: CategoryStat[] = [];
      const fallbackNormal: CategoryStat[] = [];

      for (const parent of preparedParents) {
        const hasActiveBoostedChild = (parent.children ?? []).some(
          (child) =>
            BOOSTED_CHILD_CATEGORY_SLUGS.includes(child.slug as typeof BOOSTED_CHILD_CATEGORY_SLUGS[number]) &&
            child.specialists_count > 0
        );

        if (hasActiveBoostedChild) fallbackBoosted.push(parent);
        else fallbackNormal.push(parent);
      }

      return [...fallbackBoosted, ...fallbackNormal].slice(0, 4);
    }

    const parentBySlug = new Map<string, CategoryStat>();
    for (const parent of preparedParents) {
      parentBySlug.set(parent.slug, parent);
    }

    const orderedParents: CategoryStat[] = [];
    for (const slug of homepageParentSlotSlugs) {
      const parent = parentBySlug.get(slug);
      if (!parent) continue;
      orderedParents.push(parent);
      parentBySlug.delete(slug);
    }

    for (const parent of preparedParents) {
      if (parentBySlug.has(parent.slug)) {
        orderedParents.push(parent);
        parentBySlug.delete(parent.slug);
      }
    }

    return orderedParents.slice(0, 4);
  }, [categories, homepageParentSlotSlugs]);

  const categoryTiles = useMemo(() => {
    const fromParents = orderedCategorySections.flatMap((parent) => parent.children ?? []);
    const source =
      fromParents.length > 0
        ? fromParents
        : popularCategories.map((item) => ({
            id: item.id,
            slug: item.slug,
            title: item.title,
            title_ru: item.title_ru,
            title_de: item.title_de,
            title_ua: item.title_ua,
            specialists_count: item.specialists_count,
            is_clickable: true,
          }));
    return source.slice(0, 6);
  }, [orderedCategorySections, popularCategories]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#f8f7f5]">
      {/* Hero */}
      <section className="bg-[#f8f7f5] px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[110px]">
        <div className={`${publicPageContainerClass} px-0 text-center`}>
          <div className="mx-auto max-w-[840px] space-y-4">
            <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight text-freuly-text-primary sm:text-[2.375rem] lg:text-[46px]">
              {t(dict, "home.variantC.hero.title")}
            </h1>
            <p className="mx-auto max-w-[680px] text-base leading-relaxed text-freuly-text-secondary">
              {t(dict, "home.variantC.hero.subtitle")}
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-xl text-left md:hidden">
            <InstallFreuly
              lang={lang}
              audience="client"
              placement="home_mobile"
              variant="compact"
            />
          </div>

          <ServiceSearchFlow
            variant="home"
            text={SERVICE_SEARCH_FLOW_TEXT[lang]}
            defaultLanguage={lang}
            initialLocation={placeFromUrl}
            className="mx-auto mt-10 max-w-[820px]"
          />

          <div className="mx-auto mt-10 inline-flex max-w-full flex-wrap items-center justify-center gap-3.5">
            <div className="flex items-center" aria-hidden>
              {Array.from({ length: 3 }).map((_, idx) => {
                const avatarUrl = trustAvatars[idx];
                const fallbackColor = TRUST_AVATAR_FALLBACKS[idx] ?? TRUST_AVATAR_FALLBACKS[0];
                return (
                  <span
                    key={`trust-avatar-${idx}`}
                    className={[
                      "inline-flex h-7 w-7 overflow-hidden rounded-[14px] border-2 border-[#f8f7f5]",
                      idx < 2 ? "-mr-2.5" : "",
                    ].join(" ")}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="block h-full w-full" style={{ backgroundColor: fallbackColor }} />
                    )}
                  </span>
                );
              })}
            </div>
            <p className="text-[13px] font-medium text-freuly-text-secondary">
              {t(dict, "home.variantC.hero.trustLine")}
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-24">
        <div className={`${publicPageContainerClass} space-y-10 px-0`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary sm:text-[32px]">
              {t(dict, "home.variantC.categories.title")}
            </h2>
            <Link
              href={`/${lang}/service-search`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "home.variantC.categories.viewAll")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {isPopularLoading && categoryTiles.length === 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`category-skeleton-${idx}`}
                  className={`${publicCardClass} h-[132px] animate-pulse border border-freuly-border-default bg-[#f8f7f5] p-6`}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTiles.map((child, index) => {
                const label = getCategoryTitle(child, toCategoryTitleLang(lang));
                const description = t(dict, "category.parent.found").replace(
                  /\{\{\s*count\s*\}\}/g,
                  String(child.specialists_count),
                );
                const cardInner = (
                  <>
                    <div className="flex items-center gap-3">
                      <VariantCCategoryIcon slug={child.slug} index={index} />
                      <span className="text-lg font-semibold leading-tight text-freuly-text-primary line-clamp-1">
                        {label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-freuly-text-secondary line-clamp-2">
                      {description}
                    </p>
                  </>
                );

                if (!child.is_clickable) {
                  return (
                    <div
                      key={child.id}
                      className={`${publicCardClass} flex flex-col gap-3.5 border border-freuly-border-default bg-[#f8f7f5] p-6 opacity-80`}
                    >
                      {cardInner}
                    </div>
                  );
                }

                return (
                  <Link
                    key={child.id}
                    href={`/${lang}/category/${child.slug}`}
                    className={`${publicCardClass} flex flex-col gap-3.5 border border-freuly-border-default bg-[#f8f7f5] p-6 transition-colors hover:border-freuly-primary/30`}
                  >
                    {cardInner}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works — before specialists (Variant C order) */}
      <section className="bg-[#eaf6f5] px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[100px]">
        <div className={`${publicPageContainerClass} space-y-12 px-0`}>
          <div className="space-y-2">
            <p className="text-[13px] font-bold uppercase tracking-wide text-freuly-primary">
              {t(dict, "home.variantC.howItWorks.eyebrow")}
            </p>
            <h2 className="max-w-3xl text-[1.75rem] font-bold leading-[1.2] text-freuly-text-primary sm:text-4xl">
              {t(dict, "home.variantC.howItWorks.headline")}
            </h2>
          </div>
          <VariantCHowItWorksSteps dict={dict} />
        </div>
      </section>

      {/* Recommended specialists */}
      {(isRecommendedLoading || recommendedSpecialists.length > 0) && (
        <section className="bg-[#f8f7f5] px-freuly-4 pb-20 pt-16 sm:px-freuly-6 sm:pb-24 sm:pt-20 lg:px-16 lg:pb-[104px] lg:pt-24">
          <div className={`${publicPageContainerClass} space-y-12 px-0`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-freuly-primary">
                  {t(dict, "home.variantC.recommended.eyebrow")}
                </p>
                <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary sm:text-[32px]">
                  {t(dict, "home.variantC.recommended.title")}
                </h2>
              </div>
              <Link
                href={`/${lang}/service-search`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
              >
                {t(dict, "home.variantC.recommended.viewAll")}
                <span aria-hidden>→</span>
              </Link>
            </div>

            {isRecommendedLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`recommended-skeleton-${idx}`} className={`${publicCardClass} overflow-hidden`}>
                    <div className="h-[220px] animate-pulse bg-freuly-border-subtle" />
                    <div className="space-y-2 p-5">
                      <div className="h-5 w-2/3 rounded bg-freuly-border-subtle" />
                      <div className="h-4 w-1/2 rounded bg-freuly-border-subtle" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {recommendedSpecialists.slice(0, 4).map((specialist) => (
                  <VariantCSpecialistCard
                    key={specialist.id}
                    specialist={specialist}
                    lang={lang}
                    dict={dict}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Story */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-[120px]">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto max-w-[920px] rounded-3xl bg-[#eaf6f5] p-8 sm:p-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-5">
                <p className="text-[13px] font-bold uppercase tracking-wide text-freuly-primary">
                  {t(dict, "home.variantC.story.eyebrow")}
                </p>
                <p className="text-[1.375rem] font-semibold leading-[1.4] text-freuly-text-primary sm:text-[26px]">
                  {storyQuote}
                </p>
              </div>
              <Link
                href={`/${lang}/service-search`}
                className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover lg:self-end"
              >
                {t(dict, "home.variantC.story.cta")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Promos */}
      <section className="bg-white px-freuly-4 py-16 sm:px-freuly-6 sm:py-20 lg:px-16 lg:py-24">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="grid gap-6 lg:grid-cols-2">
            <Link
              href={`/${lang}/partners`}
              className={`${publicCardClass} flex gap-6 bg-[#fff1ec] p-8 transition-colors hover:border-freuly-primary/30`}
            >
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white">
                <Users className="h-6 w-6 text-[#d35a3b]" aria-hidden />
              </span>
              <span className="space-y-2">
                <span className="block text-xl font-bold text-freuly-text-primary">
                  {t(dict, "home.variantC.promo.invite.title")}
                </span>
                <span className="block text-sm leading-relaxed text-freuly-text-secondary">
                  {t(dict, "home.variantC.promo.invite.body")}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#d35a3b]">
                  {t(dict, "home.variantC.promo.invite.cta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </Link>

            <Link
              href={`/${lang}/for-specialists`}
              className={`${publicCardClass} flex gap-6 bg-[#eaf6f5] p-8 transition-colors hover:border-freuly-primary/30`}
            >
              <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white">
                <ShieldCheck className="h-6 w-6 text-freuly-primary" aria-hidden />
              </span>
              <span className="space-y-2">
                <span className="block text-xl font-bold text-freuly-text-primary">
                  {t(dict, "home.variantC.promo.specialist.title")}
                </span>
                <span className="block text-sm leading-relaxed text-freuly-text-secondary">
                  {t(dict, "home.mapCta.body")}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary">
                  {t(dict, "home.variantC.promo.specialist.cta")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-[#f8f7f5] px-freuly-4 py-12 sm:px-freuly-6 lg:px-16 lg:py-14">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto grid max-w-[860px] gap-8 text-center sm:grid-cols-3 sm:gap-6">
            {[
              {
                titleKey: "home.variantC.trust.reviewed.title",
                bodyKey: "home.variantC.trust.reviewed.body",
              },
              {
                titleKey: "home.variantC.trust.format.title",
                bodyKey: "home.variantC.trust.format.body",
              },
              {
                titleKey: "home.variantC.trust.multilingual.title",
                bodyKey: "home.variantC.trust.multilingual.body",
              },
            ].map(({ titleKey, bodyKey }) => (
              <div key={titleKey} className="space-y-1">
                <p className="text-[15px] font-bold text-freuly-text-primary">{t(dict, titleKey)}</p>
                <p className="text-[13px] leading-relaxed text-freuly-text-secondary">{t(dict, bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-freuly-error/20 bg-freuly-error-light px-4 py-3 text-sm text-freuly-error shadow">
          {error}
        </div>
      )}
    </div>
  );
}
