import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  disable: process.env.NODE_ENV !== "production",
    globPublicPatterns: ["offline.html", "favicon.ico", "favicon.svg", "icons/*.png"],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/ard.json",
        destination: "/api/agent-discovery/ard",
      },
      {
        source: "/.well-known/ai-catalog.json",
        destination: "/api/agent-discovery/ard",
      },
      {
        source: "/.well-known/openapi.json",
        destination: "/api/agent-discovery/openapi",
      },
      {
        source: "/.well-known/agent-card.json",
        destination: "/api/agent-discovery/a2a-card",
      },
    ];
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
