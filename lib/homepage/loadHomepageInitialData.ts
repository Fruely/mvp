import { unstable_cache } from "next/cache";
import type { Lang } from "@/lib/i18n";
import { fetchHomepageParentCategories } from "@/lib/homepage/fetchParentCategories";
import { fetchHomepagePopularCategories } from "@/lib/homepage/fetchPopularCategories";
import { fetchHomepageParentCategorySlotSlugs } from "@/lib/homepage/fetchParentCategorySlots";
import {
  fetchRecommendedSpecialistsCached,
} from "@/lib/homepage/fetchRecommendedSpecialists";
import { fetchStarMapData } from "@/lib/homepage/fetchStarMapData";
import { HOMEPAGE_DATA_REVALIDATE_SECONDS } from "@/lib/homepage/constants";
import type { HomepageInitialData, HomepageLatestPost } from "@/lib/homepage/types";
import { getLatestPublishedPosts } from "@/lib/content/queries";

export { HOMEPAGE_DATA_REVALIDATE_SECONDS };

const cachedParentCategories = unstable_cache(
  fetchHomepageParentCategories,
  ["homepage-parent-categories"],
  { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
);

const cachedPopularCategories = unstable_cache(
  fetchHomepagePopularCategories,
  ["homepage-popular-categories"],
  { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
);

const cachedParentCategorySlots = unstable_cache(
  fetchHomepageParentCategorySlotSlugs,
  ["homepage-parent-category-slots"],
  { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
);

const cachedLatestPublishedPosts = unstable_cache(
  async (lang: Lang) => getLatestPublishedPosts(lang, 3),
  ["homepage-latest-published-posts-v1"],
  { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
);

function toHomepageLatestPosts(
  posts: Awaited<ReturnType<typeof getLatestPublishedPosts>>,
): HomepageLatestPost[] {
  return posts.slice(0, 3).map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content_type: post.content_type,
    hero_image_url: post.hero_image_url,
    published_at: post.published_at,
  }));
}

async function loadHomepageInitialDataUncached(lang: Lang): Promise<HomepageInitialData> {
  const [categoriesResult, popularCategoriesResult, slotsResult, recommendedResult, starMapResult, latestPostsResult] =
    await Promise.allSettled([
      cachedParentCategories(),
      cachedPopularCategories(),
      cachedParentCategorySlots(),
      fetchRecommendedSpecialistsCached(lang),
      fetchStarMapData(),
      cachedLatestPublishedPosts(lang),
    ]);

  let categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  if (categories.length === 0 && categoriesResult.status === "fulfilled") {
    categories = [];
  }

  if (categoriesResult.status === "rejected") {
    console.error("[homepage/loadInitialData] categories failed", categoriesResult.reason);
  }

  if (latestPostsResult.status === "rejected") {
    console.error("[homepage/loadInitialData] latest content failed", latestPostsResult.reason);
  }

  return {
    categories,
    popularCategories:
      popularCategoriesResult.status === "fulfilled" ? popularCategoriesResult.value : [],
    homepageParentSlotSlugs:
      slotsResult.status === "fulfilled" ? slotsResult.value : [],
    recommendedSpecialists:
      recommendedResult.status === "fulfilled" ? recommendedResult.value : [],
    starMap:
      starMapResult.status === "fulfilled"
        ? starMapResult.value
        : {
            total: 0,
            cities: [],
            eligibleCount: 0,
            representedCount: 0,
            missingCoordinatesCount: 0,
          },
    latestPosts:
      latestPostsResult.status === "fulfilled"
        ? toHomepageLatestPosts(latestPostsResult.value)
        : [],
  };
}

export function loadHomepageInitialData(lang: Lang): Promise<HomepageInitialData> {
  return unstable_cache(
    () => loadHomepageInitialDataUncached(lang),
    ["homepage-initial-data-v4", lang],
    { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
  )();
}

/** Load shared homepage data without recommended specialists (faster critical path). */
export async function loadHomepageCriticalData(
  lang: Lang
): Promise<Omit<HomepageInitialData, "recommendedSpecialists">> {
  const [categoriesResult, popularCategoriesResult, slotsResult, starMapResult] =
    await Promise.allSettled([
      cachedParentCategories(),
      cachedPopularCategories(),
      cachedParentCategorySlots(),
      fetchStarMapData(),
    ]);

  if (categoriesResult.status === "rejected") {
    console.error("[homepage/loadCriticalData] categories failed", categoriesResult.reason);
  }

  return {
    categories: categoriesResult.status === "fulfilled" ? categoriesResult.value : [],
    popularCategories:
      popularCategoriesResult.status === "fulfilled" ? popularCategoriesResult.value : [],
    homepageParentSlotSlugs:
      slotsResult.status === "fulfilled" ? slotsResult.value : [],
    starMap:
      starMapResult.status === "fulfilled"
        ? starMapResult.value
        : {
            total: 0,
            cities: [],
            eligibleCount: 0,
            representedCount: 0,
            missingCoordinatesCount: 0,
          },
  };
}
