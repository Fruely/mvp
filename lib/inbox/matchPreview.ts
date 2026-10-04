import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyCommercialConnection,
  loadSpecialistMatchPreviewFacts,
  type CommercialConnectionProjection,
} from "@/lib/billing/serviceRequestCommercialProjection";
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
  "selected_specialist_id",
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

export type MatchOfferState = "open" | "owned" | "unavailable";

export type MatchAccessOffer = {
  offer_id: string;
  price_cents: number | null;
  currency: "eur";
  ready: boolean;
};

export type MatchPreview = {
  match_id: string;
  service_request_id: string;
  match_status: MatchResponseStatus;
  offer_state: MatchOfferState;
  conversation_id: string | null;
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
  access_offer: MatchAccessOffer | null;
  payment_required: boolean;
  /** Authoritative reserved claim for this match. Null is fail-closed. */
  claim_id: string | null;
  commercial_connection: CommercialConnectionProjection | null;
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
    offer_state: "open",
    conversation_id: null,
    access_offer: null,
    payment_required: false,
    claim_id: null,
    commercial_connection: emptyCommercialConnection(),
  };
}

function unavailablePreview(match: Record<string, unknown>, requestId: string): MatchPreview {
  return {
    match_id: String(match.id),
    service_request_id: requestId,
    match_status: asStatus(match.status),
    offer_state: "unavailable",
    conversation_id: null,
    service_label: "",
    description: null,
    work_format: null,
    city: null,
    postal_code: null,
    service_languages: [],
    client_budget_text: null,
    timing: null,
    created_at: null,
    matched_at: null,
    opened: Boolean(asString(match.opened_at)),
    access_offer: null,
    payment_required: false,
    claim_id: null,
    commercial_connection: emptyCommercialConnection(),
  };
}

const ACCESS_OFFER_COLUMNS =
  "id, service_request_id, specialist_id, price_cents, currency, status, billing_model, offer_reason, request_kind, idempotency_key";

function accessOfferFrom(row: Record<string, unknown>, specialistId: string): MatchAccessOffer | null {
  if (String(row.specialist_id ?? "") !== specialistId) return null;
  if (row.request_kind !== "service_request" || row.offer_reason !== "matched") return null;
  if (row.billing_model !== "pay_per_lead" || row.currency !== "eur") return null;
  if (typeof row.id !== "string" || !row.id) return null;
  const price = row.price_cents;
  const live = typeof price === "number" && Number.isInteger(price) && price > 0;
  const purchasable = row.status === "offered" || row.status === "viewed" || row.status === "accepted";
  return {
    offer_id: row.id,
    price_cents: live ? price : null,
    currency: "eur",
    ready: live && purchasable,
  };
}

async function accessOffersByRequest(
  supabase: SupabaseClient,
  specialistId: string,
  requestIds: string[],
): Promise<{ byRequest: Map<string, MatchAccessOffer>; rows: Record<string, unknown>[] }> {
  const byRequest = new Map<string, MatchAccessOffer>();
  if (!requestIds.length) return { byRequest, rows: [] };
  try {
    const result = await supabase
      .from("request_offers")
      .select(ACCESS_OFFER_COLUMNS)
      .eq("specialist_id", specialistId)
      .eq("request_kind", "service_request")
      .in("service_request_id", requestIds);
    if (result.error || !Array.isArray(result.data)) return { byRequest, rows: [] };
    const rows = result.data as Record<string, unknown>[];
    for (const row of rows) {
      const requestId = typeof row.service_request_id === "string" ? row.service_request_id : null;
      const offer = requestId ? accessOfferFrom(row, specialistId) : null;
      if (!requestId || !offer) continue;
      const current = byRequest.get(requestId);
      if (!current || (offer.ready && !current.ready)) byRequest.set(requestId, offer);
    }
    return { byRequest, rows };
  } catch {
    return { byRequest, rows: [] };
  }
}

function offerStateFor(matchStatus: string, ownerId: string | null, specialistId: string): MatchOfferState {
  if (ownerId && ownerId !== specialistId) return "unavailable";
  if (matchStatus === "declined" || matchStatus === "not_selected" || matchStatus === "expired") return "unavailable";
  if (ownerId === specialistId || matchStatus === "selected") return "owned";
  if (matchStatus === "active" && !ownerId) return "open";
  return "unavailable";
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

    const requestRow = request.data as unknown as Record<string, unknown>;
    const matchRow = match.data as unknown as Record<string, unknown>;
    const ownerId = asString(requestRow.selected_specialist_id);
    const offerState = offerStateFor(String(matchRow.status ?? ""), ownerId, input.specialistId);

    let conversationId: string | null = null;
    let conversationSpecialistId: string | null = null;
    if (offerState === "owned") {
      const conversation = await supabase
        .from("conversations")
        .select("id, specialist_id")
        .eq("service_request_id", matchRow.service_request_id)
        .maybeSingle();
      if (
        conversation.data?.id &&
        String(conversation.data.specialist_id) === input.specialistId
      ) {
        conversationId = String(conversation.data.id);
        conversationSpecialistId = input.specialistId;
      }
    }

    const requestId = String(matchRow.service_request_id);
    const offers = await accessOffersByRequest(supabase, input.specialistId, [requestId]);
    const facts = await loadSpecialistMatchPreviewFacts(
      supabase,
      input.specialistId,
      [{
        matchId: String(matchRow.id),
        requestId,
        selectedSpecialistId: ownerId,
        conversationSpecialistId,
      }],
      offers.rows,
    );
    const commercialConnection = facts.commercial.get(String(matchRow.id)) ?? null;
    if (offerState === "unavailable") {
      return {
        status: "ready",
        preview: {
          ...unavailablePreview(matchRow, requestId),
          commercial_connection: commercialConnection,
        },
      };
    }
    return {
      status: "ready",
      preview: {
        ...toMatchPreview(matchRow, requestRow),
        offer_state: offerState,
        conversation_id: conversationId,
        access_offer: offers.byRequest.get(requestId) ?? null,
        payment_required: facts.paymentRequired.get(String(matchRow.id)) === true,
        claim_id: facts.claimId.get(String(matchRow.id)) ?? null,
        commercial_connection: commercialConnection,
      },
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
    const offers = await accessOffersByRequest(supabase, specialistId, requestIds);
    const visible = rows.flatMap((match) => {
      const request = byId.get(String(match.service_request_id));
      if (!request || asString(request.selected_specialist_id)) return [];
      return [{ match, request, requestId: String(match.service_request_id) }];
    });
    const facts = await loadSpecialistMatchPreviewFacts(
      supabase,
      specialistId,
      visible.map((item) => ({
        matchId: String(item.match.id),
        requestId: item.requestId,
        selectedSpecialistId: null,
        conversationSpecialistId: null,
      })),
      offers.rows,
    );
    const items = visible
      .map((item) => ({
        ...toMatchPreview(item.match, item.request),
        access_offer: offers.byRequest.get(item.requestId) ?? null,
        payment_required: facts.paymentRequired.get(String(item.match.id)) === true,
        claim_id: null,
        commercial_connection: facts.commercial.get(String(item.match.id)) ?? null,
      }))
      .sort((a, b) => (b.matched_at ?? "").localeCompare(a.matched_at ?? ""))
      .slice(0, LIST_LIMIT);
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
