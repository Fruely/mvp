import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // During Coming Soon / preview phase, block all indexing.
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
