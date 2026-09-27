import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalizeLanguages } from "@/lib/matching/languages";
import { openOwnMatch } from "./respond";
import type { MatchResponseStatus } from "./policy";

/**
 * Columns a specialist may see before any later access decision.
 * Contact and account fields are intentionally absent from this list.
 */
export const MATCH_PREVIEW_REQUEST_COLUMNS = [
  "id",
  "requested_service",
  "category_text",
  "description",
  "city",
  "postal_code",
  "work_format",
  "service_languages",
  "client_budget_text",
  "created_at",
  "service_timing_type",
  "service_timing_date",
  "service_timing_time",
  "service_timing_date_end",
  "service_timing_period",
  "service_timing_note",
].join(", ");

const MATCH_COLUMNS =
  "id, specialist_id, service_request_id, status, opened_at, matched_at";

const LIST_LIMIT = 50;

export type MatchPreviewTiming = {
  service_timing_type: string;
  service_timing_date: string | null;
  service_timing_time: string | null;
  service_timing_date_end: string | null;
  service_timing_period: string | null;
  service_timing_note: string | null;
};

export type MatchPreview = {
  match_id: string;
  service_request_id: string;
  match_status: MatchResponseStatus;
  service_label: string;
  description: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  service_languages: string[];
  client_budget_text: string | null;
  timing: MatchPreviewTiming | null;
  created_at: string | null;
  matched_at: string | null;
  opened: boolean;
};

type LoadResult =
  | { status: "ready"; preview: MatchPreview }
  | { status: "not_found" }
  | { status: "forbidden" }
  | { status: "error" };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStatus(value: unknown): MatchResponseStatus {
  if (
    value === "interested" ||
    value === "declined" ||
    value === "expired" ||
    value === "selected" ||
    value === "not_selected" ||
    value === "active"
  ) {
    return value;
  }
  return "active";
}

/**
 * Phase A rule: a generic flexible period with no note is the extractor
 * default, not a time the person stated. Bare `asap` is the same case.
 */
export function explicitMatchTiming(row: Record<string, unknown>): MatchPreviewTiming | null {
  const type = asString(row.service_timing_type);
  if (
    type !== "asap" &&
    type !== "exact_datetime" &&
    type !== "date_flexible" &&
    type !== "date_range" &&
    type !== "flexible_period"
  ) {
    return null;
  }

  const date = asString(row.service_timing_date);
  const time = asString(row.service_timing_time);
  const dateEnd = asString(row.service_timing_date_end);
  const period = asString(row.service_timing_period);
  const note = asString(row.service_timing_note);
  const genericFlexible =
    type === "flexible_period" &&
    (period === "flexible" || !period) &&
    !date &&
    !time &&
    !dateEnd &&
    !note;
  if (genericFlexible || (type === "asap" && !note)) return null;

  const statedPeriod =
    period === "next_week" || period === "next_month" || period === "flexible" ? period : null;
  const hasStructure =
    Boolean(note) ||
    Boolean(date) ||
    Boolean(time) ||
    Boolean(dateEnd) ||
    (type === "flexible_period" && (statedPeriod === "next_week" || statedPeriod === "next_month"));
  if (!hasStructure) return null;

  return {
    service_timing_type: type,
    service_timing_date: date,
    service_timing_time: time,
    service_timing_date_end: dateEnd,
    service_timing_period: statedPeriod,
    service_timing_note: note,
  };
}

export function toMatchPreview(match: Record<string, unknown>, request: Record<string, unknown>): MatchPreview {
  return {
    match_id: String(match.id),
    service_request_id: String(match.service_request_id),
    match_status: asStatus(match.status),
    service_label: asString(request.requested_service) ?? asString(request.category_text) ?? "",
    description: asString(request.description),
    work_format: asString(request.work_format),
    city: asString(request.city),
    postal_code: asString(request.postal_code),
    service_languages: canonicalizeLanguages(
      Array.isArray(request.service_languages)
        ? request.service_languages.filter((item): item is string => typeof item === "string")
        : [],
    ),
    client_budget_text: asString(request.client_budget_text),
    timing: explicitMatchTiming(request),
    created_at: asString(request.created_at),
    matched_at: asString(match.matched_at),
    opened: Boolean(asString(match.opened_at)),
  };
}

export async function loadOwnedMatchPreview(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string },
): Promise<LoadResult> {
  try {
    const match = await supabase
      .from("service_request_matches")
      .select(MATCH_COLUMNS)
      .eq("id", input.matchId)
      .maybeSingle();
    if (match.error) return { status: "error" };
    if (!match.data?.id) return { status: "not_found" };
    if (String(match.data.specialist_id) !== input.specialistId) return { status: "forbidden" };

    const request = await supabase
      .from("service_requests")
      .select(MATCH_PREVIEW_REQUEST_COLUMNS)
      .eq("id", match.data.service_request_id)
      .maybeSingle();
    if (request.error || !request.data) return { status: "error" };

    return {
      status: "ready",
      preview: toMatchPreview(
        match.data as unknown as Record<string, unknown>,
        request.data as unknown as Record<string, unknown>,
      ),
    };
  } catch {
    return { status: "error" };
  }
}

/** Loads the owned preview, then marks the match and inbox rows opened. */
export async function readOwnedMatchPreview(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string; userId: string },
): Promise<LoadResult> {
  const loaded = await loadOwnedMatchPreview(supabase, input);
  if (loaded.status !== "ready") return loaded;
  const opened = await openOwnMatch(supabase, input);
  if ("error" in opened) return { status: opened.error };
  return { status: "ready", preview: { ...loaded.preview, opened: true } };
}

export async function listOwnedActiveMatchPreviews(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<{ status: "ready"; items: MatchPreview[] } | { status: "error" }> {
  try {
    const matches = await supabase
      .from("service_request_matches")
      .select(MATCH_COLUMNS)
      .eq("specialist_id", specialistId)
      .eq("status", "active")
      .order("matched_at", { ascending: false })
      .limit(LIST_LIMIT);
    if (matches.error) return { status: "error" };
    const rows = (matches.data ?? []) as unknown as Record<string, unknown>[];
    const requestIds = rows
      .map((row) => (typeof row.service_request_id === "string" ? row.service_request_id : null))
      .filter((id): id is string => Boolean(id));
    if (!requestIds.length) return { status: "ready", items: [] };

    const requests = await supabase
      .from("service_requests")
      .select(MATCH_PREVIEW_REQUEST_COLUMNS)
      .in("id", requestIds);
    if (requests.error) return { status: "error" };
    const byId = new Map(
      ((requests.data ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.id), row]),
    );
    const items = rows
      .flatMap((match) => {
        const request = byId.get(String(match.service_request_id));
        return request ? [toMatchPreview(match, request)] : [];
      })
      .sort((a, b) => (b.matched_at ?? "").localeCompare(a.matched_at ?? ""))
      .slice(0, LIST_LIMIT);
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
