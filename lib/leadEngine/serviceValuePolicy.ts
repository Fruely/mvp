export type ShadowServiceValueRow = {
  id: string;
  category_id?: string | null;
  pricing_type: string;
  price_from: number | string | null;
  price_to: number | string | null;
  currency: string | null;
  is_active: boolean;
};

export type ShadowServiceValue = {
  specialistServiceId: string;
  estimatedServiceValueMinCents: number;
  estimatedServiceValueMaxCents: number;
};

function eurosToCents(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

/**
 * Conservative shadow-only service value derivation for direct leads.
 *
 * A direct lead currently does not identify the exact specialist service chosen by the
 * client. Therefore we only use service economics when there is exactly one eligible
 * active EUR fixed/range service for the specialist/category. Hourly pricing is not
 * treated as total engagement value, and multiple eligible services are intentionally
 * considered ambiguous.
 */
export function deriveUniqueShadowServiceValue(
  rows: readonly ShadowServiceValueRow[],
  categoryId: string | null,
): ShadowServiceValue | null {
  const candidates = rows.flatMap((row) => {
    if (!row.is_active) return [];
    if ((row.currency ?? "").toUpperCase() !== "EUR") return [];
    if (row.category_id && row.category_id !== categoryId) return [];
    if (row.pricing_type !== "fixed" && row.pricing_type !== "range") return [];

    const min = eurosToCents(row.price_from);
    if (min == null) return [];

    if (row.pricing_type === "fixed") {
      return [
        {
          specialistServiceId: row.id,
          estimatedServiceValueMinCents: min,
          estimatedServiceValueMaxCents: min,
        },
      ];
    }

    const max = eurosToCents(row.price_to);
    if (max == null || max < min) return [];

    return [
      {
        specialistServiceId: row.id,
        estimatedServiceValueMinCents: min,
        estimatedServiceValueMaxCents: max,
      },
    ];
  });

  return candidates.length === 1 ? candidates[0] : null;
}
