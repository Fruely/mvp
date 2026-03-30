import { isSupportedLang, type Lang } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import CategorySeoPage from "@/components/seo/CategorySeoPage";
import {
  SLUG,
  FILTER_OR,
  META,
  SUBCATEGORIES,
  CROSS_LINKS,
  SeoContent,
} from "@/content/seo/categories/touren-ausfluege";

export const dynamic = "force-dynamic";

const DOMAIN = process.env.APP_URL || "https://freuly.de";

export async function generateMetadata({ params }: { params: { lang: string } }) {
  const lang = isSupportedLang(params.lang) ? (params.lang as Lang) : "de";
  const m = META[lang];
  return {
    title: m.metaTitle,
    description: m.metaDescription,
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

export default async function TourenAusfluegePage({
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
    .or(FILTER_OR)
    .limit(12);

  return (
    <CategorySeoPage
      lang={lang}
      slug={SLUG}
      copy={META[lang]}
      subcategories={SUBCATEGORIES}
      crossLinks={CROSS_LINKS}
      specialists={data ?? []}
      seoContent={<SeoContent lang={lang} />}
    />
  );
}
