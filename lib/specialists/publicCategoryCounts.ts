import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

type ServiceCategoryRow = {
  specialist_id: string | null;
  category_id: string | null;
  specialists?: {
    id?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    is_visible?: boolean | null;
    is_test?: boolean | null;
  } | Array<{
    id?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    is_visible?: boolean | null;
    is_test?: boolean | null;
  }> | null;
};

export async function getPublicSpecialistCountsByServiceCategory(
  supabase: SupabaseLike,
  categoryIds: string[]
): Promise<Map<string, number>> {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
  if (uniqueCategoryIds.length === 0) return new Map<string, number>();

  const { data: serviceRows, error: servicesError } = await supabase
    .from("specialist_services")
    .select("specialist_id, category_id, specialists!inner(id,status,is_active,is_visible,is_test)")
    .in("category_id", uniqueCategoryIds)
    .eq("is_active", true)
    .gte("price_from", 0)
    .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("specialists.is_active", true)
    .eq("specialists.is_visible", true);

  if (servicesError) {
    throw servicesError;
  }

  const normalizedServiceRows = ((serviceRows ?? []) as ServiceCategoryRow[]).filter(
    (
      row
    ): row is ServiceCategoryRow & {
      specialist_id: string;
      category_id: string;
    } =>
      typeof row.specialist_id === "string" &&
      typeof row.category_id === "string"
  );

  if (normalizedServiceRows.length === 0) return new Map<string, number>();

  const seenPairs = new Set<string>();
  const counts = new Map<string, number>();

  for (const row of normalizedServiceRows) {
    const specialist = Array.isArray(row.specialists)
      ? row.specialists[0] ?? null
      : row.specialists ?? null;
    if (!specialist || specialist.is_test === true) continue;
    const pairKey = `${row.category_id}:${row.specialist_id}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return counts;
}
