import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { normalizeRouteLangToDbContentCode } from "@/lib/specialists/normalizeContentLanguageCode";
import {
  buildClientIdempotencyFingerprint,
  isUniqueViolation,
  normalizeClientIdempotencyKey,
} from "@/lib/mutations/clientIdempotency";
import type { SpecialistServicesContext } from "@/lib/specialistServices/context";
import { mapServiceRow } from "@/lib/specialistServices/mapServiceRow";
import {
  lookupServiceCreateIdempotentReplay,
  mapServiceCreateIdempotencyResolution,
  resolveServiceCreateIdempotencyResult,
} from "@/lib/specialistServices/serviceCreateIdempotency";
import {
  SERVICE_SELECT,
  type SpecialistServiceDeleteResponse,
  type SpecialistServiceDto,
  type SpecialistServiceMutationResponse,
} from "@/lib/specialistServices/types";
import {
  ACTIVE_PRICE_REQUIRED_ERROR,
  enforceServiceCurrency,
  hasDisplayableServicePrice,
  hasOwn,
  hasValidServicePriceShape,
  isAllowedPricingType,
  normalizeNumber,
  normalizePricingType,
  normalizeText,
  SPECIALIST_CATEGORY_REQUIRED_ERROR,
  validatePublishedProfileWouldStillHaveService,
  validateServiceCategory,
  type ServiceValidationRow,
} from "@/lib/specialistServices/validation";

async function defaultLoadReadiness(
  supabase: SupabaseClient,
  specialistId: string,
  lang: AccountCapabilitiesLang,
) {
  const { loadSpecialistServicesReadiness } = await import("@/lib/specialistServices/readiness");
  const { readiness } = await loadSpecialistServicesReadiness(supabase, specialistId, lang);
  return readiness;
}

export type ServiceMutationDependencies = {
  loadReadiness?: typeof defaultLoadReadiness;
};

function buildCreateIdempotencyPayload(payload: Record<string, unknown>) {
  return {
    title: payload.title,
    description: payload.description,
    price_comment: payload.price_comment,
    pricing_type: payload.pricing_type,
    price_from: payload.price_from,
    price_to: payload.price_to,
    currency: payload.currency,
    duration_minutes: payload.duration_minutes,
    is_active: payload.is_active,
    category_id: payload.category_id,
  };
}

