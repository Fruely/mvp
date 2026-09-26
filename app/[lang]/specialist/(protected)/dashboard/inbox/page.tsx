import { redirect } from "next/navigation";
import InboxView from "@/components/inbox/InboxView";
import { loadInbox } from "@/lib/inbox/loadInbox";
import { resolveRouteLang, type Lang } from "@/lib/i18n";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang: Lang = resolveRouteLang(resolved.lang);
  const { user, specialist } = await getCurrentUserAndSpecialist();
  if (!specialist?.id || specialist.status === "blocked" || !user?.id) redirect(specialistLangHomePath());

  const model = await loadInbox(createSupabaseServerClient(), user.id);
  return <InboxView model={model} lang={lang} />;
}
