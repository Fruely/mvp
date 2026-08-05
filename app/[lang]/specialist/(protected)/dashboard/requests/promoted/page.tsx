import { redirect } from "next/navigation";
import PromotedRequestPageView from "@/components/serviceRequests/PromotedRequestPageView";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { loadPromotedRequestPageData } from "@/lib/serviceRequests/promotedRequestPageData";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpecialistPromotedRequestPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = isSupportedLang(resolved.lang) ? resolved.lang : "ua";
  const dict = await getDictionary(lang);

  const { user, specialist } = await getCurrentUserAndSpecialist();
  const service = createServiceClient();

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const model = await loadPromotedRequestPageData(service, {
    specialistId: specialist.id,
    userId: user.id,
  });

  return <PromotedRequestPageView model={model} lang={lang} dict={dict} />;
}
