import { notFound, redirect } from "next/navigation";
import ConversationThread from "@/components/selection/ConversationThread";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { loadConversationForViewer } from "@/lib/selection/view";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SpecialistConversationPage({
  params,
}: {
  params: { lang: string; conversationId: string } | Promise<{ lang: string; conversationId: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const { user, specialist } = await getCurrentUserAndSpecialist();
  if (!specialist?.id || specialist.status === "blocked" || !user?.id) redirect(specialistLangHomePath());

  const conversation = await loadConversationForViewer(createSupabaseServerClient(), {
    conversationId: resolved.conversationId,
    viewer: {
      actorUserId: user.id,
      actorSpecialistId: specialist.id,
      anonymousRequestId: null,
    },
  });
  if (!conversation || conversation.role !== "specialist") notFound();

  return <ConversationThread lang={lang} conversationId={conversation.id} messages={conversation.messages} />;
}
