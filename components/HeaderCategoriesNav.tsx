import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";
import { getDictionary, t, type Lang } from "@/lib/i18n";

type CategoryRow = {
  id: string;
  slug: string;
  title: string | null;
  parent_id?: string | null;
};

type NavCategory = {
  id: string;
  slug: string;
  title: string | null;
  specialists_count: number;
  is_clickable: boolean;
};

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export default async function HeaderCategoriesNav({ lang }: { lang: string }) {
  const supabase = createSupabaseServerClient();
  const dict = await getDictionary(lang as Lang);
  const getCategoryLabel = (category: NavCategory) =>
    category.title ??
    t(dict, `categories.${category.slug}`, { defaultValue: t(dict, "categories.default") });

  const withParent = await supabase
    .from("categories")
    .select("id, slug, title, parent_id")
    .order("title", { ascending: true });

  let rawCategories: CategoryRow[] = [];
  let hasHierarchy = false;

  if (!withParent.error) {
    rawCategories = (withParent.data ?? []) as CategoryRow[];
    hasHierarchy = true;
  } else {
    const fallback = await supabase
      .from("categories")
      .select("id, slug, title")
      .order("title", { ascending: true });

    if (fallback.error) {
      console.error("[HeaderCategoriesNav]", fallback.error);
      return null;
    }

    rawCategories = ((fallback.data ?? []) as CategoryRow[]).map((category) => ({
      ...category,
      parent_id: null,
    }));
  }

  const minCount =
    parsePositiveInt(process.env.CATEGORY_MIN_SPECIALISTS) ??
    parsePositiveInt(process.env.NEXT_PUBLIC_CATEGORY_MIN_COUNT) ??
    1;

  const normalized = rawCategories.filter(
    (category) =>
      typeof category.id === "string" &&
      typeof category.slug === "string" &&
      category.slug.trim().length > 0
  );

  const hasParentChildrenRelation =
    hasHierarchy && normalized.some((category) => typeof category.parent_id === "string");

  const childCategories = hasParentChildrenRelation
    ? normalized.filter((category) => typeof category.parent_id === "string")
    : normalized;

  const childIds = childCategories.map((category) => category.id);

  let countsByCategoryId = new Map<string, number>();
  if (childIds.length > 0) {
    try {
      countsByCategoryId = await getPublicSpecialistCountsByServiceCategory(
        supabase,
        childIds
      );
    } catch (error) {
      console.error("[HeaderCategoriesNav] specialists", error);
      return null;
    }
  }

  let categories: NavCategory[] = [];

  if (hasParentChildrenRelation) {
    const childrenByParentId = new Map<string, CategoryRow[]>();
    for (const child of childCategories) {
      if (!child.parent_id) continue;
      const list = childrenByParentId.get(child.parent_id) ?? [];
      list.push(child);
      childrenByParentId.set(child.parent_id, list);
    }

    categories = normalized
      .filter((category) => !category.parent_id)
      .map((parent) => {
        const children = childrenByParentId.get(parent.id) ?? [];
        if (!children.length) return null;

        const specialistsCount = children.reduce(
          (sum, child) => sum + (countsByCategoryId.get(child.id) ?? 0),
          0
        );

        return {
          id: parent.id,
          slug: parent.slug,
          title: parent.title,
          specialists_count: specialistsCount,
          is_clickable: specialistsCount >= minCount,
        };
      })
      .filter((item): item is NavCategory => Boolean(item));
  } else {
    categories = childCategories.map((category) => {
      const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
      return {
        id: category.id,
        slug: category.slug,
        title: category.title,
        specialists_count: specialistsCount,
        is_clickable: specialistsCount >= minCount,
      };
    });
  }

  if (!categories.length) return null;

  return (
    <div className="min-w-[260px] max-h-[70vh] overflow-y-auto py-2">
      <ul className="space-y-0.5 px-2">
        {categories.map((cat) => (
          <li key={cat.id}>
            {cat.is_clickable ? (
              <Link
                href={`/${lang}/category/${cat.slug}`}
                className="flex items-center justify-between gap-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-gray-50 py-1.5 px-2 -mx-2 rounded transition"
              >
                <span className="truncate">{getCategoryLabel(cat)}</span>
                <span className="shrink-0 text-xs text-gray-400">{cat.specialists_count}</span>
              </Link>
            ) : (
              <span className="flex items-center justify-between gap-3 text-sm text-gray-400 py-1.5 px-2 -mx-2 rounded cursor-default">
                <span className="truncate">{getCategoryLabel(cat)}</span>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {t(dict, "common.soon")}
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
