import type { SupabaseClient } from "@supabase/supabase-js";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import {
  evaluateMatch,
  type MatchCandidate,
  type MatchReasonCode,
  type MatchRequest,
  type MatchWorkFormat,
} from "./eligibility";
import { storedLanguageVariants } from "./languages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UPSERT_CHUNK = 200;
const ID_CHUNK = 200;

type SpecialistRow = {
  id?: string;
  category_id?: string | null;
  languages?: unknown;
  work_format?: string | null;
  postal_code?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  is_visible?: boolean | null;
  billing_visibility_blocked?: boolean | null;
  is_test?: boolean | null;
};

export type MatchingRunResult = {
  outcome: "matched" | "skipped" | "error";
  runId: string;
  serviceRequestId: string;
  candidates: number;
  matches: number;
  durationMs: number;
};

function formatsFor(workFormat: MatchWorkFormat): MatchWorkFormat[] {
  if (workFormat === "online") return ["online", "hybrid"];
  if (workFormat === "offline") return ["offline", "hybrid"];
  return ["online", "offline", "hybrid"];
}

function asLanguages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function chunk<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < values.length; index += size) out.push(values.slice(index, index + size));
  return out;
}

async function categorySpecialistIds(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("specialist_services")
    .select("specialist_id")
    .eq("category_id", categoryId)
    .eq("is_active", true);
  if (error) throw error;
  const ids: string[] = [];
  for (const row of data ?? []) {
    const id = String(row.specialist_id ?? "");
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

async function loadSpecialistRows(
  supabase: SupabaseClient,
  request: MatchRequest,
  serviceSpecialistIds: readonly string[],
): Promise<SpecialistRow[]> {
  let query = supabase
    .from("specialists")
    .select(
      "id, category_id, languages, work_format, postal_code, status, is_active, is_visible, billing_visibility_blocked, is_test",
    )
    .eq("is_active", true)
    .eq("is_visible", true)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .in("work_format", formatsFor(request.workFormat));

  const variants = storedLanguageVariants(request.serviceLanguages);
  if (variants.length > 0) query = query.overlaps("languages", variants);

  if (request.categoryId && UUID.test(request.categoryId)) {
    const safeIds = serviceSpecialistIds.filter((id) => UUID.test(id));
    const parts = [`category_id.eq.${request.categoryId}`];
    if (safeIds.length > 0) parts.push(`id.in.(${safeIds.join(",")})`);
    query = query.or(parts.join(","));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SpecialistRow[];
}

async function loadCities(
  supabase: SupabaseClient,
  specialistIds: string[],
): Promise<Map<string, string | null>> {
  const cities = new Map<string, string | null>();
  for (const ids of chunk(specialistIds, ID_CHUNK)) {
    const { data, error } = await supabase
      .from("specialist_profiles")
      .select("specialist_id, city")
      .in("specialist_id", ids);
    if (error) throw error;
    for (const row of data ?? []) {
      const id = String(row.specialist_id);
      cities.set(id, typeof row.city === "string" ? row.city : null);
    }
  }
  return cities;
}

function toCandidate(row: SpecialistRow, city: string | null, extraCategoryIds: readonly string[]): MatchCandidate | null {
  if (!row.id) return null;
  const categoryId = typeof row.category_id === "string" ? row.category_id : null;
  const categoryIds = [...(categoryId ? [categoryId] : []), ...extraCategoryIds];
  return {
    id: row.id,
    categoryIds,
    languages: asLanguages(row.languages),
    workFormat: row.work_format ?? null,
    city,
    postalCode: row.postal_code ?? null,
    status: row.status ?? null,
    isActive: row.is_active ?? null,
    isVisible: row.is_visible ?? null,
    billingVisibilityBlocked: row.billing_visibility_blocked ?? null,
    isTest: row.is_test ?? null,
  };
}

export async function matchConfirmedServiceRequest(
  supabase: SupabaseClient,
  request: MatchRequest,
): Promise<MatchingRunResult> {
  const started = Date.now();
  const runId = crypto.randomUUID();
  try {
    const serviceSpecialistIds = request.categoryId
      ? await categorySpecialistIds(supabase, request.categoryId)
      : [];
    const serviceIdSet = new Set(serviceSpecialistIds);
    const rows = await loadSpecialistRows(supabase, request, serviceSpecialistIds);
    const needsCity = request.workFormat !== "online";
    const cities = needsCity
      ? await loadCities(
          supabase,
          rows.map((row) => row.id).filter((id): id is string => Boolean(id)),
        )
      : new Map<string, string | null>();

    const matches: { specialist_id: string; match_reasons: MatchReasonCode[] }[] = [];
    for (const row of rows) {
      const extraCategory =
        request.categoryId && row.id && serviceIdSet.has(row.id) ? [request.categoryId] : [];
      const candidate = toCandidate(row, row.id ? cities.get(row.id) ?? null : null, extraCategory);
      if (!candidate) continue;
      const decision = evaluateMatch(request, candidate);
      if (!decision.eligible) continue;
      matches.push({ specialist_id: candidate.id, match_reasons: decision.reasons });
    }

    const now = new Date().toISOString();
    for (const part of chunk(matches, UPSERT_CHUNK)) {
      const { error } = await supabase.from("service_request_matches").upsert(
        part.map((match) => ({
          service_request_id: request.id,
          specialist_id: match.specialist_id,
          status: "active",
          match_reasons: match.match_reasons,
          matched_at: now,
          updated_at: now,
        })),
        { onConflict: "service_request_id,specialist_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    }

    const result: MatchingRunResult = {
      outcome: "matched",
      runId,
      serviceRequestId: request.id,
      candidates: rows.length,
      matches: matches.length,
      durationMs: Date.now() - started,
    };
    console.info("[matching] completed", result);
    return result;
  } catch (error) {
    const result: MatchingRunResult = {
      outcome: "error",
      runId,
      serviceRequestId: request.id,
      candidates: 0,
      matches: 0,
      durationMs: Date.now() - started,
    };
    console.error("[matching] failed", {
      ...result,
      name: error instanceof Error ? error.name : "Error",
    });
    return result;
  }
}
