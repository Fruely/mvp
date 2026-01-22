import type { MetadataRoute } from "next";

const DOMAIN = "https://freuly.de";
const LANGS = ["ua", "ru", "de"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];

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
  }

  return entries;
}

