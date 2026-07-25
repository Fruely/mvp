import Link from "next/link";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { getPartnerAgreement } from "@/content/partners/agreement";
import PartnerAgreementClient from "@/components/partners/PartnerAgreementClient";
import { createSupabaseServerComponentClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { getPartnerForUser } from "@/lib/partners/session";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function AgreementArticle({
  blocks,
}: {
  blocks: ReturnType<typeof getPartnerAgreement>["blocks"];
}) {
  return (
    <article className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      {blocks.map((block, index) => {
        if (block.type === "h2") {
          return (
            <h2 key={index} className="text-lg font-semibold text-gray-900">
              {block.text}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-gray-700">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="text-gray-700 leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </article>
  );
}

export default async function PartnerAgreementPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) return null;
  const lang = params.lang as Lang;
  const dict = await getDictionary(lang);
  const doc = getPartnerAgreement(lang);

  const auth = createSupabaseServerComponentClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  const partner = user
    ? await getPartnerForUser(user.id, createServiceClient())
    : null;

  // Public can read the agreement; only bound partners can accept.
  if (!partner) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <header className="space-y-2">
          <p className="text-sm font-medium text-indigo-700">
            {t(dict, "partner.agreement.versionLabel")}: {doc.version}
            {" · "}
            {t(dict, "partner.agreement.effectiveLabel")}: {doc.effectiveDate}
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">{doc.title}</h1>
          {doc.governingNote ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              {doc.governingNote}
            </p>
          ) : null}
        </header>
        <AgreementArticle blocks={doc.blocks} />
        <p className="text-sm text-gray-600">{t(dict, "partner.agreement.publicHint")}</p>
        <Link
          href={`/${lang}/partners/onboarding`}
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t(dict, "partner.public.becomeCta")}
        </Link>
      </div>
    );
  }

  return (
    <PartnerAgreementClient
      lang={lang}
      dict={dict}
      version={doc.version}
      effectiveDate={doc.effectiveDate}
      title={doc.title}
      governingNote={doc.governingNote}
      blocks={doc.blocks}
      alreadyAccepted={Boolean(partner.contract_signed_at)}
    />
  );
}
