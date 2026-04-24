import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForSpecialistsView } from "@/app/for-specialists/ForSpecialistsView";
import { FOR_SPECIALISTS_COPY } from "@/app/for-specialists/copy";
import { isSupportedLang, type Lang } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const m = FOR_SPECIALISTS_COPY[lang].meta;
  return {
    title: m.title,
    description: m.description,
  };
}

export default async function LangForSpecialistsPage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua/for-specialists");
  }
  return <ForSpecialistsView lang={params.lang as Lang} />;
}
