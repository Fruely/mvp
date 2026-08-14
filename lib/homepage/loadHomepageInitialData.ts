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
import type { HomepageInitialData } from "@/lib/homepage/types";

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

async function loadHomepageInitialDataUncached(lang: Lang): Promise<HomepageInitialData> {
  const [categoriesResult, popularCategoriesResult, slotsResult, recommendedResult, starMapResult] =
    await Promise.allSettled([
      cachedParentCategories(),
      cachedPopularCategories(),
      cachedParentCategorySlots(),
      fetchRecommendedSpecialistsCached(lang),
      fetchStarMapData(),
    ]);

  let categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  if (categories.length === 0 && categoriesResult.status === "fulfilled") {
    categories = [];
  }

  if (categoriesResult.status === "rejected") {
    console.error("[homepage/loadInitialData] categories failed", categoriesResult.reason);
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
  };
}

export function loadHomepageInitialData(lang: Lang): Promise<HomepageInitialData> {
  return unstable_cache(
    () => loadHomepageInitialDataUncached(lang),
    ["homepage-initial-data-v2", lang],
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
