import { redirect } from "next/navigation";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import PartnerPayoutOnboardingClient from "@/components/partners/PartnerPayoutOnboardingClient";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { partnerPayoutsEnabled } from "@/lib/partners/featureFlags";
import { getPartnerForUser } from "@/lib/partners/session";
import { mapPartnerConnectFields } from "@/lib/partners/stripeConnect";

export const dynamic = "force-dynamic";

export default async function PartnerPayoutOnboardingPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);

  const auth = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect(`/${lang}/partner/claim`);

  const partner = await getPartnerForUser(user.id, createServiceClient());
  if (!partner) redirect(`/${lang}/partners#apply`);
  if (!partner.contract_signed_at) redirect(`/${lang}/partners/agreement`);

  return (
    <PartnerPayoutOnboardingClient
      lang={lang}
      dict={dict}
      payoutsEnabled={partnerPayoutsEnabled}
      connect={mapPartnerConnectFields(partner)}
      referralCode={partner.referral_code}
    />
  );
}
