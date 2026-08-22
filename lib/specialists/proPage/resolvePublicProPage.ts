import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapProPageRow,
  shouldRenderProPage,
} from "@/lib/specialists/proPage/entitlement";
import {
  PRO_PAGE_PUBLISHED_SELECT,
  mapProPageRowFromDb,
} from "@/lib/specialists/proPage/rowMapping";
import type {
  ProEntitlementSource,
  PublicProPageBundle,
  SpecialistProEntitlementRow,
} from "@/lib/specialists/proPage/types";

function parseEntitlementSource(value: unknown): ProEntitlementSource | null {
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

export async function loadPublicProPageBundle(
  specialistId: string,
): Promise<PublicProPageBundle> {
  const supabase = createSupabaseServerClient();
  const [entitlementResult, pageResult] = await Promise.all([
    supabase
      .from("specialist_pro_entitlements")
      .select("specialist_id, source, is_active, granted_at, metadata")
      .eq("specialist_id", specialistId)
      .maybeSingle(),
    supabase
      .from("specialist_pro_pages")
      .select(PRO_PAGE_PUBLISHED_SELECT)
      .eq("specialist_id", specialistId)
      .maybeSingle(),
  ]);

  const missingTable =
    entitlementResult.error?.code === "42P01" ||
    pageResult.error?.code === "42P01" ||
    entitlementResult.error?.message?.includes("specialist_pro_entitlements") ||
    pageResult.error?.message?.includes("specialist_pro_pages");

  if (missingTable) {
    return {
      renderAsProPage: false,
      entitlementSource: null,
      content: null,
    };
  }

  if (entitlementResult.error) {
    console.error("[proPage] entitlement lookup failed", entitlementResult.error);
  }
  if (pageResult.error) {
    console.error("[proPage] page lookup failed", pageResult.error);
  }

  const entitlement = entitlementResult.data
    ? mapEntitlementRow(entitlementResult.data as Record<string, unknown>)
    : null;
  const page = pageResult.data
    ? mapProPageRowFromDb(pageResult.data as Record<string, unknown>)
    : null;

  const renderAsProPage = shouldRenderProPage(entitlement, page);

  return {
    renderAsProPage,
    entitlementSource: entitlement?.source ?? null,
    content: renderAsProPage && page ? mapProPageRow(page) : null,
  };
}

export type ProPageMetadataInput = {
  name: string | null;
  professionLabel: string | null;
  categoryTitle: string | null;
  city: string | null;
  positioning: string | null;
  lang: "ru" | "ua" | "de";
};

export function buildProPageDescription(input: ProPageMetadataInput): string | null {
  const name = input.name?.trim();
  const profession = input.professionLabel?.trim() || input.categoryTitle?.trim();
  const positioning = input.positioning?.trim();
  if (!name || !profession) return null;

  const cityPart =
    input.city?.trim() &&
    ({
      ru: ` в ${input.city.trim()}`,
      ua: ` у ${input.city.trim()}`,
      de: ` in ${input.city.trim()}`,
    }[input.lang]);

  const base = {
    ru: `${name} — ${profession}${cityPart ?? ""}.`,
    ua: `${name} — ${profession}${cityPart ?? ""}.`,
    de: `${name} — ${profession}${cityPart ?? ""}.`,
  }[input.lang];

  if (positioning) {
    const trimmed = positioning.length > 180 ? `${positioning.slice(0, 177)}…` : positioning;
    return `${base} ${trimmed}`;
  }
  return base;
}