export async function createSpecialistService(
  ctx: Extract<SpecialistServicesContext, { kind: "ok" }>,
  body: Record<string, unknown>,
  lang: AccountCapabilitiesLang,
  deps: ServiceMutationDependencies = {},
): Promise<
  | { ok: true; status: number; body: SpecialistServiceMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadReadiness = deps.loadReadiness ?? defaultLoadReadiness;
  const languageCode = normalizeRouteLangToDbContentCode(
    typeof body.lang === "string" ? body.lang : lang,
  );

  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const priceComment = normalizeText(body.price_comment);
  const pricingType = normalizeText(body.pricing_type);
  const priceFrom = normalizeNumber(body.price_from);
  const priceTo = normalizeNumber(body.price_to);
  const durationMinutes = normalizeNumber(body.duration_minutes);
  const requestedActive = typeof body.is_active === "boolean" ? body.is_active : true;
  const requestedCategoryId = normalizeText(body.category_id);
  const resolvedCategoryId = requestedCategoryId ?? ctx.categoryId;

  if (!resolvedCategoryId) {
    return { ok: false, status: 400, body: { error: SPECIALIST_CATEGORY_REQUIRED_ERROR } };
  }

  const categoryError = await validateServiceCategory(ctx.supabase, resolvedCategoryId);
  if (!categoryError.ok) {
    return { ok: false, status: categoryError.status, body: categoryError.body };
  }

  if (!title) {
    return { ok: false, status: 400, body: { error: "title is required" } };
  }
  if (!isAllowedPricingType(pricingType)) {
    return {
      ok: false,
      status: 400,
      body: { error: "pricing_type is required and must be fixed/range/hourly" },
    };
  }
  if (priceFrom == null || priceFrom < 0) {
    return { ok: false, status: 400, body: { error: "price_from is required and must be numeric" } };
  }
  if (pricingType === "range") {
    if (priceTo == null || priceTo < 0 || priceTo < priceFrom) {
      return {
        ok: false,
        status: 400,
        body: { error: "price_to is required for range and must be >= price_from" },
      };
    }
  }

  const validPriceShape = hasValidServicePriceShape({
    pricingType,
    priceFrom,
    priceTo,
  });
  const validDisplayPrice = hasDisplayableServicePrice(priceFrom, priceComment);
  if (requestedActive && (!validPriceShape || !validDisplayPrice)) {
    return { ok: false, status: 400, body: { error: ACTIVE_PRICE_REQUIRED_ERROR } };
  }

  const payload: Record<string, unknown> = {
    specialist_id: ctx.specialistId,
    title,
    description,
    price_comment: priceComment,
    pricing_type: pricingType,
    price_from: priceFrom,
    price_to: pricingType === "range" ? priceTo : null,
    currency: enforceServiceCurrency(),
    duration_minutes: durationMinutes,
    is_active: validPriceShape && validDisplayPrice ? requestedActive : false,
    category_id: resolvedCategoryId,
  };

  const clientIdempotencyKey = normalizeClientIdempotencyKey(body.idempotency_key);
  const idempotencyFingerprint = buildClientIdempotencyFingerprint(buildCreateIdempotencyPayload(payload));

  async function resolveIdempotencyReplay(
    replay: Awaited<ReturnType<typeof lookupServiceCreateIdempotentReplay>>,
  ) {
    return resolveServiceCreateIdempotencyResult(replay, loadReadiness, {
      supabase: ctx.supabase,
      specialistId: ctx.specialistId,
      lang,
    });
  }

  if (clientIdempotencyKey) {
    const replay = await lookupServiceCreateIdempotentReplay(
      ctx.supabase,
      clientIdempotencyKey,
      idempotencyFingerprint,
      ctx.userId,
    );
    const resolution = await resolveIdempotencyReplay(replay);
    if (resolution.kind !== "continue") {
      return mapServiceCreateIdempotencyResolution(resolution);
    }
  }

  const insertPayload = {
    ...payload,
    ...(clientIdempotencyKey
      ? {
          client_idempotency_key: clientIdempotencyKey,
          client_idempotency_fingerprint: idempotencyFingerprint,
          owner_user_id: ctx.userId,
        }
      : {}),
  };

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .insert(insertPayload)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    if (clientIdempotencyKey && isUniqueViolation(error)) {
      const replay = await lookupServiceCreateIdempotentReplay(
        ctx.supabase,
        clientIdempotencyKey,
        idempotencyFingerprint,
        ctx.userId,
      );
      const resolution = await resolveIdempotencyReplay(replay);
      if (resolution.kind !== "continue") {
        return mapServiceCreateIdempotencyResolution(resolution);
      }
    }
    console.error("[specialistServices] POST failed", error);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  if (languageCode && data?.id) {
    const { error: translationError } = await ctx.supabase.from("specialist_service_translations").upsert(
      {
        specialist_service_id: String(data.id),
        language_code: languageCode,
        title,
        description,
        price_comment: priceComment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "specialist_service_id,language_code" },
    );
    if (translationError) {
      console.error("[specialistServices] POST translation upsert failed", translationError.message);
    }
  }

  const readiness = await loadReadiness(ctx.supabase, ctx.specialistId, lang);
  return {
    ok: true,
    status: 201,
    body: {
      data: mapServiceRow(data as Record<string, unknown>),
      ...readiness,
    },
  };
}

