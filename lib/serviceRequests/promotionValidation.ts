import {
  PROMOTION_LOCALES,
  PROMOTION_SUMMARY_MAX_LEN,
  PROMOTION_TITLE_MAX_LEN,
  type PromotionLocale,
} from "./promotionConstants";
import { parseLocalizedCopy, seedLocalizedCopy } from "./localizedPublicCopy";

export type PromotionDraftInput = {
  locale?: unknown;
  public_title?: unknown;
  public_summary?: unknown;
  copies?: unknown;
  public_token?: unknown;
  status?: unknown;
  service_request_id?: unknown;
};

export type ValidatedPromotionDraft = {
  locale: PromotionLocale;
  public_title: string;
  public_summary: string;
  localized_copy: ReturnType<typeof parseLocalizedCopy>;
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

  const parsedCopies = parseLocalizedCopy(body.copies);
  const sourceCopy = parsedCopies[localeRaw];
  const public_title = str(sourceCopy?.title) ?? str(body.public_title);
  if (!public_title) {
    return { error: "public_title is required" };
  }
  if (public_title.length > PROMOTION_TITLE_MAX_LEN) {
    return { error: "public_title is too long" };
  }

  const public_summary = str(sourceCopy?.summary) ?? str(body.public_summary);
  if (!public_summary) {
    return { error: "public_summary is required" };
  }
  if (public_summary.length > PROMOTION_SUMMARY_MAX_LEN) {
    return { error: "public_summary is too long" };
  }

  for (const locale of PROMOTION_LOCALES) {
    const copy = parsedCopies[locale];
    if (!copy) continue;
    if (copy.title.length > PROMOTION_TITLE_MAX_LEN) {
      return { error: "public_title is too long" };
    }
    if (copy.summary.length > PROMOTION_SUMMARY_MAX_LEN) {
      return { error: "public_summary is too long" };
    }
  }

  return {
    locale: localeRaw,
    public_title,
    public_summary,
    localized_copy: seedLocalizedCopy({
      locale: localeRaw,
      title: public_title,
      summary: public_summary,
      existing: parsedCopies,
    }),
  };
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
