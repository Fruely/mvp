import type { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";
import LatestContentPostsSection from "@/components/content/LatestContentPostsSection";
import MobileLatestPostAnnouncement from "@/components/content/MobileLatestPostAnnouncement";
import { getDictionary, type Lang } from "@/lib/i18n";
import { HOME_METADATA, HREFLANG_HOME, SITE_ROOT_URL } from "@/lib/seo/siteMetadata";
import { loadHomepageInitialData } from "@/lib/homepage/loadHomepageInitialData";
import { serializeHomepageInitialData } from "@/lib/homepage/serializeHomepageInitialData";
import HomeClient from "./[lang]/HomeClient";

const ROOT_LANG: Lang = "ru";

export const revalidate = 300;

export const metadata: Metadata = {
  title: HOME_METADATA[ROOT_LANG].title,
  description: HOME_METADATA[ROOT_LANG].description,
  alternates: {
    canonical: SITE_ROOT_URL,
    languages: HREFLANG_HOME,
  },
};

export default async function Page() {
  const [dict, initialData] = await Promise.all([
    getDictionary(ROOT_LANG),
    loadHomepageInitialData(ROOT_LANG),
  ]);

  return (
    <div className="min-h-[100dvh] bg-freuly-page">
      <Suspense fallback={<div className="h-9 border-b border-gray-100 bg-white/40" />}>
        <LanguageBar />
      </Suspense>
      <Header lang={ROOT_LANG} dict={dict} />
      <MobileLatestPostAnnouncement lang={ROOT_LANG} post={initialData.latestPosts?.[0]} />
      <HomeClient
        lang={ROOT_LANG}
        dict={dict}
        initialData={serializeHomepageInitialData(initialData)}
      />
      <LatestContentPostsSection lang={ROOT_LANG} posts={initialData.latestPosts ?? []} />
      <Footer dict={dict} lang={ROOT_LANG} />
    </div>
  );
}
