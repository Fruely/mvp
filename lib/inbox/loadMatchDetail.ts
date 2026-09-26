import type { SupabaseClient } from "@supabase/supabase-js";
import { formatServiceTimingDisplay, type ServiceTimingFields } from "@/lib/serviceRequests/serviceTiming";
import type { MatchReasonCode } from "@/lib/matching/eligibility";
import { canonicalizeLanguages } from "@/lib/matching/languages";
import type { MatchResponseStatus } from "./policy";

const REQUEST_COLUMNS = [
  "id",
  "requested_service",
  "category_text",
  "city",
  "work_format",
  "service_languages",
  "created_at",
  "service_timing_type",
  "service_timing_date",
  "service_timing_time",
  "service_timing_date_end",
  "service_timing_period",
  "service_timing_note",
].join(", ");

export type MatchDetail = {
  matchId: string;
  title: string;
  city: string | null;
  workFormat: string | null;
  serviceLanguages: string[];
  timingLabel: string;
  createdAt: string;
  reasons: MatchReasonCode[];
  status: MatchResponseStatus;
  openedAt: string | null;
  respondedAt: string | null;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStatus(value: unknown): MatchResponseStatus {
  if (value === "interested" || value === "declined" || value === "expired" || value === "selected" || value === "not_selected") return value;
  return "active";
}

function asReasons(value: unknown): MatchReasonCode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MatchReasonCode =>
      item === "category_match" ||
      item === "language_match" ||
      item === "format_match" ||
      item === "location_match" ||
      item === "location_not_required",
  );
}

export async function loadMatchDetail(
  supabase: SupabaseClient,
  input: { matchId: string; specialistId: string; lang: "ru" | "ua" | "de" },
): Promise<{ status: "ready"; detail: MatchDetail } | { status: "not_found" } | { status: "forbidden" } | { status: "error" }> {
  try {
    const match = await supabase
      .from("service_request_matches")
      .select("id, specialist_id, service_request_id, match_reasons, status, opened_at, responded_at, matched_at")
      .eq("id", input.matchId)
      .maybeSingle();
    if (match.error) return { status: "error" };
    if (!match.data?.id) return { status: "not_found" };
    if (String(match.data.specialist_id) !== input.specialistId) return { status: "forbidden" };

    const request = await supabase
      .from("service_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", match.data.service_request_id)
      .maybeSingle();
    if (request.error || !request.data) return { status: "error" };
    const row = request.data as unknown as Record<string, unknown>;
    const timing: ServiceTimingFields = {
      service_timing_type: (asString(row.service_timing_type) ?? "flexible_period") as ServiceTimingFields["service_timing_type"],
      service_timing_date: asString(row.service_timing_date),
      service_timing_time: asString(row.service_timing_time),
      service_timing_date_end: asString(row.service_timing_date_end),
      service_timing_period: asString(row.service_timing_period) as ServiceTimingFields["service_timing_period"],
      service_timing_note: asString(row.service_timing_note),
    };
    const languages = canonicalizeLanguages(
      Array.isArray(row.service_languages)
        ? row.service_languages.filter((item): item is string => typeof item === "string")
        : [],
    );
    return {
      status: "ready",
      detail: {
        matchId: String(match.data.id),
        title: asString(row.requested_service) ?? asString(row.category_text) ?? "",
        city: asString(row.work_format) === "online" ? null : asString(row.city),
        workFormat: asString(row.work_format),
        serviceLanguages: languages,
        timingLabel: formatServiceTimingDisplay(timing, input.lang === "ua" ? "ua" : input.lang),
        createdAt: asString(row.created_at) ?? asString(match.data.matched_at) ?? "",
        reasons: asReasons(match.data.match_reasons),
        status: asStatus(match.data.status),
        openedAt: asString(match.data.opened_at),
        respondedAt: asString(match.data.responded_at),
      },
    };
  } catch {
    return { status: "error" };
  }
}
