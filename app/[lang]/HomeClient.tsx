"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const BOOSTED_CHILD_CATEGORY_SLUGS = ["it-support"] as const;

const HERO_COPY: Record<
  Lang,
  {
    titleLines: [string, string, string];
    subtitle: string;
    popularLabel: string;
  }
> = {
  ru: {
    titleLines: ["Найдите специалиста", "на вашем языке", "в Германии"],
    subtitle: "Рядом с вами и онлайн. Выберите того, с кем вам удобно.",
    popularLabel: "Популярные категории:",
  },
  ua: {
    titleLines: ["Знайдіть спеціаліста", "вашою мовою", "в Німеччині"],
    subtitle: "Поруч із вами та онлайн. Оберіть того, з ким вам зручно.",
    popularLabel: "Популярні категорії:",
  },
  de: {
    titleLines: ["Finden Sie einen Spezialisten", "in Ihrer Sprache", "in\u00a0Deutschland"],
    subtitle: "In Ihrer Nähe und online. Wählen Sie jemanden, mit dem Sie sich wohlfühlen.",
    popularLabel: "Beliebte Kategorien:",
  },
};

export default function HomeClient({ lang, dict, place }: { lang: Lang; dict: Dictionary; place?: string }) {
  const router = useRouter();
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
      <div className="mt-10">
        <div className="mb-4 md:mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-freuly-text-primary">{t(dict, "home.recommended.title")}</h2>
        </div>
        <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((specialist) => (
            <Link
              key={specialist.id}
              href={getSpecialistUrl(lang, specialist)}
              className="group flex h-full flex-col overflow-hidden rounded-freuly-md border bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all duration-200 ease-out [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:scale-[1.02] [@media(hover:hover)]:hover:shadow-lg"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-freuly-border-subtle">
                {specialist.founder_badge ? (
                  <div className="absolute left-3 top-3 z-10">
                    <FounderBadge />
                  </div>
                ) : null}
                {(specialist.badges?.includes("premium_placement") ||
                  specialist.placement_group === "premium") ? (
                  <div className="absolute right-3 top-3 z-10 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
                    Премиум-показ
                  </div>
                ) : null}
                {specialist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={specialist.avatar_url}
                    alt={specialist.name?.trim() ? specialist.name : t(dict, "specialist.fallback")}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-freuly-border-subtle" />
                )}
              </div>
              <div className="p-4 flex flex-col gap-1">
                <p className="font-semibold line-clamp-1 text-freuly-text-primary">
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
                      <span className="font-medium text-freuly-text-primary">{specialist.rating_avg?.toFixed(1)}</span>
                      <span className="text-freuly-text-secondary">({specialist.reviews_count})</span>
                    </>
                  ) : (
                    <span className="text-freuly-text-secondary">{t(dict, "home.recommended.newSpecialist")}</span>
                  )}
                </div>
                <p className="text-sm font-normal text-freuly-text-secondary line-clamp-1">
                  {getCategoryTitle(
                    {
                      title: specialist.category_title,
                      title_ru: specialist.category_title_ru,
                      title_de: specialist.category_title_de,
                      title_ua: specialist.category_title_ua,
                    },
                    toCategoryTitleLang(lang)
                  ) || t(dict, "home.recommended.defaultCategory")}
                </p>
                <p className="text-sm font-normal text-freuly-text-secondary line-clamp-1">
                  {[specialist.city, specialist.languages[0]].filter(Boolean).join(" • ")}
                </p>
                {specialist.about_line ? (
                  <p className="mt-1 text-sm font-normal text-freuly-text-secondary line-clamp-2">
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

  const copy = HERO_COPY[lang] ?? HERO_COPY.ru;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <>
      <section className="bg-freuly-page px-freuly-4 pb-freuly-8 pt-freuly-5 sm:py-freuly-16 md:py-freuly-24">
        <div className="mx-auto max-w-7xl text-center md:px-freuly-4">
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-freuly-text-primary sm:text-4xl md:text-[2.25rem]">
            <span className="block">{copy.titleLines[0]}</span>
            <span className="block">{copy.titleLines[1]}</span>
            <span className="block">{copy.titleLines[2]}</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base font-normal text-freuly-text-secondary sm:mt-freuly-6 sm:text-lg">
            {copy.subtitle}
          </p>

          {/* Compact install in first mobile viewport — before search flow */}
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
            className="mt-4 sm:mt-8"
          />

          <div className="mt-4 hidden flex-wrap justify-center gap-3 text-sm font-normal text-freuly-text-secondary sm:mt-6 sm:flex">
            <span>{copy.popularLabel}</span>
            <span>{t(dict, "home.hero.popularTags")}</span>
          </div>
        </div>
      </section>

      <section className="pt-12 pb-10 md:pt-16 md:pb-12">
        <div className="max-w-5xl mx-auto px-3 md:px-4 text-center">
          <p className="max-w-3xl mx-auto text-2xl md:text-3xl font-medium text-gray-900 leading-snug">
            {t(dict, "transitional.line1")}
          </p>

          <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl font-normal text-freuly-text-secondary leading-relaxed">
            {t(dict, "transitional.line2")}<br />
            {t(dict, "transitional.line3")}
          </p>

          <p className="mt-8 max-w-4xl mx-auto text-xl md:text-2xl text-gray-900 font-semibold">
            {t(dict, "transitional.final")}
          </p>
        </div>
      </section>

      <section className="pt-14 pb-10 md:pt-16 md:pb-12">
        <div className="max-w-[1280px] mx-auto px-3 md:px-6">
          <div className="rounded-xl bg-[#EEF1FF] px-3 py-6 sm:px-6 sm:py-8 md:px-12 md:py-10">
            {true && (
              <div className="mt-7 md:mt-8">
                <div className="relative min-h-[320px] overflow-hidden rounded-freuly-md sm:min-h-[420px] md:min-h-[520px]">
                  {textImageContent?.url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={textImageContent.url}
                        alt={textImageContent.title || ""}
                        className="absolute inset-0 z-0 h-full w-full rounded-freuly-md object-cover object-right"
                      />
                    </>
                  ) : null}

                  <div className="absolute inset-x-3 top-3 z-10 min-w-0 max-w-[22.4rem] rounded-freuly-md bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:inset-x-auto sm:left-6 sm:top-6 sm:p-5 md:left-8 md:top-8 md:p-[1.6rem]">
                    <h2 className="mb-5 text-xl font-bold text-gray-900 sm:mb-8 sm:text-3xl">
                      {t(dict, "home.howItWorks.title")}
                    </h2>

                    <div className="min-w-0 space-y-4 text-gray-700 sm:space-y-6">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 sm:h-10 sm:w-10 sm:text-base">
                          1
                        </div>
                        <p className="min-w-0 break-words">{t(dict, "home.howItWorks.step1")}</p>
                      </div>

                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 sm:h-10 sm:w-10 sm:text-base">
                          2
                        </div>
                        <p className="min-w-0 break-words">{t(dict, "home.howItWorks.step2")}</p>
                      </div>

                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 sm:h-10 sm:w-10 sm:text-base">
                          3
                        </div>
                        <p className="min-w-0 break-words">{t(dict, "home.howItWorks.step3")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isPopularLoading ? (
              <div className="mt-8 md:mt-10" aria-hidden>
                <div className="mb-6 h-8 w-64 rounded-lg bg-gray-200/80 animate-pulse" />
                <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-5 md:gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={`popular-skeleton-${idx}`}
                      className="rounded-freuly-md bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden"
                    >
                      <div className="w-full aspect-[3/2] bg-gray-200/80 animate-pulse" />
                      <div className="px-4 py-3 space-y-2">
                        <div className="h-4 w-3/4 rounded bg-gray-200/80 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-gray-200/80 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {orderedCategorySections.map((parent) => (
                <section key={parent.id} className="mt-12">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 pl-1 pb-2">
                    {getCategoryTitle(parent, toCategoryTitleLang(lang))}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 pb-12">
                    {(parent.children ?? []).map((child) => (
                      <div key={child.id}>
                        <Link
                          href={`/${lang}/category/${child.slug}`}
                          className="group block transition-shadow duration-300 ease-out hover:shadow-lg"
                        >
                          <div className="w-full aspect-[3/2] overflow-hidden rounded-[4px] bg-freuly-border-subtle">
                            {child.image_url ? (
                              <img
                                src={child.image_url}
                                alt={getCategoryTitle(child, toCategoryTitleLang(lang))}
                                className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-sm text-gray-400 px-3 text-center line-clamp-2">
                                  {getCategoryTitle(child, toCategoryTitleLang(lang))}
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="mt-2 px-1 text-base font-medium text-gray-900 line-clamp-1">
                            {getCategoryTitle(child, toCategoryTitleLang(lang))}
                          </p>
                        </Link>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

            {isRecommendedLoading ? (
              <div className="mt-10">
                <div className="mb-4 h-8 w-80 rounded-lg bg-gray-200/80 animate-pulse" />
                <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`recommended-skeleton-${idx}`}
                      className="rounded-freuly-md border bg-white aspect-[4/3] p-4"
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

      {/* Map CTA */}
      <GermanyMapCTA
        title={t(dict, "home.mapCta.title")}
        subtitle={t(dict, "home.mapCta.subtitle")}
        body={t(dict, "home.mapCta.body")}
        spark={t(dict, "home.mapCta.spark")}
        button={t(dict, "home.mapCta.button")}
        lang={lang}
      />

      {/* Desktop-only — mobile already has EarlyAccess (green) + Map CTA (green) */}
      <section className="hidden bg-gray-50 px-3 py-16 text-center md:block md:px-4">
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t(dict, "home.cta.title")}</h2>
        <p className="mx-auto mt-3 max-w-lg text-gray-600">
          {t(dict, "home.cta.subtitle")}
        </p>
        <Link
          href={`/${lang}/for-specialists`}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-freuly-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          {t(dict, "home.cta.button")}
        </Link>
        <p className="mt-3 text-xs text-gray-500">{t(dict, "home.cta.socialProof")}</p>
      </section>

      <div className="mt-10 text-center">
        <a
          href={`/${lang}/psychologists-germany`}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {t(dict, "categories.psychologists")}
        </a>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg shadow">
          {error}
        </div>
      )}
    </div>
  );
}
