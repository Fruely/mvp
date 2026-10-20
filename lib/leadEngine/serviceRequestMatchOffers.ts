import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { buildShadowPricingSnapshot, resolveShadowLeadPrice } from "@/lib/leadEngine/shadowPricing";
import { buildServiceRequestMatchedShadowOffer } from "@/lib/leadEngine/requestOfferPolicy";
import { isUniqueViolation } from "@/lib/mutations/clientIdempotency";
import {
  searchSpecialists,
  type SpecialistResult,
  type SpecialistSearchInput,
  type SpecialistSearchResult,
} from "@/lib/search/specialistSearch";
import type { ValidatedServiceRequestCreate } from "@/lib/serviceRequests/validation";

const DEFAULT_MATCH_OFFER_LIMIT = 10;
const MAX_MATCH_OFFER_LIMIT = 20;
const SEARCH_QUERY_MAX_LEN = 120;

type SearchFn = (input: SpecialistSearchInput) => Promise<SpecialistSearchResult>;
type ResolveShadowPriceFn = typeof resolveShadowLeadPrice;

export type ServiceRequestMatchOfferResult =
  | { kind: "disabled" }
  | { kind: "request_not_found" }
  | { kind: "no_matches"; searched: number }
  | { kind: "completed"; matched: number; created: number; existing: number; failed: number }
  | { kind: "failed" };

export type EnsureServiceRequestMatchOffersInput = {
  supabase: SupabaseClient;
  publicId: string;
  validated: ValidatedServiceRequestCreate;
  enabled?: boolean;
  maxOffers?: number;
  search?: SearchFn;
  resolveShadowPrice?: ResolveShadowPriceFn;
};

export function areServiceRequestMatchOffersEnabled(): boolean {
  return process.env.LEAD_ENGINE_SERVICE_REQUEST_MATCHING_ENABLED === "true";
}

export function normalizeMatchOfferLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MATCH_OFFER_LIMIT;
  return Math.min(Math.floor(parsed), MAX_MATCH_OFFER_LIMIT);
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/**
 * Builds one or two searches from the persistent client intent.
 * Hybrid demand deliberately searches both local and online supply, then the
 * caller deduplicates specialists before creating offers.
 */
export function buildServiceRequestMatchSearches(
  request: ValidatedServiceRequestCreate,
  categorySlug: string | null,
): SpecialistSearchInput[] {
  const place = firstText(request.postal_code, request.city);
  const freeText = firstText(
    request.requested_service,
    request.subcategory_text,
    request.category_text,
    request.description,
  );
  const q = categorySlug ? null : freeText?.slice(0, SEARCH_QUERY_MAX_LEN) ?? null;
  const common = {
    lang: request.preferred_language,
    category: categorySlug,
    q,
    radius: request.radius_km,
    offset: 0,
  } satisfies SpecialistSearchInput;

  if (request.work_format === "online") {
    return [{ ...common, mode: "online", place: null }];
  }

  const local = { ...common, mode: null, place } satisfies SpecialistSearchInput;
  if (request.work_format === "offline") return [local];

  return [local, { ...common, mode: "online", place: null }];
}

export function dedupeMatchedSpecialists(
  results: readonly SpecialistSearchResult[],
  limit: number,
): SpecialistResult[] {
  const seen = new Set<string>();
  const matched: SpecialistResult[] = [];

  for (const result of results) {
    for (const specialist of result.data) {
      if (!specialist.id || seen.has(specialist.id)) continue;
      seen.add(specialist.id);
      matched.push(specialist);
      if (matched.length >= limit) return matched;
    }
  }

  return matched;
}

async function resolveCategorySlug(
  supabase: SupabaseClient,
  request: ValidatedServiceRequestCreate,
): Promise<string | null> {
  if (request.category_id) {
    const { data, error } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", request.category_id)
      .maybeSingle();
    if (error) throw error;
    if (typeof data?.slug === "string" && data.slug.trim()) return data.slug.trim();
  }

  // No category is also a valid state. The search layer will normalize the
  // request's free text and resolve known synonyms without exposing taxonomy
  // choices in the client UI.
  return null;
}

/**
 * Best-effort, idempotent shadow distribution for newly created open demand.
 *
 * This does not expose client PII, unlock contacts, charge a specialist, or
 * send a push notification. It only materializes server-side request_offers
 * that later inbox/push/claim slices can consume.
 */
export async function ensureServiceRequestMatchOffers(
  input: EnsureServiceRequestMatchOffersInput,
): Promise<ServiceRequestMatchOfferResult> {
  const enabled = input.enabled ?? areServiceRequestMatchOffersEnabled();
  if (!enabled) return { kind: "disabled" };

  try {
    const { data: requestRow, error: requestError } = await input.supabase
      .from("service_requests")
      .select("id")
      .eq("public_id", input.publicId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!requestRow?.id) return { kind: "request_not_found" };

    const categorySlug = await resolveCategorySlug(input.supabase, input.validated);
    const searches = buildServiceRequestMatchSearches(input.validated, categorySlug);
    const search = input.search ?? searchSpecialists;
    const searchResults = await Promise.all(searches.map((query) => search(query)));
    const limit = normalizeMatchOfferLimit(
      input.maxOffers ?? process.env.LEAD_ENGINE_MATCH_MAX_OFFERS,
    );
    const specialists = dedupeMatchedSpecialists(searchResults, limit);

    if (specialists.length === 0) {
      return { kind: "no_matches", searched: searches.length };
    }

    const resolvePrice = input.resolveShadowPrice ?? resolveShadowLeadPrice;
    const shadowPrice = await resolvePrice(input.supabase, {
      pricingSegment: "professional",
      categoryId: input.validated.category_id,
    });
    const shadowSnapshot = shadowPrice ? buildShadowPricingSnapshot(shadowPrice) : null;

    let created = 0;
    let existing = 0;
    let failed = 0;

    for (const specialist of specialists) {
      const offer = buildServiceRequestMatchedShadowOffer({
        serviceRequestId: String(requestRow.id),
        specialistId: specialist.id,
      });
      const payload = shadowSnapshot ? { ...offer, ...shadowSnapshot } : offer;
      const { error } = await input.supabase.from("request_offers").insert(payload);

      if (!error) {
        created += 1;
      } else if (isUniqueViolation(error)) {
        existing += 1;
      } else {
        failed += 1;
        console.warn("[lead-engine/service-request-matching] offer insert failed", {
          code: error.code ?? "unknown",
        });
      }
    }

    return {
      kind: "completed",
      matched: specialists.length,
      created,
      existing,
      failed,
    };
  } catch (error) {
    console.warn("[lead-engine/service-request-matching] shadow matching failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return { kind: "failed" };
  }
}
