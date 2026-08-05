import {
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  ATTRIBUTION_COOKIE_NAME,
} from "./attributionConstants";

export { ATTRIBUTION_COOKIE_NAME };

export function buildAttributionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  };
}

export function buildAttributionCookieClearOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
