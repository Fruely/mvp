import type { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LanguageBar from "@/components/LanguageBar";
import { getDictionary, type Lang } from "@/lib/i18n";
import { HOME_METADATA, HREFLANG_HOME, SITE_ROOT_URL } from "@/lib/seo/siteMetadata";
import HomeClient from "./[lang]/HomeClient";

const ROOT_LANG: Lang = "ru";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: HOME_METADATA[ROOT_LANG].title,
  description: HOME_METADATA[ROOT_LANG].description,
  alternates: {
    canonical: SITE_ROOT_URL,
    languages: HREFLANG_HOME,
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dict = await getDictionary(ROOT_LANG);
  const place = typeof searchParams?.place === "string" ? searchParams.place : undefined;

  return (
    <div className="min-h-[100dvh] bg-freuly-page">
      <Suspense fallback={<div className="h-9 border-b border-gray-100 bg-white/40" />}>
        <LanguageBar />
      </Suspense>
      <Header lang={ROOT_LANG} dict={dict} />
      <HomeClient lang={ROOT_LANG} dict={dict} place={place} />
      <Footer dict={dict} lang={ROOT_LANG} />
    </div>
  );
}
