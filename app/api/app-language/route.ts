import { NextRequest, NextResponse } from "next/server";

/**
 * Minimal language switch for the PWA app shell.
 *
 * Sets the existing `freuly_lang` cookie (the same cookie middleware already
 * uses for i18n) and returns the user to /app. It intentionally does NOT touch
 * the global i18n architecture, does not change any search parameters, and only
 * accepts the three supported UI languages.
 */

const SUPPORTED = ["ua", "ru", "de"] as const;
type Lang = (typeof SUPPORTED)[number];
const LANG_COOKIE = "freuly_lang";

function isLang(value: string | null): value is Lang {
  return value != null && (SUPPORTED as readonly string[]).includes(value);
}

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("lang");
  const target = new URL("/app", request.url);
  const response = NextResponse.redirect(target);

  if (isLang(requested)) {
    response.cookies.set(LANG_COOKIE, requested, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
