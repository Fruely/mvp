import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSpecialistEntitlements } from "@/lib/billing/planEntitlements";
import { getSpecialistPlanForDashboard } from "@/lib/specialists/subscription";
import { resolvePublicCardCopy } from "@/lib/serviceRequests/localizedPublicCopy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVE_REQUEST_STATUSES = new Set(["new", "reviewing", "searching"]);
const MAX_AGE_HOURS = 72;

export type ForYouRequest = {
  id: string;
  publicToken: string;
  title: string;
  summary: string;
  publishedAt: string;
  createdAt: string;
  preferredLanguage: string | null;
  workFormat: string | null;
  city: string | null;
  postalCode: string | null;
};

export type ForYouRequestsModel = {
  eligible: boolean;
  plan: "basic" | "premium" | null;
  items: ForYouRequest[];
};

type MatchInput = {
  requestCategoryId: string | null;
  requestLanguage: string | null;
  requestFormat: string | null;
  requestCity: string | null;
  specialistCategoryIds: string[];
  specialistLanguages: string[];
  specialistFormat: string | null;
  specialistCity: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLocaleLowerCase();
}

function languageAliases(value: string): string[] {
  const normalized = normalize(value);
  if (!normalized) return [];
  if (normalized === "uk" || normalized === "ua" || normalized.startsWith("ukrain")) return ["uk", "ua", "ukrainian", "українська", "украинский"];
  if (normalized === "ru" || normalized.startsWith("russ")) return ["ru", "russian", "русский", "русский язык"];
  if (normalized === "de" || normalized.startsWith("germ")) return ["de", "german", "deutsch", "немецкий"];
  return [normalized];
}

function matchesLanguage(requestLanguage: string | null, specialistLanguages: string[]): boolean {
  if (!requestLanguage || specialistLanguages.length === 0) return true;
  const requested = new Set(languageAliases(requestLanguage));
  return specialistLanguages.some((language) => languageAliases(language).some((alias) => requested.has(alias)));
}

function matchesFormat(requestFormat: string | null, specialistFormat: string | null): boolean {
  if (!requestFormat || !specialistFormat) return true;
  const request = normalize(requestFormat);
  const specialist = normalize(specialistFormat);
  if (request === "hybrid") return true;
  if (specialist === "hybrid") return true;
  return request === specialist;
}

function matchesCity(requestCity: string | null, specialistCity: string | null): boolean {
  if (!requestCity || !specialistCity) return true;
  return normalize(requestCity) === normalize(specialistCity);
}

export function matchesForYouRequest(input: MatchInput): boolean {
  const categoryMatches =
    !input.requestCategoryId ||
    input.specialistCategoryIds.length === 0 ||
    input.specialistCategoryIds.includes(input.requestCategoryId);
  return (
    categoryMatches &&
    matchesLanguage(input.requestLanguage, input.specialistLanguages) &&
    matchesFormat(input.requestFormat, input.specialistFormat) &&
    matchesCity(input.requestCity, input.specialistCity)
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadForYouRequests(
  _supabase: SupabaseClient,
  input: { specialistId: string; lang: "ru" | "ua" | "de" },
): Promise<ForYouRequestsModel> {
  const service = createSupabaseServerClient();
  const plan = await getSpecialistPlanForDashboard(service, input.specialistId);
  const entitlements = resolveSpecialistEntitlements(plan);
  if (!entitlements.effectivePaidPlan) return { eligible: false, plan: null, items: [] };

  const [{ data: specialist }, { data: profile }, { data: services }] = await Promise.all([
    service.from("specialists").select("category_id, languages, work_format").eq("id", input.specialistId).maybeSingle(),
    service.from("specialist_profiles").select("city").eq("specialist_id", input.specialistId).maybeSingle(),
    service.from("specialist_services").select("category_id").eq("specialist_id", input.specialistId).eq("is_active", true),
  ]);

  const categoryIds = [
    asString(specialist?.category_id),
    ...(services ?? []).map((row) => asString(row.category_id)),
  ].filter((value): value is string => Boolean(value));
  const languages = Array.isArray(specialist?.languages)
    ? specialist.languages.filter((value): value is string => typeof value === "string")
    : [];
  const specialistFormat = asString(specialist?.work_format);
  const specialistCity = asString(profile?.city);

  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const { data: promotions, error: promotionError } = await service
    .from("service_request_promotions")
    .select("id, public_token, service_request_id, public_title, public_summary, locale, localized_copy, published_at, closed_at, status")
    .eq("status", "published")
    .is("closed_at", null)
    .gte("published_at", cutoff)
    .order("published_at", { ascending: false })
    .limit(100);

  if (promotionError || !promotions?.length) return { eligible: true, plan: entitlements.effectivePaidPlan, items: [] };

  const requestIds = promotions.map((promotion) => promotion.service_request_id).filter(Boolean);
  const { data: requests, error: requestError } = await service
    .from("service_requests")
    .select("id, category_id, preferred_language, work_format, city, postal_code, status, created_at")
    .in("id", requestIds);

  if (requestError) return { eligible: true, plan: entitlements.effectivePaidPlan, items: [] };
  const requestById = new Map((requests ?? []).map((request) => [request.id, request]));

  const items = promotions.flatMap((promotion) => {
    const request = requestById.get(promotion.service_request_id);
    if (!request || !ACTIVE_REQUEST_STATUSES.has(String(request.status))) return [];
    if (!matchesForYouRequest({
      requestCategoryId: asString(request.category_id),
      requestLanguage: asString(request.preferred_language),
      requestFormat: asString(request.work_format),
      requestCity: asString(request.city),
      specialistCategoryIds: categoryIds,
      specialistLanguages: languages,
      specialistFormat,
      specialistCity,
    })) return [];

    const copy = resolvePublicCardCopy({
      lang: input.lang,
      publicTitle: String(promotion.public_title ?? ""),
      publicSummary: String(promotion.public_summary ?? ""),
      localizedCopy: promotion.localized_copy,
      sourceLocale: String(promotion.locale ?? "ru"),
    });
    if (!copy.title || !copy.summary || !promotion.public_token) return [];

    return [{
      id: String(promotion.id),
      publicToken: String(promotion.public_token),
      title: copy.title,
      summary: copy.summary,
      publishedAt: String(promotion.published_at),
      createdAt: String(request.created_at),
      preferredLanguage: asString(request.preferred_language),
      workFormat: asString(request.work_format),
      city: asString(request.city),
      postalCode: asString(request.postal_code),
    }];
  });

  return { eligible: true, plan: entitlements.effectivePaidPlan, items };
}
