import { createSupabaseServerClient } from '@/lib/supabase/server';
import { jsonNoStore } from '@/lib/api/response';
import { CACHE_PUBLIC_POPULAR_CATEGORIES, jsonWithCache } from '@/lib/http/cache';
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from '@/lib/specialists/status';

export const dynamic = 'force-dynamic';

type ManagedFeaturedCategory = {
  id: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  title: string | null;
  title_ru: string | null;
  title_de: string | null;
  title_ua: string | null;
  name_en: string;
  name_de: string;
  name_ru: string;
  name_ua: string;
  specialists_count: number;
  sort_order: number;
  placement: string;
};

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const placement = searchParams.get('placement') || 'featured';

    // Fetch managed featured categories in sort_order
    const { data: managedData, error: managedError } = await supabase
      .from('homepage_featured_categories')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (managedError) throw managedError;
    if (!managedData || managedData.length === 0) {
      return jsonNoStore({ categories: [] });
    }

    // Extract category IDs and maintain sort order + placement via Map
    const categoryIds = managedData.map((item: any) => item.category_id);
    const sortOrderMap = new Map(
      managedData.map((item: any) => [item.category_id, item.sort_order])
    );
    const placementMap = new Map(
      managedData.map((item: any) => [item.category_id, item.placement])
    );

    // Fetch full category data with explicit title fields
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, slug, title, title_ru, title_de, title_ua, parent_id, image_url')
      .in('id', categoryIds);

    if (categoriesError) throw categoriesError;

    const parentIds = (categoriesData ?? [])
      .filter((cat: any) => cat && typeof cat.id === 'string')
      .map((cat: any) => cat.id);

    const { data: childCategoriesData, error: childCategoriesError } = await supabase
      .from('categories')
      .select('id, parent_id')
      .in('parent_id', parentIds)
      .eq('is_active', true);

    if (childCategoriesError) throw childCategoriesError;

    const childCategoryMap = new Map<string, string[]>();
    for (const child of (childCategoriesData ?? []) as Array<{ id: string; parent_id: string | null }>) {
      if (!child.parent_id) continue;
      const list = childCategoryMap.get(child.parent_id) ?? [];
      list.push(child.id);
      childCategoryMap.set(child.parent_id, list);
    }

    const relevantCategoryIds = Array.from(
      new Set([
        ...categoryIds,
        ...Array.from(childCategoryMap.values()).flat(),
      ])
    );

    // Count specialists per relevant category id
    const { data: serviceData, error: serviceError } = await supabase
      .from('specialist_services')
      .select(`
        category_id,
        specialist_id,
        specialists!inner ( status, is_active, is_visible, is_test )
      `)
      .eq('is_active', true)
      .in('category_id', relevantCategoryIds)
      .in('specialists.status', [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq('specialists.is_active', true)
      .eq('specialists.is_visible', true)
      .or('is_test.is.null,is_test.eq.false', { referencedTable: 'specialists' });

    if (serviceError) {
      console.error('[api/homepage/featured-categories] services error:', serviceError);
      return jsonNoStore({ categories: [] });
    }

    const countByCategory = new Map<string, number>();
    const seenPairs = new Set<string>();
    for (const row of (serviceData ?? []) as any[]) {
      const spec = Array.isArray(row.specialists) ? row.specialists[0] : row.specialists;
      if (spec?.is_test) continue;
      if (!row.category_id || !row.specialist_id) continue;
      const key = `${row.category_id}:${row.specialist_id}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
    }

    // Map categories, preserving DB sort_order and counting parents across active children
    const result: ManagedFeaturedCategory[] = (categoriesData || [])
      .map((cat: any) => {
        const directCount = countByCategory.get(cat.id) || 0;
        const childIds = childCategoryMap.get(cat.id) ?? [];
        const childCount = childIds.reduce(
          (sum, childId) => sum + (countByCategory.get(childId) || 0),
          0
        );
        const specialists_count = childIds.length > 0 ? childCount : directCount;

        return {
          id: cat.id,
          slug: cat.slug,
          parent_id: cat.parent_id || null,
          image_url: cat.image_url || null,
          title: cat.title,
          title_ru: cat.title_ru,
          title_de: cat.title_de,
          title_ua: cat.title_ua,
          name_en: cat.title,
          name_de: cat.title_de,
          name_ru: cat.title_ru,
          name_ua: cat.title_ua,
          specialists_count,
          sort_order: sortOrderMap.get(cat.id) || 999,
          placement: placementMap.get(cat.id) || placement,
        };
      })
      .filter((item) => item.specialists_count > 0)
      .sort((a: any, b: any) => a.sort_order - b.sort_order);

    return jsonWithCache({ categories: result }, CACHE_PUBLIC_POPULAR_CATEGORIES);
  } catch (error) {
    console.error('[featured-categories] Error:', error);
    return jsonNoStore({ categories: [] });
  }
}
