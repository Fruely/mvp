import { redirect } from "next/navigation";
import MatchedRequestsView from "@/components/serviceRequests/MatchedRequestsView";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { loadMatchedRequests } from "@/lib/matching/loadMatchedRequests";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchedRequestsPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const { specialist } = await getCurrentUserAndSpecialist();
  if (!specialist?.id || specialist.status === "blocked") redirect(specialistLangHomePath());

  const model = await loadMatchedRequests(createSupabaseServerClient(), {
    specialistId: specialist.id,
    lang,
  });

  return <MatchedRequestsView model={model} lang={lang} />;
}
