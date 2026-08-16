import {
  CLIENT_REQUEST_HISTORY_DEFAULT_LIMIT,
  CLIENT_REQUEST_HISTORY_MAX_LIMIT,
  type ClientRequestKind,
} from "@/lib/clientRequests/constants";

const SUMMARY_MAX_LEN = 160;

export type ClientRequestHistoryItem = {
  kind: ClientRequestKind;
  id: string;
  created_at: string;
  status: string;
  title: string;
  summary: string | null;
  specialist_name: string | null;
  specialist_slug: string | null;
  category_label: string | null;
  work_format: string | null;
  location_label: string | null;
  preferred_language: string | null;
};

export type ClientRequestHistoryDetail = ClientRequestHistoryItem & {
  message: string | null;
  description: string | null;
  public_id: string | null;
};

export function normalizeHistoryLimit(value: unknown): number {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return CLIENT_REQUEST_HISTORY_DEFAULT_LIMIT;
  }

  return Math.min(parsed, CLIENT_REQUEST_HISTORY_MAX_LIMIT);
}

export function excerptText(value: unknown, maxLen = SUMMARY_MAX_LEN): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function buildLocationLabel(city: unknown, postalCode: unknown): string | null {
  const cityText = typeof city === "string" ? city.trim() : "";
  const postalText = typeof postalCode === "string" ? postalCode.trim() : "";

  if (cityText && postalText) return `${postalText} ${cityText}`;
  if (cityText) return cityText;
  if (postalText) return postalText;
  return null;
}

export function mapLeadHistoryRow(row: Record<string, unknown>): ClientRequestHistoryItem {
  const specialist =
    row.specialists && typeof row.specialists === "object"
      ? (row.specialists as Record<string, unknown>)
      : null;
  const category =
    specialist?.categories && typeof specialist.categories === "object"
      ? (specialist.categories as Record<string, unknown>)
      : null;

  const specialistName =
    typeof specialist?.name === "string" && specialist.name.trim() ? specialist.name.trim() : null;
  const specialistSlug =
    typeof specialist?.slug === "string" && specialist.slug.trim() ? specialist.slug.trim() : null;
  const categoryLabel =
    typeof category?.title === "string" && category.title.trim() ? category.title.trim() : null;

  return {
    kind: "lead",
    id: String(row.id),
    created_at: String(row.created_at),
    status: typeof row.status === "string" ? row.status : "new",
    title: specialistName ?? categoryLabel ?? "Specialist request",
    summary: excerptText(row.message),
    specialist_name: specialistName,
    specialist_slug: specialistSlug,
    category_label: categoryLabel,
    work_format: null,
    location_label: null,
    preferred_language: null,
  };
}

export function mapServiceRequestHistoryRow(row: Record<string, unknown>): ClientRequestHistoryItem {
  const categoryText =
    typeof row.category_text === "string" && row.category_text.trim()
      ? row.category_text.trim()
      : null;

  return {
    kind: "service_request",
    id: String(row.public_id),
    created_at: String(row.created_at),
    status: typeof row.status === "string" ? row.status : "new",
    title: categoryText ?? "Assisted matching request",
    summary: excerptText(row.description),
    specialist_name: null,
    specialist_slug: null,
    category_label: categoryText,
    work_format: typeof row.work_format === "string" ? row.work_format : null,
    location_label: buildLocationLabel(row.city, row.postal_code),
    preferred_language:
      typeof row.preferred_language === "string" ? row.preferred_language : null,
  };
}

export function mergeHistoryItems(items: ClientRequestHistoryItem[]): ClientRequestHistoryItem[] {
  return [...items].sort((left, right) => {
    const createdCompare = right.created_at.localeCompare(left.created_at);
    if (createdCompare !== 0) return createdCompare;
    const kindCompare = left.kind.localeCompare(right.kind);
    if (kindCompare !== 0) return kindCompare;
    return left.id.localeCompare(right.id);
  });
}

export type HistoryCursor = {
  created_at: string;
  kind: ClientRequestKind;
  id: string;
};

export function encodeHistoryCursor(cursor: HistoryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeHistoryCursor(value: unknown): HistoryCursor | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as HistoryCursor;
    if (
      typeof parsed.created_at === "string" &&
      (parsed.kind === "lead" || parsed.kind === "service_request") &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function itemIsBeforeCursor(item: ClientRequestHistoryItem, cursor: HistoryCursor): boolean {
  if (item.created_at < cursor.created_at) return true;
  if (item.created_at > cursor.created_at) return false;
  if (item.kind < cursor.kind) return true;
  if (item.kind > cursor.kind) return false;
  return item.id < cursor.id;
}

export function paginateHistoryItems(
  items: ClientRequestHistoryItem[],
  limit: number,
): { items: ClientRequestHistoryItem[]; next_cursor: string | null } {
  const page = items.slice(0, limit);
  if (items.length <= limit || page.length === 0) {
    return { items: page, next_cursor: null };
  }

  const last = page[page.length - 1];
  return {
    items: page,
    next_cursor: encodeHistoryCursor({
      created_at: last.created_at,
      kind: last.kind,
      id: last.id,
    }),
  };
}

export function toClientSafeHistoryDetail(
  item: ClientRequestHistoryItem,
  extras: { message?: unknown; description?: unknown; public_id?: unknown },
): ClientRequestHistoryDetail {
  return {
    ...item,
    message: typeof extras.message === "string" ? extras.message : null,
    description: typeof extras.description === "string" ? extras.description : null,
    public_id:
      typeof extras.public_id === "string" && extras.public_id.trim()
        ? extras.public_id.trim()
        : item.kind === "service_request"
          ? item.id
          : null,
  };
}
