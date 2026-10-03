import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueMatchNotifications } from "@/lib/inbox/delivery";
import { ensureMatchedServiceRequestOffers } from "@/lib/leadEngine/matchedServiceRequestOffer";
import {
  partitionEconomicEligibility,
  reconciliationFloorCents,
  shouldKeepBudgetDecline,
  effectiveClientMaximumCents,
  nonNegativeIntegerCents,
  type ServiceEconomicFloor,
} from "./budgetGate";
import {
  evaluateMatch,
  type MatchCandidate,
  type MatchReasonCode,
  type MatchRequest,
  type MatchWorkFormat,
} from "./eligibility";
import { storedLanguageVariants } from "./languages";
import { serviceMeaningsCompatible } from "./serviceMeaning";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UPSERT_CHUNK = 200;
const ID_CHUNK = 200;

type SpecialistRow = {
  id?: string;
  user_id?: string | null;
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

export type BudgetReconciliationOffer = {
  required: true;
  minimum_budget_cents: number;
  currency: "eur";
};

export type MatchingRunResult = {
  outcome: "matched" | "skipped" | "error";
  runId: string;
  serviceRequestId: string;
  candidates: number;
  matches: number;
  durationMs: number;
  budgetReconciliation: BudgetReconciliationOffer | null;
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

async function loadCategoryServiceFloors(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<Map<string, ServiceEconomicFloor[]>> {
  const floors = new Map<string, ServiceEconomicFloor[]>();
  const { data, error } = await supabase
    .from("specialist_services")
    .select("specialist_id, minimum_order_cents, currency")
    .eq("category_id", categoryId)
    .eq("is_active", true);
  if (error) throw error;
  for (const row of data ?? []) {
    const id = String(row.specialist_id ?? "");
    if (!id) continue;
    const current = floors.get(id) ?? [];
    current.push({
      minimumOrderCents: nonNegativeIntegerCents(row.minimum_order_cents),
      currency: typeof row.currency === "string" ? row.currency : null,
    });
    floors.set(id, current);
  }
  return floors;
}

type RequestEconomy = {
  text: string | null;
  acceptedCents: number | null;
  requiredCents: number | null;
  declinedAt: string | null;
};

async function loadRequestEconomy(
  supabase: SupabaseClient,
  requestId: string,
): Promise<RequestEconomy> {
  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "client_budget_text, budget_reconciliation_accepted_cents, budget_reconciliation_required_cents, budget_reconciliation_declined_at",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return {
    text: typeof data?.client_budget_text === "string" ? data.client_budget_text : null,
    acceptedCents: nonNegativeIntegerCents(data?.budget_reconciliation_accepted_cents),
    requiredCents: nonNegativeIntegerCents(data?.budget_reconciliation_required_cents),
    declinedAt:
      typeof data?.budget_reconciliation_declined_at === "string"
        ? data.budget_reconciliation_declined_at
        : null,
  };
}

type ServiceOfferRow = {
  specialist_id?: string;
  title?: string | null;
  minimum_order_cents?: unknown;
  currency?: string | null;
  is_active?: boolean | null;
};

async function loadActiveServiceOffers(supabase: SupabaseClient): Promise<ServiceOfferRow[]> {
  const { data, error } = await supabase
    .from("specialist_services")
    .select("specialist_id, title, minimum_order_cents, currency, is_active")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as ServiceOfferRow[];
}

/**
 * Freuly row loader. Publication columns are read so the adapter can ignore
 * them; they are not eligibility filters.
 */
async function loadSpecialistRows(
  supabase: SupabaseClient,
  request: MatchRequest,
  serviceSpecialistIds: readonly string[],
  meaningSpecialistIds: readonly string[] | null,
): Promise<SpecialistRow[]> {
  let query = supabase
    .from("specialists")
    .select(
      "id, user_id, category_id, languages, work_format, postal_code, status, is_active, is_visible, billing_visibility_blocked, is_test",
    )
    .in("work_format", formatsFor(request.workFormat));

  const variants = storedLanguageVariants(request.serviceLanguages);
  if (variants.length > 0) query = query.overlaps("languages", variants);

  if (meaningSpecialistIds) {
    query = query.in("id", meaningSpecialistIds);
  } else if (request.categoryId && UUID.test(request.categoryId)) {
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

async function loadActiveInstallationUserIds(
  supabase: SupabaseClient,
  userIds: readonly string[],
): Promise<Set<string>> {
  const active = new Set<string>();
  for (const ids of chunk([...userIds], ID_CHUNK)) {
    const { data, error } = await supabase
      .from("native_installations")
      .select("user_id, active")
      .in("user_id", ids)
      .eq("active", true);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.active === true && typeof row.user_id === "string" && row.user_id) active.add(row.user_id);
    }
  }
  return active;
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
  env: NodeJS.ProcessEnv = process.env,
): Promise<MatchingRunResult> {
  const started = Date.now();
  const runId = crypto.randomUUID();
  try {
    const meaning = request.meaning?.trim() ?? "";
    const offerFacts = new Map<string, { meaning: string; active: boolean }[]>();
    let serviceFloors = new Map<string, ServiceEconomicFloor[]>();
    if (meaning) {
      const offerRows = await loadActiveServiceOffers(supabase);
      for (const row of offerRows) {
        const id = String(row.specialist_id ?? "");
        const title = typeof row.title === "string" ? row.title : "";
        if (!id || row.is_active === false || !serviceMeaningsCompatible(meaning, title)) continue;
        const floors = serviceFloors.get(id) ?? [];
        floors.push({
          minimumOrderCents: nonNegativeIntegerCents(row.minimum_order_cents),
          currency: typeof row.currency === "string" ? row.currency : null,
        });
        serviceFloors.set(id, floors);
        const facts = offerFacts.get(id) ?? [];
        facts.push({ meaning: title, active: true });
        offerFacts.set(id, facts);
      }
    } else if (request.categoryId) {
      serviceFloors = await loadCategoryServiceFloors(supabase, request.categoryId);
    }
    const serviceSpecialistIds: string[] = [];
    serviceFloors.forEach((_floors, specialistId) => {
      serviceSpecialistIds.push(specialistId);
    });
    const serviceIdSet = new Set(serviceSpecialistIds);
    const economy = await loadRequestEconomy(supabase, request.id);
    const clientMaxCents = effectiveClientMaximumCents({
      clientBudgetText: economy.text,
      acceptedCents: economy.acceptedCents,
    });
    const rows =
      !meaning && !request.categoryId
        ? []
        : meaning && offerFacts.size === 0
          ? []
          : await loadSpecialistRows(
              supabase,
              request,
              serviceSpecialistIds,
              meaning ? Array.from(offerFacts.keys()) : null,
            );
    const needsCity = request.workFormat !== "online";
    const cities = needsCity
      ? await loadCities(
          supabase,
          rows.map((row) => row.id).filter((id): id is string => Boolean(id)),
        )
      : new Map<string, string | null>();

    const activeUsers = await loadActiveInstallationUserIds(
      supabase,
      rows.map((row) => row.user_id).filter((id): id is string => typeof id === "string" && id.length > 0),
    );
    const otherwiseEligible: { specialist_id: string; match_reasons: MatchReasonCode[]; services: ServiceEconomicFloor[] }[] = [];
    for (const row of rows) {
      if (typeof row.user_id !== "string" || !activeUsers.has(row.user_id)) continue;
      const extraCategory =
        !meaning && request.categoryId && row.id && serviceIdSet.has(row.id) ? [request.categoryId] : [];
      const candidate = toCandidate(row, row.id ? cities.get(row.id) ?? null : null, extraCategory);
      if (!candidate) continue;
      if (meaning && row.id) candidate.offers = offerFacts.get(row.id) ?? [];
      const decision = evaluateMatch(request, candidate);
      if (!decision.eligible) continue;
      otherwiseEligible.push({
        specialist_id: candidate.id,
        match_reasons: decision.reasons,
        services: serviceFloors.get(candidate.id) ?? [],
      });
    }

    const partition = partitionEconomicEligibility({
      clientMaxCents,
      candidates: otherwiseEligible.map((candidate) => ({
        id: candidate.specialist_id,
        services: candidate.services,
      })),
    });
    const economicIds = new Set(partition.economicallyEligibleIds);
    const matches = otherwiseEligible
      .filter((candidate) => economicIds.has(candidate.specialist_id))
      .map((candidate) => ({
        specialist_id: candidate.specialist_id,
        match_reasons: candidate.match_reasons,
      }));
    const floorCents = reconciliationFloorCents(partition, clientMaxCents);
    let budgetReconciliation: BudgetReconciliationOffer | null = null;
    if (floorCents != null) {
      const keepDecline = shouldKeepBudgetDecline({
        existingRequiredCents: economy.requiredCents,
        existingDeclinedAt: economy.declinedAt,
        nextFloorCents: floorCents,
      });
      const { error: reconciliationError } = await supabase
        .from("service_requests")
        .update({
          budget_reconciliation_required_cents: floorCents,
          budget_reconciliation_declined_at: keepDecline ? economy.declinedAt : null,
        })
        .eq("id", request.id);
      if (reconciliationError) throw reconciliationError;
      if (!keepDecline) {
        budgetReconciliation = {
          required: true,
          minimum_budget_cents: floorCents,
          currency: "eur",
        };
      }
    } else if (economy.requiredCents != null || economy.declinedAt != null) {
      const { error: clearError } = await supabase
        .from("service_requests")
        .update({
          budget_reconciliation_required_cents: null,
          budget_reconciliation_declined_at: null,
        })
        .eq("id", request.id);
      if (clearError) throw clearError;
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

    if (floorCents == null) {
    const commercial = await ensureMatchedServiceRequestOffers(
      supabase,
      {
        requestId: request.id,
        specialistIds: matches.map((match) => match.specialist_id),
      },
      env,
    );
    if (!commercial.ok) {
      console.error("[matching] commercial offer preparation failed", {
        serviceRequestId: request.id,
        kind: commercial.kind,
      });
      return {
        outcome: "error",
        runId,
        serviceRequestId: request.id,
        candidates: rows.length,
        matches: matches.length,
        durationMs: Date.now() - started,
        budgetReconciliation: null,
      };
    }

    try {
      await enqueueMatchNotifications(supabase, request);
    } catch (enqueueError) {
      console.error("[inbox] enqueue failed", {
        serviceRequestId: request.id,
        name: enqueueError instanceof Error ? enqueueError.name : "Error",
      });
    }
    }

    const result: MatchingRunResult = {
      outcome: "matched",
      runId,
      serviceRequestId: request.id,
      candidates: rows.length,
      matches: matches.length,
      durationMs: Date.now() - started,
      budgetReconciliation,
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
      budgetReconciliation: null,
    };
    console.error("[matching] failed", {
      ...result,
      name: error instanceof Error ? error.name : "Error",
    });
    return result;
  }
}
