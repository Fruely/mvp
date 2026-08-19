import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSpecialistPublicSlug, hreflangSpecialist, specialistCanonicalUrl } from "@/lib/publicUrls";
import { resolvePublicSpecialistId } from "@/lib/specialists/publicProfile";
import { mapLegacySpecialistSlug } from "@/lib/specialists/legacySlugs";
import { persistedCanonicalSpecialistSlug } from "@/lib/specialists/canonicalSlug";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; id: string };
}): Promise<Metadata> {
  const { lang, id } = params;
  const identifier = mapLegacySpecialistSlug(id) ?? id;
  const resolvedId = await resolvePublicSpecialistId(identifier);
  const supabase = createSupabaseServerClient();
  const { data: row } = resolvedId
    ? await supabase.from("specialists").select("id, slug").eq("id", resolvedId).maybeSingle()
    : { data: null };

  const slug = persistedCanonicalSpecialistSlug(row?.slug) ?? persistedCanonicalSpecialistSlug(identifier);
  const specialist = {
    id: row?.id ?? identifier,
    slug: slug ?? row?.slug ?? identifier,
  };
  const segment = getSpecialistPublicSlug(specialist);
  const canonical = specialistCanonicalUrl(lang as "ru" | "ua" | "de", specialist);

  return {
    alternates: {
      canonical,
      languages: hreflangSpecialist(segment),
    },
    openGraph: {
      url: canonical,
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
