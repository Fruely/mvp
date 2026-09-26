import { notFound, redirect } from "next/navigation";
import MatchDetailView from "@/components/serviceRequests/MatchDetailView";
import { loadMatchDetail } from "@/lib/inbox/loadMatchDetail";
import { openOwnMatch } from "@/lib/inbox/respond";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchedRequestDetailPage({
  params,
}: {
  params: { lang: string; matchId: string } | Promise<{ lang: string; matchId: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const { user, specialist } = await getCurrentUserAndSpecialist();
  if (!specialist?.id || specialist.status === "blocked") redirect(specialistLangHomePath());

  const supabase = createSupabaseServerClient();
  const model = await loadMatchDetail(supabase, {
    matchId: resolved.matchId,
    specialistId: specialist.id,
    lang,
  });
  if (model.status === "not_found" || model.status === "forbidden") notFound();
  if (model.status === "error") {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-center" role="alert">
        <h1 className="text-lg font-semibold text-gray-900">
          {lang === "de" ? "Anfrage konnte nicht geladen werden" : lang === "ua" ? "Не вдалося завантажити заявку" : "Не удалось загрузить заявку"}
        </h1>
      </section>
    );
  }

  if (user?.id) {
    await openOwnMatch(supabase, {
      matchId: resolved.matchId,
      specialistId: specialist.id,
      userId: user.id,
    });
  }

  return <MatchDetailView detail={model.detail} lang={lang} />;
}
