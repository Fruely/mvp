import { redirect } from "next/navigation";
import { Suspense } from "react";
import HomeClient from "./HomeClient";
import LatestContentPostsSection from "@/components/content/LatestContentPostsSection";
import MobileLatestPostAnnouncement from "@/components/content/MobileLatestPostAnnouncement";
import { getDictionary, isSupportedLang, type Lang } from "@/lib/i18n";
import { HOME_METADATA, HREFLANG_HOME, SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { loadHomepageInitialData } from "@/lib/homepage/loadHomepageInitialData";
import { serializeHomepageInitialData } from "@/lib/homepage/serializeHomepageInitialData";

export const revalidate = 300;

export function generateStaticParams() {
  return [{ lang: "ua" }, { lang: "ru" }, { lang: "de" }];
}

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

export default async function LangHomePage({ params }: { params: { lang: string } }) {
  if (!isSupportedLang(params.lang)) {
    redirect("/ua");
  }

  const lang = params.lang as Lang;
  const [dict, initialData] = await Promise.all([
    getDictionary(lang),
    loadHomepageInitialData(lang),
  ]);

  return (
    <>
      <MobileLatestPostAnnouncement lang={lang} post={initialData.latestPosts?.[0]} />
      <HomeClient
        lang={lang}
        dict={dict}
        initialData={serializeHomepageInitialData(initialData)}
      />
      <LatestContentPostsSection lang={lang} posts={initialData.latestPosts ?? []} />
    </>
  );
}