export async function updateSpecialistService(
  ctx: Extract<SpecialistServicesContext, { kind: "ok" }>,
  body: Record<string, unknown>,
  lang: AccountCapabilitiesLang,
  deps: ServiceMutationDependencies = {},
): Promise<
  | { ok: true; body: SpecialistServiceMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadReadiness = deps.loadReadiness ?? defaultLoadReadiness;

  const languageCode = normalizeRouteLangToDbContentCode(
    typeof body.lang === "string" ? body.lang : lang,
  );

  const id = normalizeText(body.id);
  if (!id) return { ok: false, status: 400, body: { error: "id is required" } };

  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const priceComment = normalizeText(body.price_comment);
  const pricingType = normalizeText(body.pricing_type);
  const priceFrom = normalizeNumber(body.price_from);
  const priceTo = normalizeNumber(body.price_to);
  const durationMinutes = normalizeNumber(body.duration_minutes);
  const isActive = typeof body.is_active === "boolean" ? body.is_active : null;
  const requestedCategoryId = normalizeText(body.category_id);

  const { data: currentService, error: currentServiceError } = await ctx.supabase
    .from("specialist_services")
    .select("id, title, pricing_type, price_from, price_to, price_comment, is_active, category_id")
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .maybeSingle();

  if (currentServiceError) {
    console.error("[specialistServices] PATCH lookup failed", currentServiceError);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }
  if (!currentService) {
    return { ok: false, status: 404, body: { error: "service_not_found" } };
  }

  const patch: Record<string, unknown> = {};

  if (title !== null) patch.title = title;
  if (hasOwn(body, "description")) patch.description = description;
  if (hasOwn(body, "price_comment")) patch.price_comment = priceComment;
  if (pricingType !== null) {
    if (!isAllowedPricingType(pricingType)) {
      return { ok: false, status: 400, body: { error: "pricing_type must be fixed/range/hourly" } };
    }
    patch.pricing_type = pricingType;
  }
  if (priceFrom !== null) patch.price_from = priceFrom;
  if (hasOwn(body, "price_to")) patch.price_to = priceTo;
  if (hasOwn(body, "duration_minutes")) patch.duration_minutes = durationMinutes;
  if (isActive !== null) patch.is_active = isActive;

  const effectiveTitle = (patch.title as string | undefined) ?? normalizeText(currentService.title);
  const effectivePriceComment = hasOwn(patch, "price_comment")
    ? (patch.price_comment as string | null)
    : normalizeText(currentService.price_comment);
  const effectivePricingType = normalizePricingType(
    (patch.pricing_type as string | undefined) ??
      pricingType ??
      (typeof currentService.pricing_type === "string" ? currentService.pricing_type : "fixed"),
  );
  const effectivePriceFrom =
    (patch.price_from as number | undefined) ??
    priceFrom ??
    normalizeNumber(currentService.price_from);
  const effectivePriceTo =
    (patch.price_to as number | null | undefined) ??
    priceTo ??
    normalizeNumber(currentService.price_to);

  if (effectivePricingType === "range") {
    if (effectivePriceFrom == null || effectivePriceTo == null || effectivePriceTo < effectivePriceFrom) {
      return { ok: false, status: 400, body: { error: "range requires price_to >= price_from" } };
    }
  }

  const validPriceShape = hasValidServicePriceShape({
    pricingType: effectivePricingType,
    priceFrom: effectivePriceFrom,
    priceTo: effectivePriceTo,
  });
  const validDisplayPrice = hasDisplayableServicePrice(effectivePriceFrom, effectivePriceComment);

  const currentIsActive = Boolean(currentService.is_active);
  const nextRequestedIsActive = isActive ?? currentIsActive;
  if (nextRequestedIsActive && (!validPriceShape || !validDisplayPrice)) {
    return { ok: false, status: 400, body: { error: ACTIVE_PRICE_REQUIRED_ERROR } };
  }
  if (!validPriceShape || !validDisplayPrice) {
    patch.is_active = false;
  }

  if (hasOwn(body, "category_id")) {
    const resolvedCategoryId = requestedCategoryId ?? ctx.categoryId;
    if (!resolvedCategoryId) {
      return { ok: false, status: 400, body: { error: SPECIALIST_CATEGORY_REQUIRED_ERROR } };
    }
    const categoryError = await validateServiceCategory(ctx.supabase, resolvedCategoryId);
    if (!categoryError.ok) {
      return { ok: false, status: categoryError.status, body: categoryError.body };
    }
    patch.category_id = resolvedCategoryId;
  }

  patch.currency = enforceServiceCurrency();

  const nextServiceRow: ServiceValidationRow = {
    ...currentService,
    ...patch,
    id,
    title: effectiveTitle,
    pricing_type: effectivePricingType,
    price_from: effectivePriceFrom,
    price_to: effectivePricingType === "range" ? effectivePriceTo : null,
    price_comment: effectivePriceComment,
    is_active: patch.is_active ?? nextRequestedIsActive,
    category_id: patch.category_id ?? currentService.category_id,
  };

  const lastServiceError = await validatePublishedProfileWouldStillHaveService({
    supabase: ctx.supabase,
    specialistId: ctx.specialistId,
    profileCategoryId: ctx.categoryId,
    specialistStatus: ctx.specialistStatus,
    changedServiceId: id,
    nextServiceRow,
  });
  if (!lastServiceError.ok) {
    return { ok: false, status: 400, body: lastServiceError.body };
  }

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .update(patch)
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[specialistServices] PATCH failed", error);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }
  if (!data) {
    return { ok: false, status: 404, body: { error: "service_not_found" } };
  }

  if (languageCode && data?.id) {
    const rowTitle = typeof data.title === "string" ? data.title : "";
    const rowDesc = typeof data.description === "string" ? data.description : null;
    const rowPriceComment = typeof data.price_comment === "string" ? data.price_comment : null;
    const { error: translationError } = await ctx.supabase.from("specialist_service_translations").upsert(
      {
        specialist_service_id: String(data.id),
        language_code: languageCode,
        title: rowTitle,
        description: rowDesc,
        price_comment: rowPriceComment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "specialist_service_id,language_code" },
    );
    if (translationError) {
      console.error("[specialistServices] PATCH translation upsert failed", translationError.message);
    }
  }

  const readiness = await loadReadiness(ctx.supabase, ctx.specialistId, lang);
  return {
    ok: true,
    body: {
      data: mapServiceRow(data as Record<string, unknown>),
      ...readiness,
    },
  };
}

