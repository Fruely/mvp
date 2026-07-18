import { Suspense } from "react";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { requirePartnerSession } from "@/lib/partners/session";
import PartnerDashboardClient from "@/components/partners/PartnerDashboardClient";

export const dynamic = "force-dynamic";

export default async function PartnerDashboardPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;

  await requirePartnerSession({ lang });
  const dict = await getDictionary(lang);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-10 text-sm text-gray-500">Loading…</div>
      }
    >
      <PartnerDashboardClient lang={lang} dict={dict} />
    </Suspense>
  );
}
