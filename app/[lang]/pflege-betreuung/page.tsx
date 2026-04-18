import { isSupportedLang, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import CategoryContentPage from "@/components/seo/CategoryContentPage";
import { pflegeBetreuungContent } from "@/content/seo/v2/pflege-betreuung.content";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.APP_URL || "https://freuly.de";
const SLUG = pflegeBetreuungContent.slug;

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? (params.lang as Lang) : "de";
  const c = pflegeBetreuungContent.content[lang];
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: {
      canonical: `${DOMAIN}/${lang}/${SLUG}`,
      languages: {
        de: `${DOMAIN}/de/${SLUG}`,
        ru: `${DOMAIN}/ru/${SLUG}`,
        ua: `${DOMAIN}/ua/${SLUG}`,
        "x-default": `${DOMAIN}/de/${SLUG}`,
      },
    },
  };
}

export default async function PflegeBetreuungPage({
  params,
}: {
  params: { lang: string };
}) {
  if (!isSupportedLang(params.lang)) redirect(`/de/${SLUG}`);
  const lang = params.lang as Lang;

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("specialists")
    .select("id, slug, name, city, postal_code, bio")
    .eq("is_active", true)
    .eq("is_visible", true)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .or(pflegeBetreuungContent.filterOr ?? "")
    .limit(12);

  return (
    <CategoryContentPage
      lang={lang}
      content={pflegeBetreuungContent.content[lang]}
      specialists={data ?? []}
    />
  );
}
