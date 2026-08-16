import type { SpecialistServiceDto } from "@/lib/specialistServices/types";

export function mapServiceRow(row: Record<string, unknown>): SpecialistServiceDto {
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    description: typeof row.description === "string" ? row.description : null,
    price_comment: typeof row.price_comment === "string" ? row.price_comment : null,
    pricing_type:
      row.pricing_type === "fixed" || row.pricing_type === "range" || row.pricing_type === "hourly"
        ? row.pricing_type
        : "fixed",
    price_from: typeof row.price_from === "number" ? row.price_from : Number(row.price_from ?? 0),
    price_to:
      row.price_to == null
        ? null
        : typeof row.price_to === "number"
          ? row.price_to
          : Number(row.price_to),
    currency: typeof row.currency === "string" ? row.currency : "EUR",
    duration_minutes:
      row.duration_minutes == null
        ? null
        : typeof row.duration_minutes === "number"
          ? row.duration_minutes
          : Number(row.duration_minutes),
    is_active: row.is_active === true,
    category_id: typeof row.category_id === "string" ? row.category_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}
