export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import ProPageEditorClient from "@/components/specialist/pro/ProPageEditorClient";
import { getDictionary, isSupportedLang } from "@/lib/i18n";
import { loadSpecialistProPageEditor } from "@/lib/specialists/proPage/loadSpecialistProPageEditor";
import { requireProPageEditorAccessForSpecialist } from "@/lib/specialists/proPage/requireProPageEditorAccess";
import { getCurrentUserAndSpecialist } from "@/lib/specialists/server";
import { specialistLangHomePath } from "@/lib/specialists/navigation";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";

export default async function SpecialistProPageEditorPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolved = await Promise.resolve(params);
  const lang = isSupportedLang(resolved.lang) ? resolved.lang : "ru";
  const [{ specialist }, dict] = await Promise.all([
    getCurrentUserAndSpecialist(),
    getDictionary(lang),
  ]);

  if (specialist.status === "blocked") {
    redirect(specialistLangHomePath());
  }

  const access = await requireProPageEditorAccessForSpecialist(specialist.id);
  if (!access.ok) {
    redirect(`/${lang}/specialist/dashboard`);
  }

  const service = createServiceClient();
  const bundle = await loadSpecialistProPageEditor(service, specialist.id, lang);
  if (!bundle) {
    redirect(`/${lang}/specialist/dashboard`);
  }

  return (
    <ProPageEditorClient
      dict={dict}
      lang={lang}
      specialistId={specialist.id}
      publicSlug={bundle.publicSlug}
      initialBundle={bundle}
    />
  );
}
