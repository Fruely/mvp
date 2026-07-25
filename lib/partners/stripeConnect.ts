import { partnerPayoutsEnabled } from "@/lib/partners/featureFlags";

export type StripeConnectAccountState = {
  stripeAccountId: string | null;
  onboardingStatus: "not_started" | "pending" | "complete" | "disabled";
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  lastSyncedAt: string | null;
};

export type StripeConnectStartResult =
  | { ok: true; url: string }
  | {
      ok: false;
      reason: "payouts_disabled" | "provider_not_configured" | "partner_required";
      message: string;
    };

/**
 * Boundary for Stripe Connect hosted onboarding.
 * Freuly must NOT collect IBAN / KYC — Stripe hosted onboarding does.
 * Live mode stays off until PARTNER_PAYOUTS_ENABLED=true and Connect credentials exist.
 */
export function getStripeConnectConfig() {
  return {
    payoutsEnabled: partnerPayoutsEnabled,
    hasSecret: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
    hasConnectClientId: Boolean(process.env.STRIPE_CONNECT_CLIENT_ID?.trim()),
  };
}

export function emptyConnectAccountState(): StripeConnectAccountState {
  return {
    stripeAccountId: null,
    onboardingStatus: "not_started",
    payoutsEnabled: false,
    detailsSubmitted: false,
    lastSyncedAt: null,
  };
}

export function mapPartnerConnectFields(row: {
  stripe_account_id?: string | null;
  stripe_onboarding_status?: string | null;
  stripe_payouts_enabled?: boolean | null;
  stripe_details_submitted?: boolean | null;
  stripe_last_synced_at?: string | null;
} | null): StripeConnectAccountState {
  if (!row) return emptyConnectAccountState();
  const status = row.stripe_onboarding_status;
  const onboardingStatus =
    status === "pending" || status === "complete" || status === "disabled"
      ? status
      : "not_started";
  return {
    stripeAccountId: row.stripe_account_id ?? null,
    onboardingStatus,
    payoutsEnabled: Boolean(row.stripe_payouts_enabled),
    detailsSubmitted: Boolean(row.stripe_details_submitted),
    lastSyncedAt: row.stripe_last_synced_at ?? null,
  };
}

export async function startStripeConnectOnboarding(input: {
  partnerId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<StripeConnectStartResult> {
  void input;
  const cfg = getStripeConnectConfig();

  if (!cfg.payoutsEnabled) {
    return {
      ok: false,
      reason: "payouts_disabled",
      message:
        "Partner payouts are not enabled yet. Referral and commissions still work; live payouts stay pending.",
    };
  }

  if (!cfg.hasSecret) {
    return {
      ok: false,
      reason: "provider_not_configured",
      message: "Stripe Connect credentials are not configured.",
    };
  }

  // Real Account Link creation is activated after production Stripe Connect setup.
  return {
    ok: false,
    reason: "provider_not_configured",
    message: "Stripe Connect onboarding adapter is ready but not live yet.",
  };
}

export function isStripeConnectReady(state: StripeConnectAccountState): boolean {
  return (
    partnerPayoutsEnabled &&
    Boolean(state.stripeAccountId) &&
    state.onboardingStatus === "complete" &&
    state.payoutsEnabled
  );
}
