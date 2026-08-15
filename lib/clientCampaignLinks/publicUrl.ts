import { CLIENT_CAMPAIGN_PUBLIC_PATH_PREFIX } from "./constants";

export function campaignPublicPath(slug: string): string {
  return `${CLIENT_CAMPAIGN_PUBLIC_PATH_PREFIX}/${slug}`;
}

export function campaignPublicUrl(slug: string, origin?: string | null): string {
  const base =
    origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://freuly.de";
  return `${base}${campaignPublicPath(slug)}`;
}
