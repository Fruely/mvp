import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  disable: process.env.NODE_ENV !== "production",
  globPublicPatterns: ["offline.html", "favicon.ico", "icons/*.png"],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/impressum",
        destination: "/de/impressum",
        permanent: true,
      },
      {
        source: "/datenschutzerklaerung",
        destination: "/de/datenschutzerklaerung",
        permanent: true,
      },
      {
        source: "/:lang(ru|ua|de)/category/:slug([a-z0-9-]+)",
        destination: "/:lang/specialists/:slug",
        permanent: true,
      },
    ];
  },
};

export default withSerwist(nextConfig);
