import type { MetadataRoute } from "next";
import { SEO_CATEGORY_SLUGS } from "@/content/seo/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { SITE_DOMAIN } from "@/lib/seo/siteMetadata";
import { isAsciiPublicPath, isAsciiSlug } from "@/lib/publicUrls";
import { isExcludedFromPublicCategoryListing } from "@/lib/categories/uncategorizedSpecialistCategory";

// Always read current publication/visibility state; never freeze a build-time fallback.
export const dynamic = "force-dynamic";

const LANGS = ["ua", "ru", "de"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const lang of LANGS) {
    entries.push({
      url: `${SITE_DOMAIN}/${lang}`,
      changeFrequency: "weekly",
      priority: 1.0,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/blog`,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/for-specialists`,
      changeFrequency: "monthly",
      priority: 0.7,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/become-specialist`,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/support`,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/pricing`,
      changeFrequency: "monthly",
      priority: 0.55,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/specialist-rules`,
      changeFrequency: "yearly",
      priority: 0.4,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/agb`,
      changeFrequency: "yearly",
      priority: 0.35,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/impressum`,
      changeFrequency: "yearly",
      priority: 0.3,
    });

    entries.push({
      url: `${SITE_DOMAIN}/${lang}/datenschutzerklaerung`,
      changeFrequency: "yearly",
      priority: 0.3,
    });

    for (const slug of SEO_CATEGORY_SLUGS) {
      entries.push({
        url: `${SITE_DOMAIN}/${lang}/${slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // CI next build has no Supabase secrets; skip DB URLs instead of failing export.
  // Production requests read the current database using server credentials.
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    console.error("[sitemap] supabase unavailable", error);
    return entries;
  }

  const { data: posts } = await supabase
    .from("content_posts")
    .select("lang, slug, updated_at")
    .eq("status", "published")
    .not("slug", "is", null)
    .neq("slug", "");

  if (posts) {
    for (const post of posts) {
      const lang = typeof post.lang === "string" ? post.lang : "";
      const slug = typeof post.slug === "string" ? post.slug.trim() : "";
      if (!LANGS.includes(lang as (typeof LANGS)[number]) || !isAsciiSlug(slug)) continue;

      const url = `${SITE_DOMAIN}/${lang}/blog/${slug}`;
      if (!isAsciiPublicPath(url)) continue;

      entries.push({
        url,
        lastModified: post.updated_at ? new Date(post.updated_at) : undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

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
    .or("is_test.is.null,is_test.eq.false")
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
          lastModified: sp.updated_at ? new Date(sp.updated_at) : undefined,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}
