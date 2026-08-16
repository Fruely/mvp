import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildLeadHistoryPaginationOrFilter,
  buildServiceRequestHistoryPaginationOrFilter,
  decodeHistoryCursor,
  mapLeadHistoryRow,
  mapServiceRequestHistoryRow,
  mergeHistoryItems,
  normalizeHistoryLimit,
  paginateHistoryItems,
  toClientSafeHistoryDetail,
  type ClientRequestHistoryDetail,
  type ClientRequestHistoryItem,
  type HistoryCursor,
} from "@/lib/clientRequests/historyMapper";

const LEAD_HISTORY_SELECT =
  "id, created_at, status, message, specialists(id, name, slug, categories(title))";

const SERVICE_REQUEST_HISTORY_SELECT =
  "public_id, created_at, status, category_text, description, preferred_language, work_format, city, postal_code";

export async function listClientRequestHistory(
  supabase: SupabaseClient,
  userId: string,
  params: { limit?: unknown; cursor?: unknown },
): Promise<{ items: ClientRequestHistoryItem[]; next_cursor: string | null }> {
  const limit = normalizeHistoryLimit(params.limit);
  const cursor = decodeHistoryCursor(params.cursor);
  const fetchLimit = limit + 1;

  const [leadsResult, serviceRequestsResult] = await Promise.all([
    fetchLeadHistoryRows(supabase, userId, cursor, fetchLimit),
    fetchServiceRequestHistoryRows(supabase, userId, cursor, fetchLimit),
  ]);

  if (leadsResult.error || serviceRequestsResult.error) {
    throw new Error("history_query_failed");
  }

  const merged = mergeHistoryItems([
    ...(leadsResult.data ?? []).map((row) => mapLeadHistoryRow(row as Record<string, unknown>)),
    ...(serviceRequestsResult.data ?? []).map((row) =>
      mapServiceRequestHistoryRow(row as Record<string, unknown>),
    ),
  ]);

  return paginateHistoryItems(merged, limit);
}

async function fetchLeadHistoryRows(
  supabase: SupabaseClient,
  userId: string,
  cursor: HistoryCursor | null,
  fetchLimit: number,
) {
  let query = supabase
    .from("leads")
    .select(LEAD_HISTORY_SELECT)
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(fetchLimit);

  if (cursor) {
    query = query.or(buildLeadHistoryPaginationOrFilter(cursor));
  }

  return query;
}

async function fetchServiceRequestHistoryRows(
  supabase: SupabaseClient,
  userId: string,
  cursor: HistoryCursor | null,
  fetchLimit: number,
) {
  let query = supabase
    .from("service_requests")
    .select(SERVICE_REQUEST_HISTORY_SELECT)
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false })
    .order("public_id", { ascending: true })
    .limit(fetchLimit);

  if (cursor) {
    query = query.or(buildServiceRequestHistoryPaginationOrFilter(cursor));
  }

  return query;
}

export async function getClientRequestHistoryDetail(
  supabase: SupabaseClient,
  userId: string,
  kind: "lead" | "service_request",
  id: string,
): Promise<ClientRequestHistoryDetail | null> {
  if (kind === "lead") {
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_HISTORY_SELECT)
      .eq("client_user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const item = mapLeadHistoryRow(data as Record<string, unknown>);
    return toClientSafeHistoryDetail(item, { message: data.message });
  }

  const { data, error } = await supabase
    .from("service_requests")
    .select(SERVICE_REQUEST_HISTORY_SELECT)
    .eq("client_user_id", userId)
    .eq("public_id", id)
    .maybeSingle();

  if (error || !data) return null;

  const item = mapServiceRequestHistoryRow(data as Record<string, unknown>);
  return toClientSafeHistoryDetail(item, {
    description: data.description,
    public_id: data.public_id,
  });
}
