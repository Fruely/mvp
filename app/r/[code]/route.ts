import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit/shared";
import { recordPartnerClick } from "@/lib/partners/clicks";
import {
  PARTNER_REF_COOKIE,
  PARTNER_REF_MAX_AGE_SEC,
  decodeReferralCookie,
  encodeReferralCookie,
} from "@/lib/partners/cookie";
import { findActiveLinkByCode } from "@/lib/partners/service";
import { normalizeReferralCode } from "@/lib/partners/codes";
import { defaultBecomeSpecialistPath, sanitizeTargetPath } from "@/lib/partners/targetPath";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeHomeRedirect(request: NextRequest): NextResponse {
  const langCookie = request.cookies.get("freuly_lang")?.value;
  const lang =
    langCookie === "ru" || langCookie === "de" || langCookie === "ua" ? langCookie : "ua";
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}`;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function GET(
  request: NextRequest,
  context: { params: { code: string } | Promise<{ code: string }> }
) {
  const params = await Promise.resolve(context.params);
  const code = normalizeReferralCode(params?.code ?? "");

  // Rate limit — fail-open if Upstash missing
  const ip = getClientIP(request);
  try {
    await checkRateLimit(request, {
      namespace: "partner_ref:ip",
      identifier: ip,
      limit: 60,
      windowSeconds: 3600,
    });
  } catch {
    // ignore
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return safeHomeRedirect(request);
  }

  let resolved: Awaited<ReturnType<typeof findActiveLinkByCode>> = null;
  try {
    resolved = await findActiveLinkByCode(supabase, code);
  } catch (err) {
    console.error("[r/[code]] lookup failed", err);
    return safeHomeRedirect(request);
  }

  if (!resolved) {
    return safeHomeRedirect(request);
  }

  const { link, partner } = resolved;
  const target =
    sanitizeTargetPath(link.target_path) ?? defaultBecomeSpecialistPath("ua");

  const sp = request.nextUrl.searchParams;
  // Await insert so serverless runtime does not freeze the isolate before the
  // best-effort click write finishes (void caused intermittent missing rows).
  await recordPartnerClick(supabase, {
    partnerId: partner.id,
    partnerLinkId: link.id,
    visitorSeed: `${ip}:${code}`,
    landingPath: request.nextUrl.pathname,
    referrer: request.headers.get("referer"),
    utmSource: sp.get("utm_source"),
    utmMedium: sp.get("utm_medium"),
    utmCampaign: sp.get("utm_campaign") ?? sp.get("campaign") ?? link.campaign,
  });

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = target;
  // Preserve campaign UTMs on landing (marketing only; not financial)
  const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "campaign"];
  const nextSearch = new URLSearchParams();
  for (const key of keep) {
    const v = sp.get(key);
    if (v) nextSearch.set(key, v);
  }
  redirectUrl.search = nextSearch.toString() ? `?${nextSearch.toString()}` : "";

  const response = NextResponse.redirect(redirectUrl);

  const existing = request.cookies.get(PARTNER_REF_COOKIE)?.value;
  const existingValid = decodeReferralCookie(existing);
  if (!existingValid) {
    const encoded = encodeReferralCookie({
      v: 1,
      linkId: link.id,
      partnerId: partner.id,
      issuedAt: Date.now(),
    });
    if (encoded) {
      response.cookies.set(PARTNER_REF_COOKIE, encoded, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: PARTNER_REF_MAX_AGE_SEC,
      });
    }
  }

  return response;
}
