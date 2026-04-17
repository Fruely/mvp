import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/events
 * Thin telemetry writer for public.search_events. No auth/RLS in this phase.
 * Body is filtered to a strict whitelist; unknown keys are ignored.
 */

type InsertPayload = {
  session_id?: string | null;
  event_type: string;
  lang_ui?: string | null;
  lang_filter?: string | null;
  query_raw?: string | null;
  selected_category_id?: string | null;
  selected_via?: string | null;
  place_query?: string | null;
  results_count?: number | null;
  had_zero_results?: boolean;
  clicked_specialist_id?: string | null;
  route_target?: string | null;
  metadata?: Record<string, unknown>;
};

function nullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return jsonNoStore({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const eventTypeRaw = body.event_type;
  if (typeof eventTypeRaw !== "string" || eventTypeRaw.trim().length === 0) {
    return jsonNoStore({ error: "event_type is required" }, { status: 400 });
  }

  const payload: InsertPayload = {
    event_type: eventTypeRaw.trim(),
  };

  const sessionId = nullableString(body.session_id);
  if (sessionId !== undefined) payload.session_id = sessionId;

  const langUi = nullableString(body.lang_ui);
  if (langUi !== undefined) payload.lang_ui = langUi;

  const langFilter = nullableString(body.lang_filter);
  if (langFilter !== undefined) payload.lang_filter = langFilter;

  const queryRaw = nullableString(body.query_raw);
  if (queryRaw !== undefined) payload.query_raw = queryRaw;

  const selectedCategoryId = nullableString(body.selected_category_id);
  if (selectedCategoryId !== undefined) {
    payload.selected_category_id = selectedCategoryId;
  }

  const selectedVia = nullableString(body.selected_via);
  if (selectedVia !== undefined) payload.selected_via = selectedVia;

  const placeQuery = nullableString(body.place_query);
  if (placeQuery !== undefined) payload.place_query = placeQuery;

  if (body.results_count !== undefined && body.results_count !== null) {
    const value = body.results_count;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return jsonNoStore(
        { error: "results_count must be a number >= 0" },
        { status: 400 }
      );
    }
    payload.results_count = Math.trunc(value);
  } else if (body.results_count === null) {
    payload.results_count = null;
  }

  if (body.had_zero_results !== undefined) {
    payload.had_zero_results = Boolean(body.had_zero_results);
  }

  const clickedSpecialistId = nullableString(body.clicked_specialist_id);
  if (clickedSpecialistId !== undefined) {
    payload.clicked_specialist_id = clickedSpecialistId;
  }

  const routeTarget = nullableString(body.route_target);
  if (routeTarget !== undefined) payload.route_target = routeTarget;

  if (body.metadata !== undefined) {
    if (!isPlainObject(body.metadata)) {
      return jsonNoStore(
        { error: "metadata must be a plain object" },
        { status: 400 }
      );
    }
    payload.metadata = body.metadata;
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("search_events").insert(payload);

    if (error) {
      console.error("[search/events] insert", error);
      return jsonNoStore({ error: "Failed to record event" }, { status: 500 });
    }

    return jsonNoStore({ ok: true });
  } catch (e: unknown) {
    console.error("[search/events]", e);
    return jsonNoStore({ error: "Failed to record event" }, { status: 500 });
  }
}
