import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ATTRIBUTION_SIGNUP_BIND_LOOKUP_SELECT } from "./attributionConstants";
import { isAttributionTokenUrlSafe, isUniqueViolation } from "./attributionToken";

export type PromotionSignupBindStatus =
  | "bound"
  | "no_cookie"
  | "invalid_cookie"
  | "missing_attribution"
  | "duplicate"
  | "db_error";

export type PromotionSignupBindResult = {
  status: PromotionSignupBindStatus;
  clearCookie: boolean;
};

function logBindStatus(status: PromotionSignupBindStatus) {
  console.info(`[promotion/signup-bind] ${status}`);
}

/**
 * Best-effort immutable signup binding from first-party attribution cookie.
 * Never throws; never reads promotion_id from client input.
 */
export async function tryBindPromotionAttributionFromCookie(input: {
  cookieRaw: string | undefined | null;
  userId: string;
  specialistId: string;
  supabase?: SupabaseClient;
}): Promise<PromotionSignupBindResult> {
  if (!input.cookieRaw?.trim()) {
    logBindStatus("no_cookie");
    return { status: "no_cookie", clearCookie: false };
  }

  const token = input.cookieRaw.trim();
  if (!isAttributionTokenUrlSafe(token)) {
    logBindStatus("invalid_cookie");
    return { status: "invalid_cookie", clearCookie: true };
  }

  const supabase = input.supabase ?? createSupabaseServerClient();

  const { data: attribution, error: lookupError } = await supabase
    .from("service_request_promotion_attributions")
    .select(ATTRIBUTION_SIGNUP_BIND_LOOKUP_SELECT)
    .eq("attribution_token", token)
    .maybeSingle();

  if (lookupError) {
    logBindStatus("db_error");
    return { status: "db_error", clearCookie: false };
  }

  if (!attribution?.id || !attribution?.promotion_id) {
    logBindStatus("missing_attribution");
    return { status: "missing_attribution", clearCookie: true };
  }

  const { error: insertError } = await supabase
    .from("service_request_promotion_signup_bindings")
    .insert({
      attribution_id: attribution.id,
      promotion_id: attribution.promotion_id,
      specialist_id: input.specialistId,
      user_id: input.userId,
      registered_at: new Date().toISOString(),
    });

  if (!insertError) {
    logBindStatus("bound");
    return { status: "bound", clearCookie: true };
  }

  if (isUniqueViolation(insertError)) {
    logBindStatus("duplicate");
    return { status: "duplicate", clearCookie: true };
  }

  logBindStatus("db_error");
  return { status: "db_error", clearCookie: false };
}