export async function deleteSpecialistService(
  ctx: Extract<SpecialistServicesContext, { kind: "ok" }>,
  body: Record<string, unknown>,
  lang: AccountCapabilitiesLang,
  deps: ServiceMutationDependencies = {},
): Promise<
  | { ok: true; body: SpecialistServiceDeleteResponse }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const loadReadiness = deps.loadReadiness ?? defaultLoadReadiness;
  const id = normalizeText(body.id);
  if (!id) return { ok: false, status: 400, body: { error: "id is required" } };

  const lastServiceError = await validatePublishedProfileWouldStillHaveService({
    supabase: ctx.supabase,
    specialistId: ctx.specialistId,
    profileCategoryId: ctx.categoryId,
    specialistStatus: ctx.specialistStatus,
    changedServiceId: id,
    nextServiceRow: null,
  });
  if (!lastServiceError.ok) {
    return { ok: false, status: 400, body: lastServiceError.body };
  }

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .delete()
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[specialistServices] DELETE failed", error);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }
  if (!data) {
    return { ok: false, status: 404, body: { error: "service_not_found" } };
  }

  const readiness = await loadReadiness(ctx.supabase, ctx.specialistId, lang);
  return {
    ok: true,
    body: {
      success: true,
      ...readiness,
    },
  };
}
