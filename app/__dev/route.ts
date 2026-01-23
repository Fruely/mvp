import { NextRequest, NextResponse } from "next/server";

const DEV_COOKIE = "freuly_dev";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/ua";

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set(DEV_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

import { NextRequest, NextResponse } from "next/server";

const DEV_COOKIE = "freuly_dev";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/ua";

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set(DEV_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

