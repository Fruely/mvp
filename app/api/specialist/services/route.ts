import { NextRequest, NextResponse } from "next/server";
import { checkPublishableCategory } from "@/lib/dashboard/publicationReadiness";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { normalizeRouteLangToDbContentCode } from "@/lib/specialists/normalizeContentLanguageCode";

const ALLOWED_PRICING_TYPES = ["fixed", "range", "hourly"] as const;
type PricingType = (typeof ALLOWED_PRICING_TYPES)[number];
const ACTIVE_PRICE_REQUIRED_ERROR =
  "Чтобы показывать услугу в профиле и использовать её для публикации, укажите цену больше 0 или заполните комментарий к цене.";
const LAST_PUBLIC_SERVICE_ERROR =
  "Нельзя удалить или отключить последнюю услугу у опубликованного профиля. Сначала добавьте другую активную услугу или снимите профиль с публикации.";
const SPECIALIST_CATEGORY_REQUIRED_ERROR = "SPECIALIST_CATEGORY_REQUIRED";
const INVALID_SERVICE_CATEGORY_ERROR = "INVALID_SERVICE_CATEGORY";
const SPECIALIST_SERVICE_CURRENCY = "EUR";
const SERVICE_SELECT =
  "id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, category_id, created_at, updated_at";

const PUBLISHED_SPECIALIST_STATUSES = new Set([
  "published_unverified",
  "featured_verified",
  "approved",
  "paused",
]);

type ServiceValidationRow = {
  id?: unknown;
  title?: unknown;
  pricing_type?: unknown;
  price_from?: unknown;
  price_to?: unknown;
  price_comment?: unknown;
  is_active?: unknown;
  category_id?: unknown;
};

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hasOwn(value: unknown, key: PropertyKey): boolean {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key));
}

function isPublishedStatus(status: string | null): boolean {
  return Boolean(status && PUBLISHED_SPECIALIST_STATUSES.has(status));
}

function normalizePricingType(value: unknown): PricingType {
  return value === "fixed" || value === "range" || value === "hourly" ? value : "fixed";
}

function hasValidServicePriceShape(args: {
  pricingType: PricingType;
  priceFrom: number | null;
  priceTo: number | null;
}): boolean {
  if (typeof args.priceFrom !== "number" || !Number.isFinite(args.priceFrom) || args.priceFrom < 0) {
    return false;
  }
  if (args.pricingType === "range") {
    if (typeof args.priceTo !== "number" || !Number.isFinite(args.priceTo) || args.priceTo < args.priceFrom) {
      return false;
    }
  }
  return true;
}

function hasDisplayableServicePrice(priceFrom: number | null, priceComment: string | null): boolean {
  if (typeof priceFrom !== "number" || !Number.isFinite(priceFrom) || priceFrom < 0) return false;
  if (priceFrom > 0) return true;
  return priceFrom === 0 && Boolean(priceComment?.trim());
}

function isValidActiveServiceForPublication(row: ServiceValidationRow, profileCategoryId: string | null): boolean {
  if (row.is_active !== true) return false;
  if (profileCategoryId && row.category_id !== profileCategoryId) return false;

  const title = normalizeText(row.title);
  if (!title) return false;

  const pricingType = normalizePricingType(row.pricing_type);
  const priceFrom = normalizeNumber(row.price_from);
  const priceTo = normalizeNumber(row.price_to);
  const priceComment = normalizeText(row.price_comment);

  return (
    hasValidServicePriceShape({ pricingType, priceFrom, priceTo }) &&
    hasDisplayableServicePrice(priceFrom, priceComment)
  );
}

async function validateServiceCategory(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  categoryId: string,
): Promise<NextResponse | null> {
  const { data: category, error } = await supabase
    .from("categories")
    .select("id, parent_id, slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    console.error("[specialist/services] category validation failed", error);
    return NextResponse.json({ error: "Failed to validate category" }, { status: 500 });
  }

  const check = checkPublishableCategory(category);
  if (!check.ok) {
    return NextResponse.json(
      { error: INVALID_SERVICE_CATEGORY_ERROR, reason: check.reason },
      { status: 400 },
    );
  }

  return null;
}

async function getCurrentSpecialistContext() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), supabase: null, specialistId: null, categoryId: null, status: null };
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, category_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError) {
    return {
      error: NextResponse.json({ error: "Failed to verify specialist access" }, { status: 500 }),
      supabase: null,
      specialistId: null,
      categoryId: null,
      status: null,
    };
  }

  if (!specialist?.id) {
    return { error: NextResponse.json({ error: "Specialist not found" }, { status: 404 }), supabase: null, specialistId: null, categoryId: null, status: null };
  }

  const categoryId = typeof specialist.category_id === "string" ? specialist.category_id : null;
  const status = typeof specialist.status === "string" ? specialist.status : null;
  return { error: null, supabase, specialistId: specialist.id as string, categoryId, status };
}

