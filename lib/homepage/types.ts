export type HomepageCategoryChild = {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  image_url?: string | null;
  specialists_count: number;
  is_clickable: boolean;
};

export type HomepageCategoryStat = {
  id: string;
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id?: string | null;
  specialists_count: number;
  is_clickable: boolean;
  children?: HomepageCategoryChild[];
};

export type HomepagePopularCategory = {
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

export type RecommendationBadge =
  | "founder_first_50"
  | "premium_placement"
  | "new_discovery";

export type RecommendationPlacementGroup =
  | "founder"
  | "premium"
  | "discovery"
  | "general";

export type HomepageRecommendedSpecialist = {
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
  rating_avg?: number | null;
  reviews_count?: number;
  founder_badge?: boolean;
  is_featured?: boolean;
  photo_focus?: unknown;
  placement_group?: RecommendationPlacementGroup;
  recommendation_row?: number;
  badges?: RecommendationBadge[];
};

export type HomepageStarMapCity = {
  city: string;
  lat: number;
  lng: number;
  count: number;
  recentCount: number;
};

export type HomepageStarMapData = {
  total: number;
  cities: HomepageStarMapCity[];
  eligibleCount: number;
  representedCount: number;
  missingCoordinatesCount: number;
};

export type HomepageInitialData = {
  categories: HomepageCategoryStat[];
  popularCategories: HomepagePopularCategory[];
  recommendedSpecialists: HomepageRecommendedSpecialist[];
  homepageParentSlotSlugs: string[];
  starMap: HomepageStarMapData;
};
