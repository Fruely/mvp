import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSpecialistPublicSlug, hreflangSpecialist, specialistCanonicalUrl } from "@/lib/publicUrls";
import { resolvePublicSpecialistId } from "@/lib/specialists/publicProfile";
import { resolvePublicCanonicalSpecialistSlug } from "@/lib/specialists/matchPublicSpecialist";

export async function generateMetadata({
  params,
}: {
  params: { lang: string; id: string };
}): Promise<Metadata> {
  const { lang, id } = params;
  const resolvedId = await resolvePublicSpecialistId(id);
  const supabase = createSupabaseServerClient();
  const { data: row } = resolvedId
    ? await supabase.from("specialists").select("id, slug").eq("id", resolvedId).maybeSingle()
    : { data: null };

  const canonicalSlug = resolvePublicCanonicalSpecialistSlug(row?.slug ?? null);
  const specialist = {
    id: row?.id ?? id,
    slug: canonicalSlug ?? row?.slug ?? id,
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
