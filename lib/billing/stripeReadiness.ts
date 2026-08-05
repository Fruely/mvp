import { paymentsEnabled } from "@/lib/billing/featureFlags";
import { listConfiguredPaidPlans } from "@/lib/billing/planConfig";
import { getStripeEnvPresence } from "@/lib/billing/stripeConfig";

export type EnvPresence = "present" | "absent" | "unknown";

export type StripeCheckoutReadiness = {
  ready: boolean;
  blockers: string[];
  env: {
    stripeSecretKey: EnvPresence;
    stripeWebhookSecret: EnvPresence;
    siteUrl: EnvPresence;
    paymentsEnabled: boolean;
    configuredMonthlyPlans: number;
    configuredAnnualPlans: number;
  };
};

export function getPublicSiteUrlPresence(): EnvPresence {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return url ? "present" : "absent";
}

/** Production checkout is available only when all required config is present. */
export function getStripeCheckoutReadiness(): StripeCheckoutReadiness {
  const stripeEnv = getStripeEnvPresence();
  const siteUrl = getPublicSiteUrlPresence();
  const configured = listConfiguredPaidPlans();
  const monthlyCount = configured.filter((p) => p.billingInterval === "month").length;

  const blockers: string[] = [];
  if (!paymentsEnabled) blockers.push("payments_disabled");
  if (stripeEnv.secretKey === "absent") blockers.push("stripe_secret_key_missing");
  if (stripeEnv.webhookSecret === "absent") blockers.push("stripe_webhook_secret_missing");
  if (siteUrl === "absent") blockers.push("site_url_missing");
  if (monthlyCount === 0) blockers.push("no_monthly_stripe_price_configured");

  return {
    ready: blockers.length === 0,
    blockers,
    env: {
      stripeSecretKey: stripeEnv.secretKey,
      stripeWebhookSecret: stripeEnv.webhookSecret,
      siteUrl,
      paymentsEnabled,
      configuredMonthlyPlans: monthlyCount,
      configuredAnnualPlans: configured.filter((p) => p.billingInterval === "year").length,
    },
  };
}

export function isStripeCheckoutReady(): boolean {
  return getStripeCheckoutReadiness().ready;
}
