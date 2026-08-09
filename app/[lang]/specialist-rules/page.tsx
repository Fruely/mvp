import type { Metadata } from "next";
import { resolveLegalPublicLang } from "@/content/legal";
import { getSpecialistRulesDocument } from "@/content/legal/reviewDocuments";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { SITE_DOMAIN, hreflangSpecialistRules } from "@/lib/seo/siteMetadata";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getSpecialistRulesDocument(lang);
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/specialist-rules`,
      languages: { ...hreflangSpecialistRules() },
    },
  };
}

export default function SpecialistRulesPage({ params }: { params: { lang: string } }) {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getSpecialistRulesDocument(lang);
  return <LegalDocumentView document={doc} />;
}
