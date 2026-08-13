"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Users } from "lucide-react";
import type { Dictionary, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { getCategoryTitle } from "@/lib/getCategoryTitle";
import { toCategoryTitleLang } from "@/lib/i18n/toCategoryTitleLang";
import ServiceSearchFlow, {
  SERVICE_SEARCH_FLOW_TEXT,
} from "@/components/search-flow/ServiceSearchFlow";
import InstallFreuly from "@/components/pwa/InstallFreuly";
import {
  publicCardClass,
  publicPageContainerClass,
} from "@/components/public/publicStyles";
import { getHomeCategoryIcon } from "@/components/home/categoryIcon";
import HomeSpecialistCard, {
  type HomeSpecialistCardData,
} from "@/components/home/HomeSpecialistCard";
import HomeHowItWorksSteps from "@/components/home/HomeHowItWorksSteps";

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

type RecommendedSpecialist = HomeSpecialistCardData & {
  rating_avg: number | null;
  reviews_count: number;
  is_featured?: boolean;
  placement_group?: RecommendationPlacementGroup;
  recommendation_row?: number;
  badges?: RecommendationBadge[];
};

const BOOSTED_CHILD_CATEGORY_SLUGS = ["it-support"] as const;
const SECTION_X = "px-freuly-4 sm:px-freuly-6 lg:px-16";

export default function HomeClient({ lang, dict, place }: { lang: Lang; dict: Dictionary; place?: string }) {
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([]);
  const [recommendedSpecialists, setRecommendedSpecialists] = useState<RecommendedSpecialist[]>([]);
  const [homepageParentSlotSlugs, setHomepageParentSlotSlugs] = useState<string[]>([]);
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
            item.slug.trim().length > 0,
        )
        .map((item: any) => ({
          id: String(item.id),
          slug: String(item.slug),
          title: item.title ? String(item.title) : null,
          title_ru: item.title_ru != null ? String(item.title_ru) : null,
          title_de: item.title_de != null ? String(item.title_de) : null,
          title_ua: item.title_ua != null ? String(item.title_ua) : null,
          parent_id: typeof item.parent_id === "string" ? item.parent_id : null,
          specialists_count: Number(item.specialists_count || 0),
          is_clickable: Boolean(item.is_clickable),
          children: Array.isArray(item.children)
            ? item.children
                .filter(
                  (child: any) =>
                    child &&
                    typeof child.id === "string" &&
                    typeof child.slug === "string" &&
                    child.slug.trim().length > 0,
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

    async function loadCategories() {
      try {
        const parentRes = await fetch(
          "/api/specialists/categories?mode=parents&include_children=1",
        );
        const parentJson = await parentRes.json();
        if (!parentRes.ok) {
          throw new Error(parentJson.error || "Ошибка загрузки parent-категорий");
        }
        const parentData = normalizeCategories(
          Array.isArray(parentJson.data) ? parentJson.data : [],
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
          normalizeCategories(Array.isArray(childJson.data) ? childJson.data : []),
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
              item.slug.trim().length > 0,
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
          .filter((item: { id?: unknown }) => item && typeof item.id === "string")
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
              ? item.languages.filter(
                  (value: unknown): value is string =>
                    typeof value === "string" && value.trim().length > 0,
                )
              : [],
            category_title: typeof item.category_title === "string" ? item.category_title : null,
            category_title_ru:
              typeof item.category_title_ru === "string" ? item.category_title_ru : null,
            category_title_de:
              typeof item.category_title_de === "string" ? item.category_title_de : null,
            category_title_ua:
              typeof item.category_title_ua === "string" ? item.category_title_ua : null,
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
                    badge === "new_discovery",
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

    loadCategories();
    loadHomepageParentSlots();
    loadPopularCategories();
    loadRecommendedSpecialists();
  }, [lang]);

  const orderedCategorySections = useMemo(() => {
    const preparedParents: CategoryStat[] = [];

    for (const parent of categories) {
      if (!Array.isArray(parent.children)) continue;

      const hasActiveChild = parent.children.some((child) => child.specialists_count > 0);
      if (!hasActiveChild) continue;

      const orderedChildren = [...parent.children]
        .sort((a, b) => {
          const aBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(
            a.slug as (typeof BOOSTED_CHILD_CATEGORY_SLUGS)[number],
          );
          const bBoosted = BOOSTED_CHILD_CATEGORY_SLUGS.includes(
            b.slug as (typeof BOOSTED_CHILD_CATEGORY_SLUGS)[number],
          );

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
            BOOSTED_CHILD_CATEGORY_SLUGS.includes(
              child.slug as (typeof BOOSTED_CHILD_CATEGORY_SLUGS)[number],
            ) && child.specialists_count > 0,
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
    if (fromParents.length > 0) return fromParents.slice(0, 6);
    return popularCategories.slice(0, 6).map((item) => ({
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

  const trustAvatars = recommendedSpecialists
    .map((specialist) => specialist.avatar_url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-freuly-page">
      <section className={`${SECTION_X} bg-freuly-page pb-12 pt-10 sm:pb-16 sm:pt-12 lg:pb-[110px] lg:pt-[110px]`}>
        <div className={`${publicPageContainerClass} px-0 text-center`}>
          <h1 className="mx-auto max-w-4xl text-[1.75rem] font-bold leading-[1.15] tracking-tight text-freuly-text-primary sm:text-[2rem] lg:text-[44px]">
            {t(dict, "home.hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-[680px] text-base leading-relaxed text-freuly-text-secondary">
            {t(dict, "home.hero.subtitle")}
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
            className="mx-auto mt-10 max-w-[820px]"
          />

          <div className="mx-auto mt-10 flex max-w-xl items-center justify-center gap-3.5">
            <div className="flex items-center">
              {trustAvatars.length > 0
                ? trustAvatars.map((avatarUrl, index) => (
                    <span
                      key={avatarUrl}
                      className={[
                        "relative inline-flex size-7 overflow-hidden rounded-full border-2 border-freuly-page bg-freuly-border-subtle",
                        index > 0 ? "-ml-2.5" : "",
                      ].join(" ")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    </span>
                  ))
                : [0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className={[
                        "inline-flex size-7 rounded-full border-2 border-freuly-page bg-freuly-primary-light",
                        index > 0 ? "-ml-2.5" : "",
                      ].join(" ")}
                      aria-hidden
                    />
                  ))}
            </div>
            <p className="text-[13px] font-medium text-freuly-text-secondary">
              {t(dict, "home.hero.trustLine")}
            </p>
          </div>
        </div>
      </section>

      <section id="categories" className={`${SECTION_X} bg-freuly-surface py-16 lg:py-24`}>
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary lg:text-[32px]">
              {t(dict, "home.categories.title")}
            </h2>
            <Link
              href={`/${lang}/service-search`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "home.categories.viewAll")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {isPopularLoading && categoryTiles.length === 0 ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`popular-skeleton-${idx}`}
                  className={`${publicCardClass} h-[136px] animate-pulse rounded-freuly-xl p-6`}
                />
              ))}
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTiles.map((child) => {
                const label = getCategoryTitle(child, toCategoryTitleLang(lang));
                const Icon = getHomeCategoryIcon(child.slug);
                const description = t(dict, "category.parent.found").replace(
                  /\{\{\s*count\s*\}\}/g,
                  String(child.specialists_count),
                );
                const cardInner = (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-freuly-md bg-freuly-primary-light text-freuly-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="text-lg font-semibold text-freuly-text-primary line-clamp-1">
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
                      className={`${publicCardClass} flex flex-col gap-3.5 rounded-freuly-xl p-6 opacity-80`}
                    >
                      {cardInner}
                    </div>
                  );
                }

                return (
                  <Link
                    key={child.id}
                    href={`/${lang}/category/${child.slug}`}
                    className={`${publicCardClass} flex flex-col gap-3.5 rounded-freuly-xl p-6 transition-colors hover:border-freuly-primary/30`}
                  >
                    {cardInner}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className={`${SECTION_X} bg-freuly-page py-16 lg:pb-[104px] lg:pt-24`}>
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-freuly-primary">
                {t(dict, "home.recommended.eyebrow")}
              </p>
              <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary lg:text-[32px]">
                {t(dict, "home.recommended.title")}
              </h2>
            </div>
            <Link
              href={`/${lang}/service-search`}
              className="inline-flex items-center gap-1 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
            >
              {t(dict, "home.recommended.viewAll")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {isRecommendedLoading ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`recommended-skeleton-${idx}`}
                  className={`${publicCardClass} overflow-hidden rounded-freuly-xl`}
                >
                  <div className="h-[220px] animate-pulse bg-freuly-border-subtle" />
                  <div className="space-y-2 p-5">
                    <div className="h-4 w-2/3 rounded bg-freuly-border-subtle" />
                    <div className="h-3 w-1/2 rounded bg-freuly-border-subtle" />
                  </div>
                </div>
              ))}
            </div>
          ) : recommendedSpecialists.length > 0 ? (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {recommendedSpecialists.slice(0, 4).map((specialist) => (
                <HomeSpecialistCard
                  key={specialist.id}
                  lang={lang}
                  dict={dict}
                  specialist={specialist}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className={`${SECTION_X} bg-freuly-surface py-16 lg:py-[100px]`}>
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-freuly-primary">
              {t(dict, "home.howItWorks.title")}
            </p>
            <h2 className="text-[1.75rem] font-bold leading-tight text-freuly-text-primary lg:text-[32px]">
              {t(dict, "home.howItWorks.headline")}
            </h2>
          </div>
          <div className="mt-12">
            <HomeHowItWorksSteps dict={dict} />
          </div>
        </div>
      </section>

      <section className={`${SECTION_X} bg-freuly-page py-16 lg:py-20`}>
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto max-w-[820px] rounded-[24px] bg-freuly-primary-light p-6 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-freuly-primary">
                  {t(dict, "home.story.eyebrow")}
                </p>
                <p className="text-xl font-semibold leading-snug text-freuly-text-primary sm:text-2xl">
                  &ldquo;{t(dict, "transitional.final")}&rdquo;
                </p>
              </div>
              <Link
                href={`/${lang}/service-search`}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
              >
                {t(dict, "home.story.cta")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${SECTION_X} bg-freuly-surface py-16 lg:py-24`}>
        <div className={`${publicPageContainerClass} grid gap-6 px-0 lg:grid-cols-2`}>
          <div className="flex gap-6 rounded-freuly-xl border border-freuly-border-default bg-[#FFF1EC] p-8">
            <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-freuly-lg bg-freuly-surface text-[#D35A3B]">
              <Users className="size-6" aria-hidden />
            </span>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-freuly-text-primary">
                {t(dict, "home.promo.inviteTitle")}
              </h3>
              <p className="text-sm leading-relaxed text-freuly-text-secondary">
                {t(dict, "home.promo.inviteBody")}
              </p>
              <Link
                href={`/${lang}/partners`}
                className="inline-flex pt-1 text-sm font-semibold text-[#D35A3B] hover:opacity-90"
              >
                {t(dict, "home.promo.inviteCta")} →
              </Link>
            </div>
          </div>

          <div className="flex gap-6 rounded-freuly-xl border border-freuly-border-default bg-freuly-primary-light p-8">
            <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-freuly-lg bg-freuly-surface text-freuly-primary">
              <Shield className="size-6" aria-hidden />
            </span>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-freuly-text-primary">
                {t(dict, "home.promo.specialistTitle")}
              </h3>
              <p className="text-sm leading-relaxed text-freuly-text-secondary">
                {t(dict, "home.promo.specialistBody")}
              </p>
              <Link
                href={`/${lang}/for-specialists`}
                className="inline-flex pt-1 text-sm font-semibold text-freuly-primary hover:text-freuly-primary-hover"
              >
                {t(dict, "home.promo.specialistCta")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${SECTION_X} bg-freuly-page py-14`}>
        <div className={`${publicPageContainerClass} px-0`}>
          <div className="mx-auto grid max-w-[860px] gap-8 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-0">
            <div className="space-y-1 px-2">
              <p className="text-[15px] font-bold text-freuly-text-primary">
                {t(dict, "home.trust.reviewedTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-freuly-text-secondary">
                {t(dict, "home.trust.reviewedDesc")}
              </p>
            </div>
            <div className="hidden h-9 w-px bg-freuly-border-default sm:block" aria-hidden />
            <div className="space-y-1 px-2">
              <p className="text-[15px] font-bold text-freuly-text-primary">
                {t(dict, "home.trust.formatTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-freuly-text-secondary">
                {t(dict, "home.trust.formatDesc")}
              </p>
            </div>
            <div className="hidden h-9 w-px bg-freuly-border-default sm:block" aria-hidden />
            <div className="space-y-1 px-2">
              <p className="text-[15px] font-bold text-freuly-text-primary">
                {t(dict, "home.trust.languageTitle")}
              </p>
              <p className="text-[13px] leading-relaxed text-freuly-text-secondary">
                {t(dict, "home.trust.languageDesc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="fixed bottom-4 right-4 rounded-lg border border-freuly-error/20 bg-freuly-error-light px-4 py-3 text-sm text-freuly-error shadow">
          {error}
        </div>
      ) : null}
    </div>
  );
}
