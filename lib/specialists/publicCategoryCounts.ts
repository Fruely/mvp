import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

type ServiceRow = {
  category_id: string | null;
  specialist_id: string | null;
  specialists?: { is_test?: boolean | null } | Array<{ is_test?: boolean | null }> | null;
};

export async function getPublicSpecialistCountsByServiceCategory(
  supabase: SupabaseLike,
  categoryIds: string[]
): Promise<Map<string, number>> {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
  if (uniqueCategoryIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabase
    .from("specialist_services")
    .select(`
    category_id,
    specialist_id,
    specialists!inner (
      status,
      is_active,
      is_visible,
      is_test
    )
  `)
    .in("category_id", uniqueCategoryIds)
    .eq("is_active", true)
    .gte("price_from", 0)
    .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("specialists.is_active", true)
    .eq("specialists.is_visible", true)
    .eq("specialists.billing_visibility_blocked", false)
    .or("is_test.is.null,is_test.eq.false", { referencedTable: "specialists" });

  if (error) {
    throw error;
  }

  const seenPairs = new Set<string>();
  const counts = new Map<string, number>();

  for (const row of (data ?? []) as ServiceRow[]) {
    const specialist = Array.isArray(row.specialists)
      ? row.specialists[0] ?? null
      : row.specialists ?? null;
    if (specialist?.is_test === true) continue;

    const categoryId = row.category_id;
    const specialistId = row.specialist_id;
    if (!categoryId || !specialistId) continue;

    const pairKey = `${categoryId}:${specialistId}`;
    if (seenPairs.has(pairKey)) continue;

    seenPairs.add(pairKey);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }

  return counts;
}
