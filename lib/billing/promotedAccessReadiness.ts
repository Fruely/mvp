import { getStripeEnvPresence } from "@/lib/billing/stripeConfig";
import { getPublicSiteUrlPresence } from "@/lib/billing/stripeReadiness";

export type PromotedAccessCheckoutReadiness = {
  ready: boolean;
  blockers: string[];
};

/** Promoted one-time checkout does not require subscription Price IDs. */
export function getPromotedAccessCheckoutReadiness(): PromotedAccessCheckoutReadiness {
  const stripeEnv = getStripeEnvPresence();
  const siteUrl = getPublicSiteUrlPresence();
  const blockers: string[] = [];

  if (process.env.PAYMENTS_ENABLED !== "true") blockers.push("payments_disabled");
  if (stripeEnv.secretKey === "absent") blockers.push("stripe_secret_key_missing");
  if (stripeEnv.webhookSecret === "absent") blockers.push("stripe_webhook_secret_missing");
  if (siteUrl === "absent") blockers.push("site_url_missing");

  return { ready: blockers.length === 0, blockers };
}

export function isPromotedAccessCheckoutReady(): boolean {
  return getPromotedAccessCheckoutReadiness().ready;
}
