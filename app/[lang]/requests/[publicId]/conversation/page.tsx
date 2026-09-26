import { notFound } from "next/navigation";
import ConversationThread from "@/components/selection/ConversationThread";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { readRequestAccessToken } from "@/lib/selection/accessCookie";
import { loadConversationForViewer, loadOwnedRequestView, resolveViewer } from "@/lib/selection/view";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PUBLIC_ID = /^REQ-[0-9]{8}-[A-Z0-9]{6}$/;

export default async function ClientConversationPage({
  params,
}: {
  params: { lang: string; publicId: string } | Promise<{ lang: string; publicId: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const publicId = decodeURIComponent(resolved.publicId ?? "").trim();
  if (!PUBLIC_ID.test(publicId)) notFound();

  const session = createSupabaseServerComponentClient();
  const { data } = await session.auth.getUser();
  const supabase = createSupabaseServerClient();
  const viewer = await resolveViewer(supabase, {
    sessionUserId: data.user?.id ?? null,
    accessToken: readRequestAccessToken(),
  });
  const request = await loadOwnedRequestView(supabase, { publicId, viewer, locale: lang });
  if ("error" in request || !request.conversationId) notFound();
  const conversation = await loadConversationForViewer(supabase, {
    conversationId: request.conversationId,
    viewer,
  });
  if (!conversation || conversation.role !== "client") notFound();

  return <ConversationThread lang={lang} conversationId={conversation.id} messages={conversation.messages} />;
}
