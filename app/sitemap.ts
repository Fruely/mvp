import type { MetadataRoute } from "next";

const DOMAIN = "https://freuly.de";
const LANGS = ["ua", "ru", "de"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
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

  return entries;
}

