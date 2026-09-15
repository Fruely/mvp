import "server-only";

import { isDirectLeadPplCheckoutEnabled } from "@/lib/leadEngine/accessDecision";

export function isRequestOfferCheckoutReady(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    isDirectLeadPplCheckoutEnabled(env) &&
      env.STRIPE_SECRET_KEY?.trim() &&
      env.NEXT_PUBLIC_SITE_URL?.trim(),
  );
}
