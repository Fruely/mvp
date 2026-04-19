import type { MetadataRoute } from "next";
import { SEO_CATEGORY_SLUGS } from "@/content/seo/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

const DOMAIN = "https://freuly.de";
const LANGS = ["ua", "ru", "de"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

  entries.push({
    url: DOMAIN,
    lastModified,
    changeFrequency: "weekly",
    priority: 1.0,
  });

  for (const lang of LANGS) {
    entries.push({
      url: `${DOMAIN}/${lang}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1.0,
    });

    entries.push({
      url: `${DOMAIN}/${lang}/become-specialist`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    entries.push({
      url: `${DOMAIN}/${lang}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${DOMAIN}/${lang}/support`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    });

    entries.push({
      url: `${DOMAIN}/${lang}/specialist-rules`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    });

    for (const slug of SEO_CATEGORY_SLUGS) {
      entries.push({
        url: `${DOMAIN}/${lang}/${slug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  entries.push({
    url: `${DOMAIN}/impressum`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.3,
  });

  entries.push({
    url: `${DOMAIN}/datenschutzerklaerung`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.3,
  });

  entries.push({
    url: `${DOMAIN}/for-specialists`,
    lastModified,
    changeFrequency: "weekly",
    priority: 0.6,
  });

  const supabase = createSupabaseServerClient();
  const { data: specialists } = await supabase
    .from("specialists")
    .select("slug, updated_at")
    .not("slug", "is", null)
    .neq("slug", "")
    .eq("is_active", true)
    .eq("is_visible", true)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES]);

  if (specialists) {
    for (const sp of specialists) {
      for (const lang of LANGS) {
        entries.push({
          url: `${DOMAIN}/${lang}/specialist/${sp.slug}`,
          lastModified: sp.updated_at ? new Date(sp.updated_at) : lastModified,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  return entries;
}

