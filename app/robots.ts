import type { MetadataRoute } from "next";

const DOMAIN = "https://freuly.de";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/__closed"],
      },
    ],
    sitemap: `${DOMAIN}/sitemap.xml`,
  };
}

