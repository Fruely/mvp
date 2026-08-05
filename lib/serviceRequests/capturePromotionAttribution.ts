import "server-only";

import {
  ATTRIBUTION_COOKIE_NAME,
  buildAttributionCookieOptions,
} from "./attributionCookie";
import { isAttributionTokenUrlSafe } from "./attributionToken";
import {
  getAttributionByToken,
  insertAttributionRow,
  recordAttributionRepeatVisit,
} from "./promotionAttributionData";
import type { SanitizedUtmFields } from "./attributionConstants";

export type CapturePromotionAttributionInput = {
  promotionId: string;
  landingLocale: string;
  utm: SanitizedUtmFields;
  referrerHost: string | null;
};

export type CapturePromotionAttributionResult =
  | { ok: true; needsCookie: false }
  | { ok: true; needsCookie: true; cookieToken: string }
  | { ok: false; error: "insert_failed" };

/** Repeat-visit path for an existing first-party cookie tied to this promotion. */
export async function tryRecordPromotionRepeatVisit(input: {
  promotionId: string;
  existingCookieToken: string | null | undefined;
}): Promise<boolean> {
  const token = input.existingCookieToken?.trim();
  if (!token || !isAttributionTokenUrlSafe(token)) {
    return false;
  }

  try {
    const row = await getAttributionByToken(token);
    if (!row || row.promotion_id !== input.promotionId) {
      return false;
    }

    await recordAttributionRepeatVisit(token);
    return true;
  } catch {
    console.error("[attribution/capture] repeat visit failed");
    return false;
  }
}

/** Initial capture or cookie rotation — returns cookie value for Route Handler to set. */
export async function createPromotionAttributionCapture(
  input: CapturePromotionAttributionInput,
): Promise<CapturePromotionAttributionResult> {
  try {
    const row = await insertAttributionRow({
      promotionId: input.promotionId,
      landingLocale: input.landingLocale,
      utm: input.utm,
      referrerHost: input.referrerHost,
    });

    return { ok: true, needsCookie: true, cookieToken: row.attribution_token };
  } catch {
    console.error("[attribution/capture] initial insert failed");
    return { ok: false, error: "insert_failed" };
  }
}

export { ATTRIBUTION_COOKIE_NAME, buildAttributionCookieOptions };
