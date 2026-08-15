import { NextRequest, NextResponse } from "next/server";
import { createPromotedReservationCheckout } from "@/lib/billing/createPromotedReservationCheckout";
import { PROMOTED_RESERVATION_COOKIE_NAME } from "@/lib/billing/completePromotedReservationRegistration";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

const RESERVATION_COOKIE_MAX_AGE_SECONDS = 72 * 60 * 60 + 3600;

function resolveSiteUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!fromEnv) return null;
  return fromEnv.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const langRaw = (body as Record<string, unknown>).lang;
  const tokenRaw = (body as Record<string, unknown>).public_token;
  if (typeof langRaw !== "string" || !isSupportedLang(langRaw.trim())) {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400, headers: NO_STORE });
  }
  if (typeof tokenRaw !== "string" || !tokenRaw.trim()) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400, headers: NO_STORE });
  }

  const siteUrl = resolveSiteUrl();
  if (!siteUrl) {
    return NextResponse.json({ error: "payments_unavailable" }, { status: 503, headers: NO_STORE });
  }

  const result = await createPromotedReservationCheckout({
    supabase: createSupabaseServerClient(),
    lang: langRaw.trim() as Lang,
    siteUrl,
    publicToken: tokenRaw.trim(),
  });

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : result.reason === "payments_unavailable"
          ? 503
          : 502;
    return NextResponse.json({ error: result.reason }, { status, headers: NO_STORE });
  }

  const response = NextResponse.json(
    { checkout_url: result.checkoutUrl, reservation_id: result.reservationId },
    { status: 200, headers: NO_STORE },
  );
  response.cookies.set(PROMOTED_RESERVATION_COOKIE_NAME, result.reservationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESERVATION_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
