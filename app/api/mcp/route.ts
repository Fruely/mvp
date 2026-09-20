import { NextRequest } from "next/server";
import {
  FREULY_MCP_PROTOCOL_VERSION,
  dispatchFreulyMcpRequest,
  validateFreulyMcpHttpRequest,
  type McpSpecialistLookupResult,
} from "@/lib/agentCore/adapters/mcp";
import { searchSpecialists } from "@/lib/search/specialistSearch";
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";

export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}

async function getSpecialistFromPublicApi(
  request: NextRequest,
  input: { specialistId: string; language: string | null },
): Promise<McpSpecialistLookupResult> {
  const url = new URL(
    `/api/specialists/${encodeURIComponent(input.specialistId)}`,
    request.nextUrl.origin,
  );
  if (input.language) url.searchParams.set("lang", input.language);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message:
        response.status === 404
          ? "Specialist not found or not publicly visible."
          : "Freuly specialist details are temporarily unavailable.",
    };
  }

  return { ok: true, value: payload };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      400,
    );
  }

  const validation = validateFreulyMcpHttpRequest(request.headers, body);
  if (!validation.ok) {
    return jsonResponse(validation.body, validation.status);
  }

  const ip = getClientIP(request);
  const isToolCall = validation.request.method === "tools/call";
  const rateLimit = await checkRateLimit(request, {
    namespace: isToolCall ? "mcp:tool-call" : "mcp:discovery",
    identifier: ip,
    limit: isToolCall ? 60 : 300,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        jsonrpc: "2.0",
        id: validation.request.id,
        error: {
          code: -32029,
          message: RATE_LIMIT_PUBLIC_MESSAGE,
        },
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSec ?? 60),
      },
    );
  }

  const dispatched = await dispatchFreulyMcpRequest(validation.request, {
    searchSpecialists,
    getSpecialist: (input) => getSpecialistFromPublicApi(request, input),
  });

  return jsonResponse(dispatched.body, dispatched.status, {
    "MCP-Protocol-Version": FREULY_MCP_PROTOCOL_VERSION,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: JSON_HEADERS,
  });
}

export async function GET() {
  return new Response(null, {
    status: 405,
    headers: {
      ...JSON_HEADERS,
      Allow: "POST, OPTIONS",
    },
  });
}

export async function DELETE() {
  return GET();
}
