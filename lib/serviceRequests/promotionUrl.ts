import { resolvePublicSiteOrigin } from "@/lib/partners/referralUrl";

export function requestPromotionPath(lang: string, publicToken: string): string {
  const token = publicToken.trim();
  return `/${lang}/request/${encodeURIComponent(token)}`;
}

/** Server-authoritative public URL — does not rely on Host header. */
export function buildPublicPromotionUrl(lang: string, publicToken: string): string {
  const origin = resolvePublicSiteOrigin("https://freuly.de");
  return `${origin}${requestPromotionPath(lang, publicToken)}`;
}
