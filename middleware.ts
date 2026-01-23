import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

const LANG_COOKIE = "freuly_lang";
const DEV_COOKIE = "freuly_dev";
const DEV_ENABLE_PATH = "/__dev";
const DEV_CLOSED_PATH = "/__closed";

function isLang(value: string): value is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDev = request.cookies.get("freuly_dev")?.value === "1";
  const isWhitelisted =
    pathname === "/__dev" ||
    pathname === "/__closed" ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  if (!isDev && !isWhitelisted) {
    return NextResponse.rewrite(new URL("/__closed", request.url));
  }

  // Never apply i18n to admin/api/static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // Root: always redirect to default lang (/ua)
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/ua";
    return NextResponse.redirect(url);
  }

  const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
  const preferredLang: Lang = isLang(cookieLang || "") ? (cookieLang as Lang) : "ua";

  // No lang prefix: redirect to preferred lang + same path
  if (!first || !isLang(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang}${pathname}`;
    return NextResponse.redirect(url);
  }

  const lang = first;

  // Prevent nonsense like /ua/admin/... or /ua/api/...
  if (segments[1] === "admin" || segments[1] === "api") {
    const url = request.nextUrl.clone();
    url.pathname = `/${segments[1]}${segments.length > 2 ? "/" + segments.slice(2).join("/") : ""}`;
    return NextResponse.redirect(url);
  }

  // For /{lang} keep as-is, just set cookie (for future redirects)
  if (segments.length === 1) {
    const res = NextResponse.next();
    res.cookies.set(LANG_COOKIE, lang, { path: "/" });
    return res;
  }

  // For /{lang}/... keep as-is, just set cookie (for future redirects)
  const res = NextResponse.next();
  res.cookies.set(LANG_COOKIE, lang, { path: "/" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
