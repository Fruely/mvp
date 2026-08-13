"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getSpecialistUrl } from "@/lib/urls";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import GermanyMapCTA from "@/components/home/GermanyMapCTA";
import ServiceSearchFlow, {
  SERVICE_SEARCH_FLOW_TEXT,
} from "@/components/search-flow/ServiceSearchFlow";
import FounderBadge from "@/components/specialist/FounderBadge";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import {
  publicCardClass,
  publicLinkPrimaryClass,
  publicPageContainerClass,
} from "@/components/public/publicStyles";

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

const HERO_COPY: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    popularLabel: string;
  }
> = {
  ru: {
    title: "Найдите специалиста на вашем языке в Германии",
    subtitle: "Рядом с вами и онлайн. Выберите того, с кем вам удобно.",
    popularLabel: "Популярные категории:",
  },
  ua: {
    title: "Знайдіть спеціаліста вашою мовою в Німеччині",
    subtitle: "Поруч із вами та онлайн. Оберіть того, з ким вам зручно.",
    popularLabel: "Популярні категорії:",
  },
  de: {
    title: "Finden Sie einen Spezialisten in Ihrer Sprache in Deutschland",
    subtitle: "In Ihrer Nähe und online. Wählen Sie jemanden, mit dem Sie sich wohlfühlen.",
    popularLabel: "Beliebte Kategorien:",
  },
};

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

  const renderRecommendedSpecialists = (data: RecommendedSpecialist[] | null | undefined) => {
    if (!data || data.length === 0) return null;

    return (
      <section className="pt-12 pb-10 md:pt-14 md:pb-12">
        <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
          <h2 className="text-freuly-section-title text-freuly-text-primary">
            {t(dict, "home.recommended.title")}
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((specialist) => {
            const categoryLabel =
              getCategoryTitle(
                {
                  title: specialist.category_title,
                  title_ru: specialist.category_title_ru,
                  title_de: specialist.category_title_de,
                  title_ua: specialist.category_title_ua,
                },
                toCategoryTitleLang(lang),
              ) || t(dict, "home.recommended.defaultCategory");
            const profileHref = getSpecialistUrl(lang, specialist);

            return (
              <article
                key={specialist.id}
                className={`${publicCardClass} flex h-full flex-col overflow-hidden`}
              >
                <div className="relative h-[200px] w-full overflow-hidden bg-freuly-border-subtle">
                  {specialist.founder_badge ? (
                    <div className="absolute left-4 top-4 z-10">
                      <FounderBadge />
                    </div>
                  ) : null}
                  {specialist.badges?.includes("premium_placement") ||
                  specialist.placement_group === "premium" ? (
                    <div className="absolute right-4 top-4 z-10 rounded-freuly-pill border border-freuly-warning-border bg-freuly-warning-light px-2.5 py-1 text-freuly-badge font-semibold text-freuly-warning">
                      Премиум-показ
                    </div>
                  ) : null}
                  {specialist.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={specialist.avatar_url}
                      alt={specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-freuly-border-subtle" />
                  )}
                </div>
                <div className="flex flex-1 flex-col px-5 py-5">
                  <p className="text-freuly-card-title text-freuly-text-primary line-clamp-1">
                    {specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
                  </p>
                  <p className="mt-1 text-[15px] text-freuly-text-secondary line-clamp-1">
                    {categoryLabel}
                  </p>
                  {specialist.languages.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {specialist.languages.slice(0, 3).map((code) => (
                        <span
                          key={code}
                          className="rounded-freuly-pill border border-freuly-border-default bg-freuly-border-subtle px-2.5 py-1 text-xs text-freuly-text-secondary"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {specialist.about_line ? (
                    <p className="mt-3 text-sm italic leading-relaxed text-freuly-text-secondary line-clamp-2">
                      {specialist.about_line}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <p className="text-xs text-freuly-text-muted line-clamp-1">
                      {specialist.city || t(dict, "home.recommended.newSpecialist")}
                    </p>
                    <Link
                      href={profileHref}
                      className="shrink-0 text-sm font-medium text-freuly-primary hover:text-freuly-primary-hover"
                    >
                      {t(dict, "search.results.viewProfile")}
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

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
    if (fromParents.length > 0) return fromParents;
    return popularCategories.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      title_ru: item.title_ru,
      title_de: item.title_de,
      title_ua: item.title_ua,
      specialists_count: item.specialists_count,
      is_clickable: true,
    }));
  }, [orderedCategorySections, popularCategories]);

  const copy = HERO_COPY[lang] ?? HERO_COPY.ru;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-freuly-page">
      <section className="px-freuly-4 pb-10 pt-10 sm:px-freuly-6 sm:pb-12 sm:pt-12 lg:px-16">
        <div className={`${publicPageContainerClass} px-0 text-center`}>
          <h1 className="mx-auto max-w-4xl text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-freuly-text-primary sm:text-[2.25rem]">
            {copy.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] font-normal leading-[1.6] text-freuly-text-secondary">
            {copy.subtitle}
          </p>

          <div className="mx-auto mt-4 w-full max-w-xl text-left md:hidden">
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
            className="mx-auto mt-6 max-w-5xl sm:mt-6"
          />

          <p className="mt-4 text-[13px] text-freuly-text-muted sm:mt-5">
            {t(dict, "home.cta.socialProof")}
          </p>
          <p className="mt-2 hidden text-[13px] text-freuly-text-secondary sm:block">
            <span>{copy.popularLabel}</span> {t(dict, "home.hero.popularTags")}
          </p>
        </div>
      </section>

      <section className="px-freuly-4 pb-10 sm:px-freuly-6 lg:px-16">
        <div className={`${publicPageContainerClass} px-0`}>
          <h2 className="text-freuly-section-title text-freuly-text-primary">
            {t(dict, "home.categories.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-freuly-text-secondary">
            {t(dict, "home.categories.subtitle")}
          </p>

          {isPopularLoading && categoryTiles.length === 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`popular-skeleton-${idx}`}
                  className={`${publicCardClass} h-[101px] animate-pulse p-4`}
                >
                  <div className="h-4 w-2/3 rounded bg-freuly-border-subtle" />
                  <div className="mt-3 h-3 w-1/2 rounded bg-freuly-border-subtle" />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTiles.map((child) => {
                const label = getCategoryTitle(child, toCategoryTitleLang(lang));
                const inner = (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-flex h-[18px] w-[18px] shrink-0 rounded-[4px] bg-freuly-primary/15"
                        aria-hidden
                      />
                      <span className="text-[16px] font-semibold leading-[1.2] text-freuly-text-primary line-clamp-1">
                        {label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-freuly-text-secondary line-clamp-2">
                      {t(dict, "category.parent.found").replace(
                        /\{\{\s*count\s*\}\}/g,
                        String(child.specialists_count),
                      )}
                    </p>
                  </>
                );

                if (!child.is_clickable) {
                  return (
                    <div key={child.id} className={`${publicCardClass} p-4 opacity-80`}>
                      {inner}
                    </div>
                  );
                }

                return (
                  <Link
                    key={child.id}
                    href={`/${lang}/category/${child.slug}`}
                    className={`${publicCardClass} p-4 transition-colors hover:border-freuly-primary/30`}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="px-freuly-4 sm:px-freuly-6 lg:px-16">
        <div className={`${publicPageContainerClass} px-0`}>
          {isRecommendedLoading ? (
            <div className="pt-12 pb-10 md:pt-14 md:pb-12" aria-hidden>
              <div className="mb-6 h-8 w-72 rounded bg-freuly-border-subtle" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`recommended-skeleton-${idx}`} className={`${publicCardClass} overflow-hidden`}>
                    <div className="h-[200px] animate-pulse bg-freuly-border-subtle" />
                    <div className="space-y-2 p-5">
                      <div className="h-4 w-2/3 rounded bg-freuly-border-subtle" />
                      <div className="h-3 w-1/2 rounded bg-freuly-border-subtle" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderRecommendedSpecialists(recommendedSpecialists)
          )}
        </div>
      </section>

      <section className="bg-freuly-primary-light/60 px-freuly-4 py-12 sm:px-freuly-6 md:py-14 lg:px-16">
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-freuly-primary">
              {t(dict, "home.howItWorks.title")}
            </p>
            <p className="mt-3 text-freuly-section-title font-semibold leading-[1.3] text-freuly-text-primary">
              {t(dict, "transitional.final")}
            </p>
            <ol className="mt-6 space-y-3 text-[15px] leading-relaxed text-freuly-text-secondary">
              <li>{t(dict, "home.howItWorks.step1")}</li>
              <li>{t(dict, "home.howItWorks.step2")}</li>
              <li>{t(dict, "home.howItWorks.step3")}</li>
            </ol>
            {textImageContent.title || textImageContent.text ? (
              <p className="mt-6 text-sm leading-relaxed text-freuly-text-secondary">
                {textImageContent.title || textImageContent.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-freuly-4 py-12 sm:px-freuly-6 md:py-14 lg:px-16">
        <div className={`${publicPageContainerClass} grid gap-6 px-0 md:grid-cols-2`}>
          <div className={`${publicCardClass} bg-[#FFF7ED] p-6 sm:p-8`}>
            <h2 className="text-freuly-card-title text-freuly-text-primary">
              {t(dict, "header.nav.partners")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-freuly-text-secondary">
              {t(dict, "transitional.line2")}
            </p>
            <Link
              href={`/${lang}/partners`}
              className="mt-4 inline-flex text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "header.nav.partners")} →
            </Link>
          </div>
          <div className={`${publicCardClass} bg-freuly-primary-light p-6 sm:p-8`}>
            <h2 className="text-freuly-card-title text-freuly-text-primary">
              {t(dict, "home.howItWorks.specialistCta")}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-freuly-text-secondary">
              {t(dict, "home.mapCta.body")}
            </p>
            <Link
              href={`/${lang}/for-specialists`}
              className="mt-4 inline-flex text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "home.mapCta.button")} →
            </Link>
          </div>
        </div>
      </section>

      <GermanyMapCTA
        title={t(dict, "home.mapCta.title")}
        subtitle={t(dict, "home.mapCta.subtitle")}
        body={t(dict, "home.mapCta.body")}
        spark={t(dict, "home.mapCta.spark")}
        button={t(dict, "home.mapCta.button")}
        lang={lang}
      />

      <section className="border-t border-freuly-border-default px-freuly-4 py-10 sm:px-freuly-6 lg:px-16">
        <div className={`${publicPageContainerClass} grid gap-8 px-0 text-center sm:grid-cols-3`}>
          <p className="text-[15px] leading-relaxed text-freuly-text-secondary">
            {t(dict, "transitional.line1")}
          </p>
          <p className="text-[15px] leading-relaxed text-freuly-text-secondary">
            {t(dict, "transitional.line2")}
          </p>
          <p className="text-[15px] leading-relaxed text-freuly-text-secondary">
            {t(dict, "transitional.line3")}
          </p>
        </div>
      </section>

      <section className="px-freuly-4 pb-14 text-center sm:px-freuly-6 lg:px-16">
        <h2 className="text-freuly-section-title text-freuly-text-primary">{t(dict, "home.cta.title")}</h2>
        <p className="mx-auto mt-2 max-w-lg text-[15px] text-freuly-text-secondary">
          {t(dict, "home.cta.subtitle")}
        </p>
        <Link href={`/${lang}/for-specialists`} className={`${publicLinkPrimaryClass} mt-5`}>
          {t(dict, "home.cta.button")}
        </Link>
      </section>

      {error && (
        <div className="fixed bottom-4 right-4 rounded-lg border border-freuly-error/20 bg-freuly-error-light px-4 py-3 text-sm text-freuly-error shadow">
          {error}
        </div>
      )}
    </div>
  );
}
