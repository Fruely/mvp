import { Suspense } from "react";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import PartnerClaimClient from "@/components/partners/PartnerClaimClient";

export const dynamic = "force-dynamic";

export default async function PartnerClaimPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-10 text-sm text-gray-500">Loading…</div>
      }
    >
      <PartnerClaimClient lang={lang} dict={dict} />
    </Suspense>
  );
}
