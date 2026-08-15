import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ForSpecialistsView } from "./ForSpecialistsView";
import { FOR_SPECIALISTS_COPY } from "./copy";
import { isSupportedLang, langFromCookie, type Lang } from "@/lib/i18n";

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
  };
}

export default async function ForSpecialistsPage() {
  const lang = await resolveLang();
  return <ForSpecialistsView lang={lang} />;
}
