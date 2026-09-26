import { redirect } from "next/navigation";
import InboxView from "@/components/inbox/InboxView";
import { loadInbox } from "@/lib/inbox/loadInbox";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientInboxPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const session = createSupabaseServerComponentClient();
  const { data } = await session.auth.getUser();
  if (!data.user?.id) redirect(`/login?next=${encodeURIComponent(`/${lang}/requests`)}`);
  const model = await loadInbox(createSupabaseServerClient(), data.user.id);
  return <InboxView model={model} lang={lang} audience="client" />;
}
