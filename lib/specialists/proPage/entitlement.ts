import type {
  ProPageSectionItem,
  ProPageStatus,
  PublicProPageContent,
  SpecialistProEntitlementRow,
  SpecialistProPageRow,
} from "@/lib/specialists/proPage/types";

export function hasActiveProEntitlement(
  entitlement: Pick<SpecialistProEntitlementRow, "is_active"> | null | undefined,
): boolean {
  return entitlement?.is_active === true;
}

export function isPublishedProPage(
  page: Pick<SpecialistProPageRow, "status"> | null | undefined,
): boolean {
  return page?.status === "published";
}

/** Pro Page rendering gate — independent of specialist_plan / plan_code. */
export function shouldRenderProPage(
  entitlement: Pick<SpecialistProEntitlementRow, "is_active"> | null | undefined,
  page: Pick<SpecialistProPageRow, "status"> | null | undefined,
): boolean {
  return hasActiveProEntitlement(entitlement) && isPublishedProPage(page);
}

export function parseProPageSectionItems(value: unknown): ProPageSectionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title.trim() : "";
      const description =
        typeof record.description === "string" ? record.description.trim() : "";
      if (!title) return null;
      return { title, description };
    })
    .filter((item): item is ProPageSectionItem => item != null);
}

export function normalizeProPageStatus(value: unknown): ProPageStatus | null {
  return value === "draft" || value === "published" ? value : null;
}

/** Pro hero/metadata name: optional Pro override, else canonical specialists.name. */
export function resolveProPageDisplayName(
  canonicalName: string | null | undefined,
  proDisplayName: string | null | undefined,
): string | null {
  const override = proDisplayName?.trim();
  if (override) return override;
  const canonical = canonicalName?.trim();
  return canonical || null;
}

export function mapProPageRow(row: SpecialistProPageRow): PublicProPageContent {
  return {
    displayName: row.display_name?.trim() || null,
    professionLabel: row.profession_label?.trim() || null,
    positioning: row.positioning?.trim() || null,
    clientRequests: parseProPageSectionItems(row.client_requests),
    workProcess: parseProPageSectionItems(row.work_process),
    whyMe: parseProPageSectionItems(row.why_me),
    story: row.story?.trim() || null,
    clientLanguage: row.client_language?.trim() || null,
  };
}

/** Gifted/admin Pro entitlements stay valid regardless of specialist_plan billing state. */
export function proEntitlementIndependentOfBilling(
  entitlement: Pick<SpecialistProEntitlementRow, "is_active" | "source"> | null,
): boolean {
  if (!entitlement || !hasActiveProEntitlement(entitlement)) return false;
  return entitlement.source === "gifted" || entitlement.source === "admin_granted";
}
