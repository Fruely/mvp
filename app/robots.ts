import type { MetadataRoute } from "next";

const DOMAIN = "https://freuly.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/ua/", "/ru/", "/de/"],
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${DOMAIN}/sitemap.xml`,
  };
}

