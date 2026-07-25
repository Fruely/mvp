import type { PartnerRow } from "@/lib/partners/types";

/**
 * Logical onboarding steps (mapped onto existing partners.status + contract_signed_at).
 * Does not invent a second entity.
 *
 * invited                  → partner row exists, user_id null
 * agreement_pending        → user bound, contract_signed_at null
 * payout_onboarding_pending→ agreement accepted; Stripe Connect not ready (non-blocking)
 * active                   → status active + agreement accepted
 * suspended                → status paused
 * closed                   → status disabled / rejected
 */
export type PartnerOnboardingStep =
  | "invited"
  | "agreement_pending"
  | "payout_onboarding_pending"
  | "active"
  | "suspended"
  | "closed";

export type PartnerOnboardingDecision = {
  step: PartnerOnboardingStep;
  /** Next path relative to lang, e.g. /partners/agreement */
  nextPath: string;
  /** Referral link may be shown / used for attribution */
  referralAllowed: boolean;
  /** Live Stripe payouts may be requested */
  payoutsReady: boolean;
};

export function resolvePartnerOnboarding(
  partner: Pick<PartnerRow, "user_id" | "status" | "contract_signed_at"> | null,
  options?: { payoutsEnabled?: boolean; stripeReady?: boolean }
): PartnerOnboardingDecision {
  const payoutsEnabled = options?.payoutsEnabled === true;
  const stripeReady = options?.stripeReady === true;

  if (!partner) {
    return {
      step: "invited",
      nextPath: "/partners",
      referralAllowed: false,
      payoutsReady: false,
    };
  }

  if (partner.status === "disabled" || partner.status === "rejected") {
    return {
      step: "closed",
      nextPath: "/partners",
      referralAllowed: false,
      payoutsReady: false,
    };
  }

  if (partner.status === "paused") {
    return {
      step: "suspended",
      nextPath: "/partner/dashboard",
      referralAllowed: false,
      payoutsReady: false,
    };
  }

  if (!partner.user_id) {
    return {
      step: "invited",
      nextPath: "/partner/claim",
      referralAllowed: false,
      payoutsReady: false,
    };
  }

  if (!partner.contract_signed_at) {
    return {
      step: "agreement_pending",
      nextPath: "/partners/agreement",
      referralAllowed: false,
      payoutsReady: false,
    };
  }

  // Agreement accepted: attribution/referral allowed even if payouts are not live.
  const referralAllowed = partner.status === "active" || partner.status === "pending";

  if (payoutsEnabled && !stripeReady) {
    return {
      step: "payout_onboarding_pending",
      nextPath: "/partners/payout-onboarding",
      referralAllowed,
      payoutsReady: false,
    };
  }

  if (partner.status === "active") {
    return {
      step: "active",
      nextPath: "/partner/dashboard",
      referralAllowed: true,
      payoutsReady: payoutsEnabled && stripeReady,
    };
  }

  // pending + agreement: treat as able to continue to dashboard after activation side-effect
  return {
    step: "payout_onboarding_pending",
    nextPath: "/partners/payout-onboarding",
    referralAllowed,
    payoutsReady: false,
  };
}

export function partnerOnboardingHref(lang: string, nextPath: string): string {
  const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `/${lang}${path}`;
}
