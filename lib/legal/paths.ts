import type { LegalPublicLang } from "@/content/legal/types";
import { isLegalPublicLang } from "@/content/legal/types";
import type { Lang } from "@/lib/i18n";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

export const LEGAL_SLUGS = {
  impressum: "impressum",
  privacy: "datenschutzerklaerung",
  agb: "agb",
} as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[keyof typeof LEGAL_SLUGS];

/** Legacy root URLs kept for redirects / external links. */
export const LEGACY_LEGAL_PATHS = {
  impressum: "/impressum",
  privacy: "/datenschutzerklaerung",
} as const;

export function legalPath(lang: LegalPublicLang | Lang, slug: LegalSlug): string {
  return `/${lang}/${slug}`;
}

export function impressumPath(lang: LegalPublicLang | Lang): string {
  return legalPath(lang, LEGAL_SLUGS.impressum);
}

export function privacyPath(lang: LegalPublicLang | Lang): string {
  return legalPath(lang, LEGAL_SLUGS.privacy);
}

export function agbPath(lang: LegalPublicLang | Lang): string {
  return legalPath(lang, LEGAL_SLUGS.agb);
}

/**
 * Consent UI may resolve to `en`, which has no published legal routes.
 * English consent links to the German privacy page (authoritative edition).
 */
export function privacyPathForConsentLang(lang: string): string {
  if (isLegalPublicLang(lang)) return privacyPath(lang);
  return privacyPath("de");
}

export function absoluteLegalUrl(lang: LegalPublicLang, slug: LegalSlug): string {
  return `${SITE_DOMAIN}${legalPath(lang, slug)}`;
}
