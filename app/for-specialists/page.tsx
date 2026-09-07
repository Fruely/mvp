import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ForSpecialistsView } from "./ForSpecialistsView";
import { FOR_SPECIALISTS_COPY } from "./copy";
import { langFromCookie, type Lang } from "@/lib/i18n";

import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

const LANG_COOKIE = "freuly_lang";

async function resolveLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LANG_COOKIE)?.value ?? "";
  return langFromCookie(raw);
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await resolveLang();
  const m = FOR_SPECIALISTS_COPY[lang].meta;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: `${SITE_DOMAIN}/${lang}/for-specialists` },
  };
}

export default async function ForSpecialistsPage() {
  const lang = await resolveLang();
  return <ForSpecialistsView lang={lang} />;
}
