import type { SupabaseClient } from "@supabase/supabase-js";
import { formatServiceTimingDisplay } from "@/lib/serviceRequests/serviceTiming";
import type { ServiceTimingFields } from "@/lib/serviceRequests/serviceTiming";
import type { MatchReasonCode } from "./eligibility";
import { canonicalizeLanguages } from "./languages";

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

export type MatchedRequestCard = {
  matchId: string;
  serviceRequestId: string;
  title: string;
  city: string | null;
  workFormat: string | null;
  serviceLanguages: string[];
  timingLabel: string;
  createdAt: string;
  reasons: MatchReasonCode[];
};

export type MatchedRequestsModel =
  | { status: "ready"; items: MatchedRequestCard[] }
  | { status: "empty" }
  | { status: "error" };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asReasons(value: unknown): MatchReasonCode[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MatchReasonCode =>
    item === "category_match" ||
    item === "language_match" ||
    item === "format_match" ||
    item === "location_match" ||
    item === "location_not_required",
  );
}

export async function loadMatchedRequests(
  supabase: SupabaseClient,
  input: { specialistId: string; lang: "ru" | "ua" | "de" },
): Promise<MatchedRequestsModel> {
  const { data: matches, error } = await supabase
    .from("service_request_matches")
    .select("id, service_request_id, match_reasons, matched_at, status")
    .eq("specialist_id", input.specialistId)
    .eq("status", "active")
    .order("matched_at", { ascending: false })
    .limit(50);

  if (error) return { status: "error" };
  if (!matches?.length) return { status: "empty" };

  const requestIds = matches.map((row) => String(row.service_request_id));
  const { data: requests, error: requestError } = await supabase
    .from("service_requests")
    .select(REQUEST_COLUMNS)
    .in("id", requestIds);

  if (requestError) return { status: "error" };
  const requestRows = (requests ?? []) as unknown as Record<string, unknown>[];
  const requestById = new Map(requestRows.map((row) => [String(row.id), row]));
  const locale = input.lang === "ua" ? "ua" : input.lang;

  const items = matches.flatMap((match) => {
    const request = requestById.get(String(match.service_request_id));
    if (!request) return [];
    const timing: ServiceTimingFields = {
      service_timing_type: (asString(request.service_timing_type) ?? "flexible_period") as ServiceTimingFields["service_timing_type"],
      service_timing_date: asString(request.service_timing_date),
      service_timing_time: asString(request.service_timing_time),
      service_timing_date_end: asString(request.service_timing_date_end),
      service_timing_period: asString(request.service_timing_period) as ServiceTimingFields["service_timing_period"],
      service_timing_note: asString(request.service_timing_note),
    };
    const languages = canonicalizeLanguages(
      Array.isArray(request.service_languages)
        ? request.service_languages.filter((item): item is string => typeof item === "string")
        : [],
    );
    return [{
      matchId: String(match.id),
      serviceRequestId: String(match.service_request_id),
      title: asString(request.requested_service) ?? asString(request.category_text) ?? "",
      city: asString(request.work_format) === "online" ? null : asString(request.city),
      workFormat: asString(request.work_format),
      serviceLanguages: languages,
      timingLabel: formatServiceTimingDisplay(timing, locale),
      createdAt: asString(request.created_at) ?? String(match.matched_at),
      reasons: asReasons(match.match_reasons),
    }];
  });

  return items.length ? { status: "ready", items } : { status: "empty" };
}