async function validatePublishedProfileWouldStillHaveService(args: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  specialistId: string;
  profileCategoryId: string | null;
  specialistStatus: string | null;
  changedServiceId: string;
  nextServiceRow?: ServiceValidationRow | null;
}): Promise<NextResponse | null> {
  if (!isPublishedStatus(args.specialistStatus)) return null;

  const { data: services, error } = await args.supabase
    .from("specialist_services")
    .select("id, title, pricing_type, price_from, price_to, price_comment, is_active, category_id")
    .eq("specialist_id", args.specialistId);

  if (error) {
    console.error("[specialist/services] last service guard failed", error);
    return NextResponse.json({ error: "Failed to validate profile services" }, { status: 500 });
  }

  const rows = (services ?? []).map((row) => {
    if (String(row.id) !== args.changedServiceId) return row as ServiceValidationRow;
    return args.nextServiceRow ?? null;
  }).filter((row): row is ServiceValidationRow => row !== null);

  const hasValidRemainingService = rows.some((row) =>
    isValidActiveServiceForPublication(row, args.profileCategoryId),
  );

  if (!hasValidRemainingService) {
    return NextResponse.json({ error: LAST_PUBLIC_SERVICE_ERROR }, { status: 400 });
  }

  return null;
}

export async function GET() {
  const ctx = await getCurrentSpecialistContext();
  if (ctx.error || !ctx.supabase || !ctx.specialistId) return ctx.error!;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .select(SERVICE_SELECT)
    .eq("specialist_id", ctx.specialistId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[specialist/services] GET failed", error);
    return NextResponse.json({ error: "Failed to load services" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const ctx = await getCurrentSpecialistContext();
  if (ctx.error || !ctx.supabase || !ctx.specialistId) return ctx.error!;

  const postUrl = new URL(request.url);
  const languageCode = normalizeRouteLangToDbContentCode(postUrl.searchParams.get("lang"));

  const body = await request.json().catch(() => null);
  const title = normalizeText(body?.title);
  const description = normalizeText(body?.description);
  const priceComment = normalizeText(body?.price_comment);
  const pricingType = normalizeText(body?.pricing_type);
  const priceFrom = normalizeNumber(body?.price_from);
  const priceTo = normalizeNumber(body?.price_to);
  const durationMinutes = normalizeNumber(body?.duration_minutes);
  const requestedActive = typeof body?.is_active === "boolean" ? body.is_active : true;
  const requestedCategoryId = normalizeText(body?.category_id);
  const resolvedCategoryId = requestedCategoryId ?? ctx.categoryId;

  if (!resolvedCategoryId) {
    return NextResponse.json({ error: SPECIALIST_CATEGORY_REQUIRED_ERROR }, { status: 400 });
  }

  const categoryError = await validateServiceCategory(ctx.supabase, resolvedCategoryId);
  if (categoryError) return categoryError;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!pricingType || !ALLOWED_PRICING_TYPES.includes(pricingType as PricingType)) {
    return NextResponse.json({ error: "pricing_type is required and must be fixed/range/hourly" }, { status: 400 });
  }
  if (priceFrom == null || priceFrom < 0) {
    return NextResponse.json({ error: "price_from is required and must be numeric" }, { status: 400 });
  }
  if (pricingType === "range") {
    if (priceTo == null || priceTo < 0 || priceTo < priceFrom) {
      return NextResponse.json({ error: "price_to is required for range and must be >= price_from" }, { status: 400 });
    }
  }
  const validPriceShape = hasValidServicePriceShape({
    pricingType: pricingType as PricingType,
    priceFrom,
    priceTo,
  });
  const validDisplayPrice = hasDisplayableServicePrice(priceFrom, priceComment);
  if (requestedActive && (!validPriceShape || !validDisplayPrice)) {
    return NextResponse.json(
      { error: ACTIVE_PRICE_REQUIRED_ERROR },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    specialist_id: ctx.specialistId,
    title,
    description,
    price_comment: priceComment,
    pricing_type: pricingType,
    price_from: priceFrom,
    price_to: pricingType === "range" ? priceTo : null,
    currency: SPECIALIST_SERVICE_CURRENCY,
    duration_minutes: durationMinutes,
    is_active: validPriceShape && validDisplayPrice ? requestedActive : false,
    category_id: resolvedCategoryId,
  };

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .insert(payload)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[specialist/services] POST failed", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
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
      { onConflict: "specialist_service_id,language_code" }
    );
    if (translationError) {
      console.error(
        "[specialist/services] POST translation upsert failed (legacy save already persisted)",
        translationError
      );
    }
  }

  return NextResponse.json({ data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getCurrentSpecialistContext();
  if (ctx.error || !ctx.supabase || !ctx.specialistId) return ctx.error!;

  const patchUrl = new URL(request.url);
  const languageCode = normalizeRouteLangToDbContentCode(patchUrl.searchParams.get("lang"));

  const body = await request.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const title = normalizeText(body?.title);
  const description = normalizeText(body?.description);
  const priceComment = normalizeText(body?.price_comment);
  const pricingType = normalizeText(body?.pricing_type);
  const priceFrom = normalizeNumber(body?.price_from);
  const priceTo = normalizeNumber(body?.price_to);
  const durationMinutes = normalizeNumber(body?.duration_minutes);
  const isActive = typeof body?.is_active === "boolean" ? body.is_active : null;
  const requestedCategoryId = normalizeText(body?.category_id);

  const { data: currentService, error: currentServiceError } = await ctx.supabase
    .from("specialist_services")
    .select("id, title, pricing_type, price_from, price_to, price_comment, is_active, category_id")
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .maybeSingle();

  if (currentServiceError) {
    console.error("[specialist/services] PATCH current service lookup failed", currentServiceError);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
  if (!currentService) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (title !== null) patch.title = title;
  if (hasOwn(body, "description")) patch.description = description;
  if (hasOwn(body, "price_comment")) patch.price_comment = priceComment;
  if (pricingType !== null) {
    if (!ALLOWED_PRICING_TYPES.includes(pricingType as PricingType)) {
      return NextResponse.json({ error: "pricing_type must be fixed/range/hourly" }, { status: 400 });
    }
    patch.pricing_type = pricingType;
  }
  if (priceFrom !== null) patch.price_from = priceFrom;
  if (hasOwn(body, "price_to")) patch.price_to = priceTo;
  if (hasOwn(body, "duration_minutes")) patch.duration_minutes = durationMinutes;
  if (isActive !== null) patch.is_active = isActive;

  const effectiveTitle = (patch.title as string | undefined) ?? normalizeText(currentService.title);
  const effectivePriceComment =
    (hasOwn(patch, "price_comment") ? (patch.price_comment as string | null) : normalizeText(currentService.price_comment));
  const effectivePricingTypeRaw =
    (patch.pricing_type as string | undefined) ??
    pricingType ??
    (typeof currentService.pricing_type === "string" ? currentService.pricing_type : "fixed");
  const effectivePricingType = normalizePricingType(effectivePricingTypeRaw);
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
      return NextResponse.json({ error: "range requires price_to >= price_from" }, { status: 400 });
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
    return NextResponse.json(
      { error: ACTIVE_PRICE_REQUIRED_ERROR },
      { status: 400 },
    );
  }
  if (!validPriceShape || !validDisplayPrice) {
    patch.is_active = false;
  }

  if (hasOwn(body, "category_id")) {
    const resolvedCategoryId = requestedCategoryId ?? ctx.categoryId;
    if (!resolvedCategoryId) {
      return NextResponse.json({ error: SPECIALIST_CATEGORY_REQUIRED_ERROR }, { status: 400 });
    }
    const categoryError = await validateServiceCategory(ctx.supabase, resolvedCategoryId);
    if (categoryError) return categoryError;
    patch.category_id = resolvedCategoryId;
  }
  patch.currency = SPECIALIST_SERVICE_CURRENCY;

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
    specialistStatus: ctx.status,
    changedServiceId: id,
    nextServiceRow,
  });
  if (lastServiceError) return lastServiceError;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .update(patch)
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .select(SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    console.error("[specialist/services] PATCH failed", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
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
      { onConflict: "specialist_service_id,language_code" }
    );
    if (translationError) {
      console.error(
        "[specialist/services] PATCH translation upsert failed (legacy save already persisted)",
        translationError
      );
    }
  }

  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getCurrentSpecialistContext();
  if (ctx.error || !ctx.supabase || !ctx.specialistId) return ctx.error!;

  const body = await request.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const lastServiceError = await validatePublishedProfileWouldStillHaveService({
    supabase: ctx.supabase,
    specialistId: ctx.specialistId,
    profileCategoryId: ctx.categoryId,
    specialistStatus: ctx.status,
    changedServiceId: id,
    nextServiceRow: null,
  });
  if (lastServiceError) return lastServiceError;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .delete()
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[specialist/services] DELETE failed", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
