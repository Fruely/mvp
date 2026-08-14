import { unstable_cache } from "next/cache";
import type { Lang } from "@/lib/i18n";
import { fetchHomepageParentCategories } from "@/lib/homepage/fetchParentCategories";
import { fetchHomepagePopularCategories } from "@/lib/homepage/fetchPopularCategories";
import { fetchHomepageParentCategorySlotSlugs } from "@/lib/homepage/fetchParentCategorySlots";
import { fetchRecommendedSpecialists } from "@/lib/homepage/fetchRecommendedSpecialists";
import type { HomepageInitialData } from "@/lib/homepage/types";

export const HOMEPAGE_DATA_REVALIDATE_SECONDS = 300;

async function loadHomepageInitialDataUncached(lang: Lang): Promise<HomepageInitialData> {
  const [categoriesResult, popularCategoriesResult, slotsResult, recommendedResult] =
    await Promise.allSettled([
      fetchHomepageParentCategories(),
      fetchHomepagePopularCategories(),
      fetchHomepageParentCategorySlotSlugs(),
      fetchRecommendedSpecialists(lang),
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
  };
}

export function loadHomepageInitialData(lang: Lang): Promise<HomepageInitialData> {
  return unstable_cache(
    () => loadHomepageInitialDataUncached(lang),
    ["homepage-initial-data", lang],
    { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS }
  )();
}
