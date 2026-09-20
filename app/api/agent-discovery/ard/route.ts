import { buildFreulyArdManifest } from "@/lib/agentCore/adapters/ard";

export const dynamic = "force-static";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  return new Response(JSON.stringify(buildFreulyArdManifest()), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
