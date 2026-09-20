import { NextRequest } from "next/server";
import {
  FREULY_A2A_PROTOCOL_VERSION,
  dispatchFreulyA2ARequest,
  parseFreulyA2AJsonRpc,
  validateFreulyA2AVersion,
  type A2ASpecialistLookupResult,
} from "@/lib/agentCore/adapters/a2a";
import { searchSpecialists } from "@/lib/search/specialistSearch";
import {
  checkRateLimit,
  getClientIP,
  RATE_LIMIT_PUBLIC_MESSAGE,
} from "@/lib/rate-limit/shared";

export const dynamic = "force-dynamic";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, A2A-Version, A2A-Extensions",
};

function json(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...HEADERS,
      "A2A-Version": FREULY_A2A_PROTOCOL_VERSION,
      ...(headers ?? {}),
    },
  });
}

async function getSpecialist(
  input: { specialistId: string; language: string | null },
): Promise<A2ASpecialistLookupResult> {
  const url = new URL(
    `/api/specialists/${encodeURIComponent(input.specialistId)}`,
    "https://freuly.de",
  );
  if (input.language) url.searchParams.set("lang", input.language);

  const response = await fetch(url, {
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
    return json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "Parse error" },
      },
      400,
    );
  }

  const parsed = parseFreulyA2AJsonRpc(body);
  if (!parsed.ok) return json(parsed.body, 400);

  const version = validateFreulyA2AVersion(request.headers, parsed.request.id);
  if (!version.ok) return json(version.body, version.status);

  const rateLimit = await checkRateLimit(request, {
    namespace: "a2a:read-agent",
    identifier: getClientIP(request),
    limit: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return json(
      {
        jsonrpc: "2.0",
        id: parsed.request.id,
        error: {
          code: -32010,
          message: RATE_LIMIT_PUBLIC_MESSAGE,
        },
      },
      429,
      { "Retry-After": String(rateLimit.retryAfterSec ?? 60) },
    );
  }

  const result = await dispatchFreulyA2ARequest(parsed.request, {
    searchSpecialists,
    getSpecialist,
  });
  return json(result);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: HEADERS,
  });
}

export async function GET() {
  return new Response(null, {
    status: 405,
    headers: {
      ...HEADERS,
      Allow: "POST, OPTIONS",
    },
  });
}
