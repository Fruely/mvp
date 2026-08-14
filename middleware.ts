import { NextRequest, NextResponse } from "next/server";
import {
  isPublicHomepagePath,
  PUBLIC_HOMEPAGE_CACHE_CONTROL,
} from "@/lib/homepage/middlewareCache";
import { SPECIALISTS_UI_LANG_HEADER } from "@/lib/search/specialistsUiLang";

const SUPPORTED_LANGS = ["ua", "ru", "de"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

const LANG_COOKIE = "freuly_lang";
const DEV_COOKIE = "freuly_dev";
const DEV_ENABLE_PATH = "/__dev";
const DEV_CLOSED_PATH = "/__closed";

// Example usage: https://domain.com/?dev=SECRET_KEY
function isLang(value: string): value is Lang {
  return (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** BCP 47: Ukrainian uses `uk` in <html lang>, URL segment stays `ua`. */
const HTML_LANG_HEADER = "x-freuly-html-lang";
const PATHNAME_HEADER = "x-freuly-pathname";

function pathnameToHtmlLang(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "ua") return "uk";
  if (seg === "ru") return "ru";
  if (seg === "de") return "de";
  return "ru";
}

function nextWithHtmlLang(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HTML_LANG_HEADER, pathnameToHtmlLang(pathname));
  requestHeaders.set(PATHNAME_HEADER, pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Legacy legal URLs → localized German editions (SEO + external links)
  if (pathname === "/impressum") {
    const url = request.nextUrl.clone();
    url.pathname = "/de/impressum";
    return NextResponse.redirect(url, 308);
  }
  if (pathname === "/datenschutzerklaerung") {
    const url = request.nextUrl.clone();
    url.pathname = "/de/datenschutzerklaerung";
    return NextResponse.redirect(url, 308);
  }

  // Legacy specialist dashboard URLs → /{lang}/specialist/dashboard
  if (pathname === "/specialist/dashboard" || pathname.startsWith("/specialist/dashboard/")) {
    const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
    const preferredLang: Lang = isLang(cookieLang || "") ? (cookieLang as Lang) : "ua";
    const rest = pathname.slice("/specialist/dashboard".length);
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang}/specialist/dashboard${rest}`;
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/__closed")) {
    return nextWithHtmlLang(request, pathname);
  }

  // PWA app-shell entry (top-level /app and /app/*): must stay reachable in
  // closed mode and must NOT be i18n-redirected to /{lang}/app. Language is
  // resolved from the existing `freuly_lang` cookie (default `ua`) so
  // <html lang> matches the shell. Includes /app/install for install landing.
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
    const appLang: Lang = isLang(cookieLang || "") ? (cookieLang as Lang) : "ua";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HTML_LANG_HEADER, appLang === "ua" ? "uk" : appLang);
    requestHeaders.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // STEP 1: Check for dev access key in URL parameter FIRST (before anything else)
  const devKey = searchParams.get("dev");
  const expectedKey = process.env.DEV_ACCESS_KEY;

  // If dev key is provided and matches, set cookie and redirect
  if (devKey && expectedKey && devKey === expectedKey) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("dev");
    const response = NextResponse.redirect(url);
    response.cookies.set(DEV_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  // STEP 2: Check if user has dev cookie
  const isDev = request.cookies.get(DEV_COOKIE)?.value === "1";

  // STEP 3: Whitelisted paths that should never be blocked
  // Public routes: language prefixes, API (verify-email), specialist/claim, login
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  const isLangRoute = first && isLang(first);

  const isWhitelisted =
    pathname === "/" ||
    pathname === "/__dev" ||
    pathname === "/__closed" ||
    isLangRoute ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/specialist") ||
    pathname.startsWith("/for-specialists") ||
    pathname.startsWith("/become-specialist") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/r/") ||
    pathname === "/r" ||
    pathname === "/partners" ||
    pathname.startsWith("/partners/") ||
    pathname.startsWith("/_next") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname.includes(".");

  // Block access if no dev cookie and not whitelisted
  if (!isDev && !isWhitelisted) {
    return NextResponse.redirect(new URL("/__closed", request.url));
  }

  // `/specialists` is public search (unprefixed). Honor `?lang=` over cookie so
  // chrome matches results. Must run before `/specialist*` skip below.
  if (pathname === "/specialists" || pathname.startsWith("/specialists/")) {
    const qLang = searchParams.get("lang");
    const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
    const uiLang: Lang = isLang(qLang || "")
      ? (qLang as Lang)
      : isLang(cookieLang || "")
        ? (cookieLang as Lang)
        : "ru";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HTML_LANG_HEADER, uiLang === "ua" ? "uk" : uiLang);
    requestHeaders.set(PATHNAME_HEADER, pathname);
    requestHeaders.set(SPECIALISTS_UI_LANG_HEADER, uiLang);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set(LANG_COOKIE, uiLang, { path: "/" });
    return res;
  }

  // Unprefixed /login: html lang follows freuly_lang (default ru), same as specialists.
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
    const loginLang: Lang = isLang(cookieLang || "") ? (cookieLang as Lang) : "ru";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HTML_LANG_HEADER, loginLang === "ua" ? "uk" : loginLang);
    requestHeaders.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Never apply i18n to admin/api/specialist/client/login/static assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/specialist") ||
    pathname.startsWith("/for-specialists") ||
    pathname.startsWith("/become-specialist") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/update-password") ||
    pathname.startsWith("/r/") ||
    pathname === "/r" ||
    pathname === "/partners" ||
    pathname.startsWith("/partners/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.includes(".")
  ) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HTML_LANG_HEADER, pathnameToHtmlLang(pathname));
    requestHeaders.set(PATHNAME_HEADER, pathname);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (pathname.startsWith("/specialist/claim")) {
      res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
    }
    return res;
  }

  // Root "/" → serve directly (no redirect, SEO requirement)
  if (pathname === "/") {
    const res = nextWithHtmlLang(request, pathname);
    res.headers.set("Cache-Control", PUBLIC_HOMEPAGE_CACHE_CONTROL);
    return res;
  }

  // i18n logic (only for language routes)
  const segmentsForI18n = pathname.split("/").filter(Boolean);
  const firstI18n = segmentsForI18n[0];

  const cookieLang = request.cookies.get(LANG_COOKIE)?.value;
  const preferredLang: Lang = isLang(cookieLang || "") ? (cookieLang as Lang) : "ua";

  // No lang prefix: redirect to preferred lang + same path
  if (!firstI18n || !isLang(firstI18n)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang}${pathname}`;
    return NextResponse.redirect(url);
  }

  const lang = firstI18n;

  // Prevent nonsense like /ua/admin/... or /ua/api/...
  if (segmentsForI18n[1] === "admin" || segmentsForI18n[1] === "api") {
    const url = request.nextUrl.clone();
    url.pathname = `/${segmentsForI18n[1]}${segmentsForI18n.length > 2 ? "/" + segmentsForI18n.slice(2).join("/") : ""}`;
    return NextResponse.redirect(url);
  }

  // For /{lang} keep as-is, just set cookie (for future redirects)
  if (segmentsForI18n.length === 1) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HTML_LANG_HEADER, pathnameToHtmlLang(pathname));
    requestHeaders.set(PATHNAME_HEADER, pathname);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.cookies.set(LANG_COOKIE, lang, { path: "/" });
    if (isPublicHomepagePath(pathname)) {
      res.headers.set("Cache-Control", PUBLIC_HOMEPAGE_CACHE_CONTROL);
    }
    return res;
  }

  // For /{lang}/... keep as-is, just set cookie (for future redirects)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(HTML_LANG_HEADER, pathnameToHtmlLang(pathname));
  requestHeaders.set(PATHNAME_HEADER, pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.cookies.set(LANG_COOKIE, lang, { path: "/" });
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
