import type { DashboardLead } from "@/lib/leads/contactUnlock";
import type { SpecialistLeadApiItem } from "./types";

export function mapDashboardLeadToApiItem(lead: DashboardLead): SpecialistLeadApiItem {
  return {
    id: lead.id,
    created_at: lead.created_at,
    status: lead.status,
    public_id: lead.public_id,
    contacts_unlocked: lead.contacts_unlocked,
    contact_available: lead.contacts_unlocked,
    message_preview: lead.message_preview,
    client_name: lead.client_name,
    client_email: lead.client_email,
    client_phone: lead.client_phone,
    message: lead.message,
    source: lead.source,
    source_path: lead.source_path,
    contact_unlocked_at: lead.contact_unlocked_at,
  };
}

/** Contract guard — no internal/client ownership fields in API DTO. */
export function assertClientSafeSpecialistLeadDto(item: SpecialistLeadApiItem): SpecialistLeadApiItem {
  const allowed = new Set([
    "id",
    "created_at",
    "status",
    "public_id",
    "contacts_unlocked",
    "contact_available",
    "message_preview",
    "client_name",
    "client_email",
    "client_phone",
    "message",
    "source",
    "source_path",
    "contact_unlocked_at",
  ]);

  for (const key of Object.keys(item)) {
    if (!allowed.has(key)) {
      throw new Error(`unsafe specialist lead field: ${key}`);
    }
  }

  return item;
}

export function leadIsAfterCursor(
  lead: { created_at: string | null; id: string },
  cursor: { created_at: string; id: string },
): boolean {
  const createdAt = lead.created_at ?? "";
  if (createdAt < cursor.created_at) return true;
  if (createdAt > cursor.created_at) return false;
  return lead.id > cursor.id;
}

export type SpecialistLeadCursor = {
  created_at: string;
  id: string;
};

export function encodeSpecialistLeadCursor(cursor: SpecialistLeadCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeSpecialistLeadCursor(value: unknown): SpecialistLeadCursor | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SpecialistLeadCursor;
    if (typeof parsed.created_at === "string" && typeof parsed.id === "string") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildSpecialistLeadPaginationOrFilter(cursor: SpecialistLeadCursor): string {
  const timestamp = cursor.created_at;
  return `created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.gt.${cursor.id})`;
}

export function normalizeSpecialistLeadLimit(value: unknown, defaultLimit = 20, maxLimit = 50): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
}

export function isAllowedSpecialistLeadStatusFilter(
  value: string | null | undefined,
): value is "new" | "accepted" | "contacted" | "closed" {
  return value === "new" || value === "accepted" || value === "contacted" || value === "closed";
}
