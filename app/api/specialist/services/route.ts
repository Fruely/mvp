import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { normalizeRouteLangToDbContentCode } from "@/lib/specialists/normalizeContentLanguageCode";

const ALLOWED_PRICING_TYPES = ["fixed", "range", "hourly"] as const;
type PricingType = (typeof ALLOWED_PRICING_TYPES)[number];
const ACTIVE_PRICE_REQUIRED_ERROR =
  "Чтобы показывать услугу в профиле и использовать её для публикации, укажите цену больше 0.";

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

function hasValidServicePrice(args: {
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

function hasPositivePriceFrom(priceFrom: number | null): boolean {
  return typeof priceFrom === "number" && Number.isFinite(priceFrom) && priceFrom > 0;
}

async function getCurrentSpecialistContext() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }), supabase: null, specialistId: null, categoryId: null };
  }

  const { data: specialist, error: specialistError } = await supabase
    .from("specialists")
    .select("id, category_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError) {
    return {
      error: NextResponse.json({ error: "Failed to verify specialist access" }, { status: 500 }),
      supabase: null,
      specialistId: null,
      categoryId: null,
    };
  }

  if (!specialist?.id) {
    return { error: NextResponse.json({ error: "Specialist not found" }, { status: 404 }), supabase: null, specialistId: null, categoryId: null };
  }

  const categoryId = typeof specialist.category_id === "string" ? specialist.category_id : null;
  return { error: null, supabase, specialistId: specialist.id as string, categoryId };
}

export async function GET() {
  const ctx = await getCurrentSpecialistContext();
  if (ctx.error || !ctx.supabase || !ctx.specialistId) return ctx.error!;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .select("id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, created_at, updated_at")
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
  const currency = normalizeText(body?.currency) ?? "EUR";
  const durationMinutes = normalizeNumber(body?.duration_minutes);
  const requestedActive = typeof body?.is_active === "boolean" ? body.is_active : true;

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
  const validPrice = hasValidServicePrice({
    pricingType: pricingType as PricingType,
    priceFrom,
    priceTo,
  });
  if (requestedActive && (!validPrice || !hasPositivePriceFrom(priceFrom))) {
    return NextResponse.json(
      { error: ACTIVE_PRICE_REQUIRED_ERROR },
      { status: 400 }
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
    currency,
    duration_minutes: durationMinutes,
    is_active: validPrice ? requestedActive : false,
  };
  payload.category_id = ctx.categoryId;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .insert(payload)
    .select("id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, created_at, updated_at")
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
  const currency = normalizeText(body?.currency) ?? "EUR";
  const durationMinutes = normalizeNumber(body?.duration_minutes);
  const isActive = typeof body?.is_active === "boolean" ? body.is_active : null;

  const { data: currentService, error: currentServiceError } = await ctx.supabase
    .from("specialist_services")
    .select("id, pricing_type, price_from, price_to, is_active")
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
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "description")) patch.description = description;
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "price_comment")) patch.price_comment = priceComment;
  if (pricingType !== null) {
    if (!ALLOWED_PRICING_TYPES.includes(pricingType as PricingType)) {
      return NextResponse.json({ error: "pricing_type must be fixed/range/hourly" }, { status: 400 });
    }
    patch.pricing_type = pricingType;
  }
  if (priceFrom !== null) patch.price_from = priceFrom;
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "price_to")) patch.price_to = priceTo;
  if (currency) patch.currency = currency;
  if (Object.prototype.hasOwnProperty.call(body ?? {}, "duration_minutes")) patch.duration_minutes = durationMinutes;
  if (isActive !== null) patch.is_active = isActive;

  const effectivePricingTypeRaw =
    (patch.pricing_type as string | undefined) ??
    pricingType ??
    (typeof currentService.pricing_type === "string" ? currentService.pricing_type : "fixed");
  const effectivePricingType: PricingType =
    effectivePricingTypeRaw === "fixed" || effectivePricingTypeRaw === "range" || effectivePricingTypeRaw === "hourly"
      ? effectivePricingTypeRaw
      : "fixed";
  const effectivePriceFrom =
    (patch.price_from as number | undefined) ??
    priceFrom ??
    (typeof currentService.price_from === "number" ? currentService.price_from : null);
  const effectivePriceTo =
    (patch.price_to as number | null | undefined) ??
    priceTo ??
    (typeof currentService.price_to === "number" ? currentService.price_to : null);

  if (effectivePricingType === "range") {
    if (effectivePriceFrom == null || effectivePriceTo == null || effectivePriceTo < effectivePriceFrom) {
      return NextResponse.json({ error: "range requires price_to >= price_from" }, { status: 400 });
    }
  }
  const validPrice = hasValidServicePrice({
    pricingType: effectivePricingType,
    priceFrom: effectivePriceFrom,
    priceTo: effectivePriceTo,
  });

  const currentIsActive = Boolean(currentService.is_active);
  const nextRequestedIsActive = isActive ?? currentIsActive;
  if (nextRequestedIsActive && (!validPrice || !hasPositivePriceFrom(effectivePriceFrom))) {
    return NextResponse.json(
      { error: ACTIVE_PRICE_REQUIRED_ERROR },
      { status: 400 }
    );
  }
  if (!validPrice) {
    patch.is_active = false;
  }
  patch.category_id = ctx.categoryId;

  const { data, error } = await ctx.supabase
    .from("specialist_services")
    .update(patch)
    .eq("id", id)
    .eq("specialist_id", ctx.specialistId)
    .select("id, title, description, price_comment, pricing_type, price_from, price_to, currency, duration_minutes, is_active, created_at, updated_at")
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

