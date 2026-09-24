import { redirect } from "next/navigation";
import ForYouRequestsView from "@/components/serviceRequests/ForYouRequestsView";
import { getDictionary, resolveRouteLang, type Lang } from "@/lib/i18n";
import { loadForYouRequests } from "@/lib/serviceRequests/forYouRequests";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpecialistForYouRequestsPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const dict = await getDictionary(lang);
  const { specialist } = await getCurrentUserAndSpecialist();

  if (specialist.status === "blocked") redirect(specialistLangHomePath());

  const model = await loadForYouRequests(createServiceClient(), {
    specialistId: specialist.id,
    lang,
  });

  return <ForYouRequestsView model={model} lang={lang} dict={dict} />;
}
