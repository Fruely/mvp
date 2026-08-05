import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROMOTED_ACCESS_GRANT_ACTIVE_SELECT,
  PROMOTION_EXISTS_SELECT,
  SIGNUP_BINDING_CHECKOUT_SELECT,
} from "./promotedAccessConstants";

export type SignupBindingCheckoutRow = {
  id: string;
  promotion_id: string;
  specialist_id: string;
  user_id: string;
};

export async function getSignupBindingForCheckout(
  supabase: SupabaseClient,
  specialistId: string,
): Promise<SignupBindingCheckoutRow | null> {
  const { data, error } = await supabase
    .from("service_request_promotion_signup_bindings")
    .select(SIGNUP_BINDING_CHECKOUT_SELECT)
    .eq("specialist_id", specialistId)
    .maybeSingle();

  if (error) {
    throw new Error("binding_lookup_failed");
  }

  return (data as SignupBindingCheckoutRow | null) ?? null;
}

export async function promotionExistsForCheckout(
  supabase: SupabaseClient,
  promotionId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("service_request_promotions")
    .select(PROMOTION_EXISTS_SELECT)
    .eq("id", promotionId)
    .maybeSingle();

  if (error) {
    throw new Error("promotion_lookup_failed");
  }

  return Boolean(data?.id);
}

export async function hasActivePromotedAccessGrant(
  supabase: SupabaseClient,
  input: { specialistId: string; promotionId: string },
): Promise<boolean> {
  const { data, error } = await supabase
    .from("promoted_request_access_grants")
    .select(PROMOTED_ACCESS_GRANT_ACTIVE_SELECT)
    .eq("specialist_id", input.specialistId)
    .eq("promotion_id", input.promotionId)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("access_grant_lookup_failed");
  }

  return Boolean(data?.id);
}
