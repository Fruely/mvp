import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";

const LEGACY_SLUGS: Record<string, string> = {
  "zkeiy-lbztieh": "cosmetologists-kassel-irina-melnik",
  "nhliy-oyimbzeae": "psychologists-oksana-pantelidi",
  "mymyzth-sbtbih": "business-kirchhundem-natalya-sheshenya",
};

export async function generateMetadata({
  params,
}: {
  params: { lang: string; id: string };
}): Promise<Metadata> {
  const { lang, id } = params;

  if (id in LEGACY_SLUGS) {
    redirect(`/${lang}/specialist/${LEGACY_SLUGS[id]}`);
  }
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id);

  let slug = isUuid ? null : id;

  if (isUuid) {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("specialists")
      .select("slug")
      .eq("id", id)
      .maybeSingle();
    if (data?.slug) slug = data.slug;
  }

  const segment = encodeURIComponent((slug || id).trim());

  return {
    alternates: {
      canonical: `${SITE_DOMAIN}/${lang}/specialist/${segment}`,
      languages: {
        "x-default": `${SITE_DOMAIN}/ru/specialist/${segment}`,
        ru: `${SITE_DOMAIN}/ru/specialist/${segment}`,
        uk: `${SITE_DOMAIN}/ua/specialist/${segment}`,
        de: `${SITE_DOMAIN}/de/specialist/${segment}`,
      },
    },
  };
}

export default function SpecialistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
