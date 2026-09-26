import { cookies } from "next/headers";
import { CLIENT_SELECTION_POLICY } from "./policy";

export const REQUEST_ACCESS_COOKIE = "freuly_request_access";

export function requestAccessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(CLIENT_SELECTION_POLICY.accessTokenTtlMs / 1000),
  };
}

export function readRequestAccessToken(): string | null {
  const value = cookies().get(REQUEST_ACCESS_COOKIE)?.value?.trim() ?? "";
  if (!value || value.length > 200) return null;
  return value;
}
