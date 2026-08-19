import type { MetadataRoute } from "next";
import { SEO_CATEGORY_SLUGS } from "@/content/seo/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { isAsciiPublicPath, isAsciiSlug } from "@/lib/publicUrls";
import { isExcludedFromPublicCategoryListing } from "@/lib/categories/uncategorizedSpecialistCategory";

const LANGS = ["ua", "ru", "de"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: SITE_DOMAIN,
    lastModified,
    changeFrequency: "weekly",
    priority: 1.0,
  });

  for (const lang of LANGS) {
    entries.push({
      url: `${SITE_DOMAIN}/${lang}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/become-specialist`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/support`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/pricing`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.55,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/specialist-rules`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/agb`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.35,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/impressum`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/datenschutzerklaerung`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    });

    for (const slug of SEO_CATEGORY_SLUGS) {
      entries.push({
        url: `${SITE_DOMAIN}/${lang}/${slug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  const supabase = createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .not("slug", "is", null)
    .neq("slug", "");

  if (categories) {
    for (const row of categories) {
      const slug = typeof row.slug === "string" ? row.slug.trim() : "";
      if (!isAsciiSlug(slug) || isExcludedFromPublicCategoryListing(slug)) continue;
      for (const lang of LANGS) {
        const url = `${SITE_DOMAIN}/${lang}/specialists/${slug}`;
        if (!isAsciiPublicPath(url)) continue;
        entries.push({
          url,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.65,
        });
      }
    }
  }

  const { data: specialists } = await supabase
    .from("specialists")
    .select("slug, updated_at")
    .not("slug", "is", null)
    .neq("slug", "")
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("billing_visibility_blocked", false)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES]);

  if (specialists) {
    for (const sp of specialists) {
      const slug = typeof sp.slug === "string" ? sp.slug.trim() : "";
      if (!isAsciiSlug(slug)) continue;
      const segment = slug;

      for (const lang of LANGS) {
        const url = `${SITE_DOMAIN}/${lang}/specialist/${segment}`;
        if (!isAsciiPublicPath(url)) continue;
        entries.push({
          url: `${SITE_DOMAIN}/${lang}/specialist/${segment}`,
          lastModified: sp.updated_at ? new Date(sp.updated_at) : lastModified,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}

