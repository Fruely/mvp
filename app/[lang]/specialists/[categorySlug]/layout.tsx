import type { Metadata } from "next";
import { getDictionary, getDictValue, isSupportedLang, t } from "@/lib/i18n";
import {
  categoryCanonicalUrl,
  hreflangCategory,
  toPublicCategorySlug,
} from "@/lib/publicUrls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function hasPublicSpecialists(slug: string): Promise<boolean | null> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: category, error } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error) throw error;
    const categoryId = typeof category?.id === "string" ? category.id : "";
    if (!categoryId) return false;

    const counts = await getPublicSpecialistCountsByServiceCategory(supabase, [categoryId]);
    return (counts.get(categoryId) ?? 0) > 0;
  } catch (error) {
    // Fail open on transient backend errors so a temporary DB issue never emits noindex.
    console.error("[category metadata] public specialist count unavailable", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { lang: string; categorySlug: string };
}): Promise<Metadata> {
  const slug = toPublicCategorySlug(params.categorySlug);
  if (!slug) {
    return { robots: { index: false, follow: false } };
  }

  const lang = isSupportedLang(params.lang) ? params.lang : "ru";
  const dict = await getDictionary(lang);
  const categories = getDictValue(dict, "categories");
  const fromDict =
    categories && typeof categories === "object" && !Array.isArray(categories)
      ? (categories as Record<string, unknown>)[slug]
      : undefined;
  const label =
    typeof fromDict === "string" && fromDict.trim()
      ? fromDict.trim()
      : titleCaseSlug(slug);

  const canonical = categoryCanonicalUrl(lang, slug);
  const languages = hreflangCategory(slug);
  const publicInventory = await hasPublicSpecialists(slug);

  return {
    title: t(dict, "category.metaTitle").replace(/\{\{\s*name\s*\}\}/g, label),
    description: t(dict, "category.metaDescription").replace(/\{\{\s*name\s*\}\}/g, label),
    robots:
      publicInventory === false
        ? { index: false, follow: true }
        : { index: true, follow: true },
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      url: canonical,
      title: t(dict, "category.metaTitle").replace(/\{\{\s*name\s*\}\}/g, label),
      description: t(dict, "category.metaDescription").replace(/\{\{\s*name\s*\}\}/g, label),
    },
  };
}

export default function CategorySpecialistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
