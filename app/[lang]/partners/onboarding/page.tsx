import { redirect } from "next/navigation";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { partnerPayoutsEnabled } from "@/lib/partners/featureFlags";
import {
  partnerOnboardingHref,
  resolvePartnerOnboarding,
} from "@/lib/partners/onboarding";
import { getPartnerForUser } from "@/lib/partners/session";
import { isStripeConnectReady, mapPartnerConnectFields } from "@/lib/partners/stripeConnect";

export const dynamic = "force-dynamic";

/**
 * Convergence point for public CTA and post-auth return.
 * Invite flow also lands here after claim.
 */
export default async function PartnerOnboardingPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;

  const auth = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    redirect(`/${lang}/login?next=/${lang}/partners/onboarding`);
  }

  const partner = await getPartnerForUser(user.id, createServiceClient());
  if (!partner) {
    // Public self-serve: agreement acceptance creates + activates the partner.
    redirect(`/${lang}/partners/agreement`);
  }

  const connect = mapPartnerConnectFields(partner);
  const decision = resolvePartnerOnboarding(partner, {
    payoutsEnabled: partnerPayoutsEnabled,
    stripeReady: isStripeConnectReady(connect),
  });

  // Soft payout step: when payouts disabled, skip straight to dashboard after agreement.
  if (
    decision.step === "payout_onboarding_pending" &&
    !partnerPayoutsEnabled &&
    partner.contract_signed_at
  ) {
    redirect(`/${lang}/partner/dashboard`);
  }

  redirect(partnerOnboardingHref(lang, decision.nextPath));
}
