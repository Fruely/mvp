import { buildFreulyReadOnlyOpenApiDocument } from "@/lib/agentCore/adapters/openapi";

export const dynamic = "force-static";

const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET() {
  return new Response(JSON.stringify(buildFreulyReadOnlyOpenApiDocument()), {
    status: 200,
    headers: {
      "Content-Type": "application/openapi+json;version=3.1; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
      "Access-Control-Allow-Origin": "*",
    },
  });
}
