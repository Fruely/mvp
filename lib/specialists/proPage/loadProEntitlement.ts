import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SpecialistProEntitlementRow } from "@/lib/specialists/proPage/types";

function parseEntitlementSource(value: unknown): SpecialistProEntitlementRow["source"] | null {
  return value === "paid" || value === "gifted" || value === "admin_granted" ? value : null;
}

function mapEntitlementRow(row: Record<string, unknown>): SpecialistProEntitlementRow | null {
  const specialistId = typeof row.specialist_id === "string" ? row.specialist_id : null;
  const source = parseEntitlementSource(row.source);
  if (!specialistId || !source) return null;
  return {
    specialist_id: specialistId,
    source,
    is_active: row.is_active === true,
    granted_at: typeof row.granted_at === "string" ? row.granted_at : new Date(0).toISOString(),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
  };
}

export async function loadSpecialistProEntitlement(
  specialistId: string,
): Promise<SpecialistProEntitlementRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("specialist_pro_entitlements")
    .select("specialist_id, source, is_active, granted_at, metadata")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error?.code === "42P01" || error?.message?.includes("specialist_pro_entitlements")) {
    return null;
  }
  if (error) {
    console.error("[proPage] entitlement lookup failed", error);
    return null;
  }

  return data ? mapEntitlementRow(data as Record<string, unknown>) : null;
}
