import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

type ServiceCategoryRow = {
  specialist_id: string | null;
  category_id: string | null;
};

type SpecialistVisibilityRow = {
  id: string;
  status: string | null;
  is_active: boolean | null;
  is_visible: boolean | null;
  is_test: boolean | null;
};

export async function getPublicSpecialistCountsByServiceCategory(
  supabase: SupabaseLike,
  categoryIds: string[]
): Promise<Map<string, number>> {
  const uniqueCategoryIds = Array.from(new Set(categoryIds.filter(Boolean)));
  if (uniqueCategoryIds.length === 0) return new Map<string, number>();

  const { data: serviceRows, error: servicesError } = await supabase
    .from("specialist_services")
    .select("specialist_id, category_id")
    .in("category_id", uniqueCategoryIds)
    .eq("is_active", true)
    .gte("price_from", 0);

  if (servicesError) {
    throw servicesError;
  }

  const normalizedServiceRows = ((serviceRows ?? []) as ServiceCategoryRow[]).filter(
    (row) =>
      typeof row.specialist_id === "string" &&
      typeof row.category_id === "string"
  ) as Array<{
    specialist_id: string;
    category_id: string;
  }>;

  if (normalizedServiceRows.length === 0) return new Map<string, number>();

  const specialistIdSet = new Set(
    normalizedServiceRows.map((row) => row.specialist_id)
  );
  const publicStatuses = new Set<string>([...VISIBLE_PUBLIC_SPECIALIST_STATUSES]);

  const { data: visibleSpecialists, error: specialistsError } = await supabase
    .from("specialists")
    .select("id,status,is_active,is_visible,is_test")
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .or("is_test.is.null,is_test.eq.false");

  if (specialistsError) {
    throw specialistsError;
  }

  const visibleIdSet = new Set(
    ((visibleSpecialists ?? []) as SpecialistVisibilityRow[])
      .filter(
        (row) =>
          typeof row.id === "string" &&
          specialistIdSet.has(row.id) &&
          publicStatuses.has(row.status ?? "") &&
          row.is_active === true &&
          row.is_visible === true &&
          row.is_test !== true
      )
      .map((row) => row.id)
  );

  const seenPairs = new Set<string>();
  const counts = new Map<string, number>();

  for (const row of normalizedServiceRows) {
    if (!visibleIdSet.has(row.specialist_id)) continue;
    const pairKey = `${row.category_id}:${row.specialist_id}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return counts;
}
