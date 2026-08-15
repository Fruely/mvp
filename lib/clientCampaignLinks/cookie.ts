export const CLIENT_CAMPAIGN_COOKIE_NAME = "freuly_client_campaign_id";

export const CLIENT_CAMPAIGN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export function clientCampaignCookieOptions(secure: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: CLIENT_CAMPAIGN_COOKIE_MAX_AGE_SEC,
  };
}
