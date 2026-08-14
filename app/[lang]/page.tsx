import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { HOME_METADATA, HREFLANG_HOME, SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { loadHomepageInitialData } from "@/lib/homepage/loadHomepageInitialData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang =
    params.lang === "ua" || params.lang === "ru" || params.lang === "de" ? params.lang : "ua";
  const canonical = `${SITE_DOMAIN}/${lang}`;
  const seo = HOME_METADATA[lang];

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical,
      languages: { ...HREFLANG_HOME },
    },
  };
}

export default async function LangHomePage({
  params,
  searchParams,
}: {
  params: { lang: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua");
  }

  const lang = params.lang as Lang;
  const [dict, initialData] = await Promise.all([
    getDictionary(lang),
    loadHomepageInitialData(lang),
  ]);
  const place = typeof searchParams?.place === "string" ? searchParams.place : undefined;

  return (
    <HomeClient lang={lang} dict={dict} place={place} initialData={initialData} />
  );
}
