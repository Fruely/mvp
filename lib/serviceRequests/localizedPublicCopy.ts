import { PROMOTION_LOCALES, type PromotionLocale } from "./promotionConstants";

export type PublicCopyFields = {
  title: string;
  summary: string;
};

export type LocalizedPublicCopy = Partial<Record<PromotionLocale, PublicCopyFields>>;

export const LIVE_DEMAND_ACTIVE_STATUSES = ["new", "reviewing", "searching"] as const;
export const LIVE_DEMAND_MAX_AGE_HOURS = 72;

function trimText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function isPromotionLocale(value: unknown): value is PromotionLocale {
  return typeof value === "string" && (PROMOTION_LOCALES as readonly string[]).includes(value);
}

export function parseLocalizedCopy(value: unknown): LocalizedPublicCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const out: LocalizedPublicCopy = {};
  for (const locale of PROMOTION_LOCALES) {
    const entry = source[locale];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const title = trimText((entry as Record<string, unknown>).title);
    const summary = trimText((entry as Record<string, unknown>).summary);
    if (!title || !summary) continue;
    out[locale] = { title, summary };
  }
  return out;
}

export function seedLocalizedCopy(args: {
  locale: PromotionLocale;
  title: string;
  summary: string;
  existing?: unknown;
}): LocalizedPublicCopy {
  const copy = parseLocalizedCopy(args.existing);
  copy[args.locale] = {
    title: trimText(args.title),
    summary: trimText(args.summary),
  };
  return copy;
}

export type PublicCopyTranslator = (
  sourceLocale: PromotionLocale,
  targetLocale: PromotionLocale,
  source: PublicCopyFields,
) => Promise<PublicCopyFields | null>;

export async function fillMissingLocalizedCopies(args: {
  sourceLocale: PromotionLocale;
  title: string;
  summary: string;
  existing?: unknown;
  translate: PublicCopyTranslator;
}): Promise<LocalizedPublicCopy> {
  const copy = seedLocalizedCopy({
    locale: args.sourceLocale,
    title: args.title,
    summary: args.summary,
    existing: args.existing,
  });
  const source = copy[args.sourceLocale];
  if (!source) return parseLocalizedCopy(args.existing);

  for (const locale of PROMOTION_LOCALES) {
    if (locale === args.sourceLocale) continue;
    if (copy[locale]?.title && copy[locale]?.summary) continue;
    const translated = await args.translate(args.sourceLocale, locale, source);
    if (translated?.title && translated.summary) {
      copy[locale] = translated;
    }
  }

  return copy;
}

export function resolvePublicCardCopy(args: {
  lang: PromotionLocale;
  publicTitle: string;
  publicSummary: string;
  localizedCopy?: unknown;
  sourceLocale?: string | null;
}): PublicCopyFields {
  const localized = parseLocalizedCopy(args.localizedCopy);
  const requested = localized[args.lang];
  if (requested?.title && requested.summary) return requested;

  const sourceLocale = isPromotionLocale(args.sourceLocale) ? args.sourceLocale : null;
  const sourceCopy = sourceLocale ? localized[sourceLocale] : null;
  if (sourceCopy?.title && sourceCopy.summary) return sourceCopy;

  return {
    title: trimText(args.publicTitle),
    summary: trimText(args.publicSummary),
  };
}

export function clientMatchingLanguage(preferredLanguage: string | null | undefined): string | null {
  const value = trimText(preferredLanguage);
  return value || null;
}

export function isLiveDemandEligible(args: {
  promotionStatus: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  requestStatus: string | null;
  requestCreatedAt: string | null;
  nowMs?: number;
}): boolean {
  if (args.promotionStatus !== "published") return false;
  if (!args.publishedAt) return false;
  if (args.closedAt) return false;
  if (!LIVE_DEMAND_ACTIVE_STATUSES.includes(args.requestStatus as (typeof LIVE_DEMAND_ACTIVE_STATUSES)[number])) {
    return false;
  }
  const created = args.requestCreatedAt ? Date.parse(args.requestCreatedAt) : Number.NaN;
  if (!Number.isFinite(created)) return false;
  const now = args.nowMs ?? Date.now();
  return now - created <= LIVE_DEMAND_MAX_AGE_HOURS * 60 * 60 * 1000;
}

export function mapLiveDemandCard(args: {
  pageLang: PromotionLocale;
  publicToken: string;
  publicTitle: string;
  publicSummary: string;
  localizedCopy?: unknown;
  sourceLocale?: string | null;
  preferredLanguage: string | null;
  createdAt: string;
  workFormat: string | null;
  city: string | null;
  postalCode: string | null;
  category: string | null;
  promotionStatus: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  requestStatus: string | null;
  nowMs?: number;
}): {
  id: string;
  title: string;
  summary: string;
  created_at: string;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  category: string | null;
} | null {
  if (
    !isLiveDemandEligible({
      promotionStatus: args.promotionStatus,
      publishedAt: args.publishedAt,
      closedAt: args.closedAt,
      requestStatus: args.requestStatus,
      requestCreatedAt: args.createdAt,
      nowMs: args.nowMs,
    })
  ) {
    return null;
  }

  const copy = resolvePublicCardCopy({
    lang: args.pageLang,
    publicTitle: args.publicTitle,
    publicSummary: args.publicSummary,
    localizedCopy: args.localizedCopy,
    sourceLocale: args.sourceLocale,
  });
  if (!copy.title || !copy.summary || !args.publicToken.trim()) return null;

  return {
    id: args.publicToken.trim(),
    title: copy.title,
    summary: copy.summary,
    created_at: args.createdAt,
    preferred_language: clientMatchingLanguage(args.preferredLanguage),
    work_format: args.workFormat,
    city: args.city,
    postal_code: args.postalCode,
    category: args.category,
  };
}
