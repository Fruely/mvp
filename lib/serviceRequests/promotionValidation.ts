import {
  PROMOTION_LOCALES,
  PROMOTION_SUMMARY_MAX_LEN,
  PROMOTION_TITLE_MAX_LEN,
  type PromotionLocale,
} from "./promotionConstants";

export type PromotionDraftInput = {
  locale?: unknown;
  public_title?: unknown;
  public_summary?: unknown;
  public_token?: unknown;
  status?: unknown;
  service_request_id?: unknown;
};

export type ValidatedPromotionDraft = {
  locale: PromotionLocale;
  public_title: string;
  public_summary: string;
};

export type PromotionValidationError = { error: string };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPromotionLocale(value: string): value is PromotionLocale {
  return (PROMOTION_LOCALES as readonly string[]).includes(value);
}

export function validatePromotionDraftInput(
  body: PromotionDraftInput,
): ValidatedPromotionDraft | PromotionValidationError {
  if (body.public_token != null && String(body.public_token).trim()) {
    return { error: "public_token is not allowed" };
  }

  if (body.status != null && String(body.status).trim()) {
    return { error: "status is not allowed" };
  }

  if (body.service_request_id != null && String(body.service_request_id).trim()) {
    return { error: "service_request_id is not allowed in payload" };
  }

  const localeRaw = str(body.locale);
  if (!localeRaw || !isPromotionLocale(localeRaw)) {
    return { error: "invalid locale" };
  }

  const public_title = str(body.public_title);
  if (!public_title) {
    return { error: "public_title is required" };
  }
  if (public_title.length > PROMOTION_TITLE_MAX_LEN) {
    return { error: "public_title is too long" };
  }

  const public_summary = str(body.public_summary);
  if (!public_summary) {
    return { error: "public_summary is required" };
  }
  if (public_summary.length > PROMOTION_SUMMARY_MAX_LEN) {
    return { error: "public_summary is too long" };
  }

  return { locale: localeRaw, public_title, public_summary };
}

export function isPublishedPromotionVisible(row: {
  status: string | null;
  published_at: string | null;
  closed_at: string | null;
}): boolean {
  return (
    row.status === "published" &&
    row.published_at != null &&
    row.published_at.length > 0 &&
    (row.closed_at == null || row.closed_at.length === 0)
  );
}
