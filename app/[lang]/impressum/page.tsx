import type { Metadata } from "next";
import { getImpressumDocument, resolveLegalPublicLang } from "@/content/legal";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { impressumPath } from "@/lib/legal/paths";
import { SITE_DOMAIN, hreflangImpressum } from "@/lib/seo/siteMetadata";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getImpressumDocument(lang);
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: `${SITE_DOMAIN}${impressumPath(lang)}`,
      languages: { ...hreflangImpressum() },
    },
  };
}

export default function ImpressumPage({ params }: { params: { lang: string } }) {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getImpressumDocument(lang);
  return <LegalDocumentView document={doc} />;
}
