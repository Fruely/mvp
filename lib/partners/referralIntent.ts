import { createHmac, timingSafeEqual } from "node:crypto";

export const REFERRAL_INTENT_COOKIE = "freuly_ref_intent";
export const REFERRAL_INTENT_MAX_AGE_SEC = 30 * 60;

type ReferralIntentPayload = {
  v: 1;
  linkId: string;
  partnerId: string;
  issuedAt: number;
};

function getSigningSecret(): string | null {
  const dedicated = process.env.PARTNER_REF_SECRET?.trim();
  if (dedicated) return dedicated;
  const admin = process.env.ADMIN_API_TOKEN?.trim();
  if (admin) return `partner-ref:${admin}`;
  return null;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function encodeReferralIntentToken(payload: {
  linkId: string;
  partnerId: string;
  issuedAt?: number;
}): string | null {
  const secret = getSigningSecret();
  if (!secret) return null;
  const body = Buffer.from(
    JSON.stringify({
      v: 1,
      linkId: payload.linkId,
      partnerId: payload.partnerId,
      issuedAt: payload.issuedAt ?? Date.now(),
    } satisfies ReferralIntentPayload),
    "utf8"
  ).toString("base64url");
  return `v1.${body}.${sign(body, secret)}`;
}

export function decodeReferralIntentToken(
  raw: string | undefined | null,
  nowMs: number = Date.now()
): ReferralIntentPayload | null {
  if (!raw || typeof raw !== "string") return null;
  const secret = getSigningSecret();
  if (!secret) return null;

  const parts = raw.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  if (!body || !sig) return null;

  const expected = sign(body, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.v !== 1) return null;
  if (typeof obj.linkId !== "string" || !obj.linkId) return null;
  if (typeof obj.partnerId !== "string" || !obj.partnerId) return null;
  if (typeof obj.issuedAt !== "number" || !Number.isFinite(obj.issuedAt)) return null;

  const ageMs = nowMs - obj.issuedAt;
  if (ageMs < 0 || ageMs > REFERRAL_INTENT_MAX_AGE_SEC * 1000) return null;

  return {
    v: 1,
    linkId: obj.linkId,
    partnerId: obj.partnerId,
    issuedAt: obj.issuedAt,
  };
}

export function referralIntentCookieOptions(secure: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: REFERRAL_INTENT_MAX_AGE_SEC,
  };
}

export function clearReferralIntentCookieOptions(secure: boolean) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: 0,
  };
}
