import type { Metadata } from "next";
import { getDatenschutzDocument, resolveLegalPublicLang } from "@/content/legal";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { privacyPath } from "@/lib/legal/paths";
import { SITE_DOMAIN, hreflangDatenschutz } from "@/lib/seo/siteMetadata";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getDatenschutzDocument(lang);
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: `${SITE_DOMAIN}${privacyPath(lang)}`,
      languages: { ...hreflangDatenschutz() },
    },
  };
}

export default function DatenschutzPage({ params }: { params: { lang: string } }) {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getDatenschutzDocument(lang);
  return <LegalDocumentView document={doc} />;
}
