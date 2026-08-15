import { resolvePublicSiteOrigin } from "@/lib/partners/referralUrl";

export function requestPromotionPath(lang: string, publicToken: string): string {
  const token = publicToken.trim();
  return `/${lang}/request/${encodeURIComponent(token)}`;
}

export function requestPromotionAcceptPath(lang: string, publicToken: string): string {
  const token = publicToken.trim();
  return `/${lang}/request/${encodeURIComponent(token)}/accept`;
}

/** Server-authoritative public URL — does not rely on Host header. */
export function buildPublicPromotionUrl(lang: string, publicToken: string): string {
  const origin = resolvePublicSiteOrigin("https://freuly.de");
  return `${origin}${requestPromotionPath(lang, publicToken)}`;
}

/** Canonical accept/reservation URL for social ads and Telegram CTAs. */
export function buildPublicPromotionAcceptUrl(lang: string, publicToken: string): string {
  const origin = resolvePublicSiteOrigin("https://freuly.de");
  return `${origin}${requestPromotionAcceptPath(lang, publicToken)}`;
}
