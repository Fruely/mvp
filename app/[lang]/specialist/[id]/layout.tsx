import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DOMAIN = "https://freuly.de";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; id: string };
}): Promise<Metadata> {
  const { lang, id } = params;
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

  const segment = slug || id;

  return {
    alternates: {
      canonical: `${DOMAIN}/${lang}/specialist/${segment}`,
      languages: {
        ru: `${DOMAIN}/ru/specialist/${segment}`,
        uk: `${DOMAIN}/ua/specialist/${segment}`,
        de: `${DOMAIN}/de/specialist/${segment}`,
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
