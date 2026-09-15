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
  specialistServiceId: string | null;
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
 * Shadow-only pricing anchor for a generic direct lead.
 *
 * Direct leads currently target a specialist, not a specific listed service. For PPL
 * pricing observation we therefore use the highest active EUR fixed/range value in the
 * specialist's category. This intentionally estimates the commercial upside of a lead
 * without claiming that the client selected a particular service.
 *
 * `specialistServiceId` stays null because this is a pricing anchor, not a selected
 * service. Hourly pricing is not treated as total engagement value.
 */
export function deriveHighestShadowServiceValue(
  rows: readonly ShadowServiceValueRow[],
  categoryId: string | null,
): ShadowServiceValue | null {
  let highestValueCents: number | null = null;

  for (const row of rows) {
    if (!row.is_active) continue;
    if ((row.currency ?? "").toUpperCase() !== "EUR") continue;
    if (row.category_id && row.category_id !== categoryId) continue;
    if (row.pricing_type !== "fixed" && row.pricing_type !== "range") continue;

    const from = eurosToCents(row.price_from);
    if (from == null) continue;

    const candidate =
      row.pricing_type === "range" ? eurosToCents(row.price_to) : from;

    if (candidate == null || candidate < from) continue;

    if (highestValueCents == null || candidate > highestValueCents) {
      highestValueCents = candidate;
    }
  }

  if (highestValueCents == null) return null;

  return {
    specialistServiceId: null,
    estimatedServiceValueMinCents: highestValueCents,
    estimatedServiceValueMaxCents: highestValueCents,
  };
}
