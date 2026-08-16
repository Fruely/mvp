import type { SupabaseClient } from "@supabase/supabase-js";

import { checkPublishableCategory } from "@/lib/dashboard/publicationReadiness";
import {
  ALLOWED_PRICING_TYPES,
  SPECIALIST_SERVICE_CURRENCY,
  type PricingType,
} from "@/lib/specialistServices/types";

export const ACTIVE_PRICE_REQUIRED_ERROR =
  "Чтобы показывать услугу в профиле и использовать её для публикации, укажите цену больше 0 или заполните комментарий к цене.";
export const LAST_PUBLIC_SERVICE_ERROR =
  "Нельзя удалить или отключить последнюю услугу у опубликованного профиля. Сначала добавьте другую активную услугу или снимите профиль с публикации.";
export const SPECIALIST_CATEGORY_REQUIRED_ERROR = "SPECIALIST_CATEGORY_REQUIRED";
export const INVALID_SERVICE_CATEGORY_ERROR = "INVALID_SERVICE_CATEGORY";

const PUBLISHED_SPECIALIST_STATUSES = new Set([
  "published_unverified",
  "featured_verified",
  "approved",
  "paused",
]);

export type ServiceValidationRow = {
  id?: unknown;
  title?: unknown;
  pricing_type?: unknown;
  price_from?: unknown;
  price_to?: unknown;
  price_comment?: unknown;
  is_active?: unknown;
  category_id?: unknown;
};

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasOwn(value: unknown, key: PropertyKey): boolean {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key));
}

export function isPublishedStatus(status: string | null): boolean {
  return Boolean(status && PUBLISHED_SPECIALIST_STATUSES.has(status));
}

export function normalizePricingType(value: unknown): PricingType {
  return value === "fixed" || value === "range" || value === "hourly" ? value : "fixed";
}

export function hasValidServicePriceShape(args: {
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

export function hasDisplayableServicePrice(priceFrom: number | null, priceComment: string | null): boolean {
  if (typeof priceFrom !== "number" || !Number.isFinite(priceFrom) || priceFrom < 0) return false;
  if (priceFrom > 0) return true;
  return priceFrom === 0 && Boolean(priceComment?.trim());
}

export function isValidActiveServiceForPublication(
  row: ServiceValidationRow,
  profileCategoryId: string | null,
): boolean {
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

export async function validateServiceCategory(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const { data: category, error } = await supabase
    .from("categories")
    .select("id, parent_id, slug")
    .eq("id", categoryId)
    .maybeSingle();

  if (error) {
    console.error("[specialistServices] category validation failed", error);
    return { ok: false, status: 500, body: { error: "server_error" } };
  }

  const check = checkPublishableCategory(category);
  if (!check.ok) {
    return {
      ok: false,
      status: 400,
      body: { error: INVALID_SERVICE_CATEGORY_ERROR, reason: check.reason },
    };
  }

  return { ok: true };
}

export async function validatePublishedProfileWouldStillHaveService(args: {
  supabase: SupabaseClient;
  specialistId: string;
  profileCategoryId: string | null;
  specialistStatus: string | null;
  changedServiceId: string;
  nextServiceRow?: ServiceValidationRow | null;
}): Promise<{ ok: true } | { ok: false; body: Record<string, unknown> }> {
  if (!isPublishedStatus(args.specialistStatus)) return { ok: true };

  const { data: services, error } = await args.supabase
    .from("specialist_services")
    .select("id, title, pricing_type, price_from, price_to, price_comment, is_active, category_id")
    .eq("specialist_id", args.specialistId);

  if (error) {
    console.error("[specialistServices] last service guard failed", error);
    return { ok: false, body: { error: "server_error" } };
  }

  const rows = (services ?? [])
    .map((row) => {
      if (String(row.id) !== args.changedServiceId) return row as ServiceValidationRow;
      return args.nextServiceRow ?? null;
    })
    .filter((row): row is ServiceValidationRow => row !== null);

  const hasValidRemainingService = rows.some((row) =>
    isValidActiveServiceForPublication(row, args.profileCategoryId),
  );

  if (!hasValidRemainingService) {
    return { ok: false, body: { error: LAST_PUBLIC_SERVICE_ERROR } };
  }

  return { ok: true };
}

export function enforceServiceCurrency(): string {
  return SPECIALIST_SERVICE_CURRENCY;
}

export function isAllowedPricingType(value: string | null): value is PricingType {
  return Boolean(value && ALLOWED_PRICING_TYPES.includes(value as PricingType));
}
