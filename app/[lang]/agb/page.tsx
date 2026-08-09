import { NextRequest, NextResponse } from "next/server";
import { resolveLegalPublicLang } from "@/content/legal";
import { getAgbDocument } from "@/content/legal/reviewDocuments";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { agbPath } from "@/lib/legal/paths";
import { SITE_DOMAIN, hreflangAgb } from "@/lib/seo/siteMetadata";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getAgbDocument(lang);
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: {
      canonical: `${SITE_DOMAIN}${agbPath(lang)}`,
      languages: hreflangAgb(),
    },
  };
}

export default function AgbPage({ params }: { params: { lang: string } }) {
  const lang = resolveLegalPublicLang(params.lang);
  const doc = getAgbDocument(lang);
  return <LegalDocumentView document={doc} />;
}
