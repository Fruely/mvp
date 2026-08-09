import { NextRequest, NextResponse } from "next/server";
import {
  CONSENT_COOKIE_NAME,
  hasReferralConsentFromCookie,
} from "@/lib/consent/consentCookie";
import { jsonNoStore } from "@/lib/api/response";
import {
  PARTNER_REF_COOKIE,
  PARTNER_REF_MAX_AGE_SEC,
  decodeReferralCookie,
  encodeReferralCookie,
} from "@/lib/partners/cookie";
import {
  REFERRAL_INTENT_COOKIE,
  clearReferralIntentCookieOptions,
  decodeReferralIntentToken,
} from "@/lib/partners/referralIntent";

function secureFromRequest(request: NextRequest): boolean {
  return request.nextUrl.protocol === "https:";
}

function setReferralCookie(
  response: NextResponse,
  request: NextRequest,
  payload: { linkId: string; partnerId: string }
) {
  const existing = request.cookies.get(PARTNER_REF_COOKIE)?.value;
  if (decodeReferralCookie(existing)) return;

  const encoded = encodeReferralCookie({
    v: 1,
    linkId: payload.linkId,
    partnerId: payload.partnerId,
    issuedAt: Date.now(),
  });
  if (!encoded) return;

  response.cookies.set(PARTNER_REF_COOKIE, encoded, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureFromRequest(request),
    maxAge: PARTNER_REF_MAX_AGE_SEC,
  });
}

/** Apply pending referral intent after explicit referral consent. */
export async function POST(request: NextRequest) {
  if (!hasReferralConsentFromCookie(request.cookies.get(CONSENT_COOKIE_NAME)?.value)) {
    return jsonNoStore({ ok: false, code: "referral_consent_required" }, { status: 403 });
  }

  const intentRaw = request.cookies.get(REFERRAL_INTENT_COOKIE)?.value;
  const intent = decodeReferralIntentToken(intentRaw);
  if (!intent) {
    return jsonNoStore({ ok: true, applied: false, reason: "no_pending_intent" });
  }

  const response = jsonNoStore({ ok: true, applied: true });
  setReferralCookie(response, request, {
    linkId: intent.linkId,
    partnerId: intent.partnerId,
  });
  response.cookies.set(
    REFERRAL_INTENT_COOKIE,
    "",
    clearReferralIntentCookieOptions(secureFromRequest(request))
  );
  return response;
}

/** Clear referral tracking cookie when consent is withdrawn. */
export async function DELETE(request: NextRequest) {
  const response = jsonNoStore({ ok: true });
  response.cookies.set(PARTNER_REF_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: secureFromRequest(request),
    maxAge: 0,
  });
  response.cookies.set(
    REFERRAL_INTENT_COOKIE,
    "",
    clearReferralIntentCookieOptions(secureFromRequest(request))
  );
  return response;
}
