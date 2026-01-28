import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Keep in sync with middleware.ts
const PREVIEW_COOKIE = "froily_preview";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // After enabling preview, always send users to the root domain.
  const redirectTo = "/";

  const response = NextResponse.redirect(new URL(redirectTo, url.origin));

  // Set a long-lived preview cookie so that the user has full access
  // until they clear cookies. HttpOnly is used because this is only
  // needed for middleware checks, not client-side JS.
  response.cookies.set(PREVIEW_COOKIE, "true", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}

