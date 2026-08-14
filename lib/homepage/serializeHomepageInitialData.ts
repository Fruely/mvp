import type {
  HomepageCategoryStat,
  HomepageInitialData,
  HomepagePopularCategory,
  HomepageRecommendedSpecialist,
} from "@/lib/homepage/types";

const ABOUT_LINE_MAX_CHARS = 160;

function truncateAboutLine(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= ABOUT_LINE_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, ABOUT_LINE_MAX_CHARS - 1).trimEnd()}…`;
}

/** Slim specialist payload for Homepage cards only (Variant C uses 4 cards). */
export function toHomepageRecommendedDto(
  specialists: HomepageRecommendedSpecialist[]
): HomepageRecommendedSpecialist[] {
  return specialists.slice(0, 4).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    avatar_url: row.avatar_url,
    city: row.city,
    languages: row.languages,
    category_title: row.category_title,
    category_title_ru: row.category_title_ru,
    category_title_de: row.category_title_de,
    category_title_ua: row.category_title_ua,
    about_line: truncateAboutLine(row.about_line),
    founder_badge: row.founder_badge === true ? true : undefined,
  }));
}

function toCategoryChildDto(
  child: NonNullable<HomepageCategoryStat["children"]>[number]
): NonNullable<HomepageCategoryStat["children"]>[number] {
  return {
    id: child.id,
    slug: child.slug,
    title: child.title,
    title_ru: child.title_ru ?? null,
    title_de: child.title_de ?? null,
    title_ua: child.title_ua ?? null,
    specialists_count: child.specialists_count,
    is_clickable: child.is_clickable,
  };
}

function toCategoryDto(category: HomepageCategoryStat): HomepageCategoryStat {
  return {
    id: category.id,
    slug: category.slug,
    title: category.title,
    title_ru: category.title_ru ?? null,
    title_de: category.title_de ?? null,
    title_ua: category.title_ua ?? null,
    specialists_count: category.specialists_count,
    is_clickable: category.is_clickable,
    children: category.children?.map(toCategoryChildDto),
  };
}

function toPopularCategoryDto(item: HomepagePopularCategory): HomepagePopularCategory {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    title_ru: item.title_ru ?? null,
    title_de: item.title_de ?? null,
    title_ua: item.title_ua ?? null,
    specialists_count: item.specialists_count,
  };
}

/** Strip unused fields before passing homepage data into the client tree. */
export function serializeHomepageInitialData(data: HomepageInitialData): HomepageInitialData {
  return {
    categories: data.categories.map(toCategoryDto),
    popularCategories: data.popularCategories.map(toPopularCategoryDto),
    homepageParentSlotSlugs: data.homepageParentSlotSlugs,
    recommendedSpecialists: toHomepageRecommendedDto(data.recommendedSpecialists),
  };
}
