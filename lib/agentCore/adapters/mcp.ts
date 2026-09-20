import { FREULY_CAPABILITY_CORE } from "../freuly";
import type { SpecialistSearchInput } from "@/lib/search/specialistSearch";

export const FREULY_MCP_PROTOCOL_VERSION = "2026-07-28";
export const FREULY_MCP_ENDPOINT = "/api/mcp";

const CACHE_TTL_MS = 5 * 60 * 1000;
const SERVER_INFO_META_KEY = "io.modelcontextprotocol/serverInfo";
const PROTOCOL_VERSION_META_KEY = "io.modelcontextprotocol/protocolVersion";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type ToolCallSuccess = {
  ok: true;
  value: unknown;
};

type ToolCallFailure = {
  ok: false;
  status: number;
  message: string;
};

export type McpSpecialistLookupResult = ToolCallSuccess | ToolCallFailure;

export type FreulyMcpDependencies = {
  searchSpecialists: (input: SpecialistSearchInput) => Promise<unknown>;
  getSpecialist: (input: {
    specialistId: string;
    language: string | null;
  }) => Promise<McpSpecialistLookupResult>;
};

export type McpHttpValidationResult =
  | { ok: true; request: JsonRpcRequest }
  | {
      ok: false;
      status: number;
      body: ReturnType<typeof jsonRpcError>;
    };

const SEARCH_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    language: {
      type: ["string", "null"],
      enum: ["de", "ru", "ua", "uk", null],
      description: "Preferred specialist language.",
    },
    category: {
      type: ["string", "null"],
      description: "Freuly category slug.",
    },
    place: {
      type: ["string", "null"],
      description: "German city name or five-digit postal code for local search.",
    },
    online_only: {
      type: ["boolean", "null"],
      description: "When true, return specialists who work online or hybrid.",
    },
    query: {
      type: ["string", "null"],
      description: "Free-text service or specialist search query.",
    },
    radius_km: {
      type: ["integer", "null"],
      enum: [5, 10, 25, 30, 50, 100, null],
      description: "Optional local search radius in kilometres.",
    },
    offset: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 500,
      description: "Pagination offset.",
    },
  },
} as const;

const GET_SPECIALIST_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["specialist_id"],
  properties: {
    specialist_id: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      description: "Freuly specialist UUID or public slug.",
    },
    language: {
      type: ["string", "null"],
      enum: ["de", "ru", "ua", "uk", null],
      description: "Preferred content language.",
    },
  },
} as const;

function capability(id: string) {
  const value = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
  if (!value) throw new Error(`Missing capability: ${id}`);
  return value;
}

const searchCapability = capability("search_specialists");
const getSpecialistCapability = capability("get_specialist");

export function buildFreulyMcpToolCatalog() {
  return [
    {
      name: "search_specialists",
      title: "Search Freuly specialists",
      description:
        `${searchCapability.description} Freuly operates in Germany and supports multilingual specialist discovery.`,
      inputSchema: SEARCH_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: {
        "freuly/capabilityId": searchCapability.id,
      },
    },
    {
      name: "get_specialist",
      title: "Get Freuly specialist",
      description: getSpecialistCapability.description,
      inputSchema: GET_SPECIALIST_INPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: {
        "freuly/capabilityId": getSpecialistCapability.id,
      },
    },
  ] as const;
}

export function buildFreulyMcpDiscoverResult() {
  return {
    resultType: "complete",
    supportedVersions: [FREULY_MCP_PROTOCOL_VERSION],
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    instructions:
      "Use search_specialists to discover public Freuly professionals in Germany. Use get_specialist only with an id or slug returned by Freuly. These tools are read-only and never create requests, contact specialists, reveal private customer data, or perform bookings.",
    ttlMs: CACHE_TTL_MS,
    cacheScope: "public",
    _meta: {
      [SERVER_INFO_META_KEY]: {
        name: "Freuly",
        version: FREULY_CAPABILITY_CORE.schema_version,
      },
    },
  } as const;
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown,
) {
  return {
    jsonrpc: "2.0" as const,
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function readId(value: unknown): JsonRpcId {
  if (typeof value === "string" || typeof value === "number" || value === null) {
    return value;
  }
  return null;
}

function requestMeta(params: Record<string, unknown> | undefined): Record<string, unknown> | null {
  const value = params?._meta;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function headerMismatch(id: JsonRpcId, message: string): McpHttpValidationResult {
  return {
    ok: false,
    status: 400,
    body: jsonRpcError(id, -32020, message),
  };
}

export function validateFreulyMcpHttpRequest(
  headers: Headers,
  value: unknown,
): McpHttpValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      ok: false,
      status: 400,
      body: jsonRpcError(null, -32600, "Invalid Request"),
    };
  }

  const raw = value as Record<string, unknown>;
  const id = readId(raw.id);

  if (raw.jsonrpc !== "2.0" || typeof raw.method !== "string") {
    return {
      ok: false,
      status: 400,
      body: jsonRpcError(id, -32600, "Invalid Request"),
    };
  }

  const params =
    raw.params && typeof raw.params === "object" && !Array.isArray(raw.params)
      ? (raw.params as Record<string, unknown>)
      : undefined;

  const protocolHeader = headers.get("mcp-protocol-version")?.trim() ?? "";
  const methodHeader = headers.get("mcp-method")?.trim() ?? "";
  const meta = requestMeta(params);
  const metaVersion =
    typeof meta?.[PROTOCOL_VERSION_META_KEY] === "string"
      ? String(meta[PROTOCOL_VERSION_META_KEY])
      : "";

  if (!protocolHeader) {
    return headerMismatch(id, "Missing MCP-Protocol-Version header");
  }
  if (!metaVersion) {
    return headerMismatch(id, "Missing protocol version in request _meta");
  }
  if (protocolHeader !== metaVersion) {
    return headerMismatch(
      id,
      "MCP-Protocol-Version header does not match request _meta",
    );
  }
  if (protocolHeader !== FREULY_MCP_PROTOCOL_VERSION) {
    return {
      ok: false,
      status: 400,
      body: jsonRpcError(id, -32022, "Unsupported protocol version", {
        supported: [FREULY_MCP_PROTOCOL_VERSION],
        requested: protocolHeader,
      }),
    };
  }

  if (!methodHeader) {
    return headerMismatch(id, "Missing Mcp-Method header");
  }
  if (methodHeader !== raw.method) {
    return headerMismatch(id, "Mcp-Method header does not match request method");
  }

  if (raw.method === "tools/call") {
    const toolName = typeof params?.name === "string" ? params.name : "";
    const nameHeader = headers.get("mcp-name")?.trim() ?? "";
    if (!nameHeader) {
      return headerMismatch(id, "Missing Mcp-Name header");
    }
    if (!toolName || nameHeader !== toolName) {
      return headerMismatch(id, "Mcp-Name header does not match tool name");
    }
  }

  return {
    ok: true,
    request: {
      jsonrpc: "2.0",
      id,
      method: raw.method,
      ...(params ? { params } : {}),
    },
  };
}

function completeResult(id: JsonRpcId, result: Record<string, unknown>) {
  return {
    jsonrpc: "2.0" as const,
    id,
    result: {
      resultType: "complete",
      ...result,
      _meta: {
        [SERVER_INFO_META_KEY]: {
          name: "Freuly",
          version: FREULY_CAPABILITY_CORE.schema_version,
        },
      },
    },
  };
}

function toolResult(id: JsonRpcId, value: unknown, isError = false) {
  const text =
    typeof value === "string"
      ? value
      : JSON.stringify(value) ?? String(value);
  return completeResult(id, {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : { isError: false }),
    ...(!isError ? { structuredContent: value } : {}),
  });
}

function cleanOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): { value: string | null } | { error: string } {
  if (value == null || value === "") return { value: null };
  if (typeof value !== "string") return { error: `${field} must be a string` };
  const cleaned = value.trim();
  if (!cleaned) return { value: null };
  if (cleaned.length > maxLength) {
    return { error: `${field} is too long` };
  }
  return { value: cleaned };
}

function unexpectedKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  const allowedSet = new Set(allowed);
  return Object.keys(input).filter((key) => !allowedSet.has(key));
}

function parseSearchArguments(
  value: unknown,
): { input: SpecialistSearchInput } | { error: string } {
  if (value == null) return { input: {} };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: "arguments must be an object" };
  }

  const args = value as Record<string, unknown>;
  const extra = unexpectedKeys(args, [
    "language",
    "category",
    "place",
    "online_only",
    "query",
    "radius_km",
    "offset",
  ]);
  if (extra.length) return { error: `Unexpected argument: ${extra[0]}` };

  const language = cleanOptionalString(args.language, "language", 8);
  if ("error" in language) return language;
  if (
    language.value &&
    !["de", "ru", "ua", "uk"].includes(language.value.toLowerCase())
  ) {
    return { error: "language must be one of de, ru, ua, uk" };
  }

  const category = cleanOptionalString(args.category, "category", 120);
  if ("error" in category) return category;
  const place = cleanOptionalString(args.place, "place", 160);
  if ("error" in place) return place;
  const query = cleanOptionalString(args.query, "query", 300);
  if ("error" in query) return query;

  if (
    args.online_only != null &&
    typeof args.online_only !== "boolean"
  ) {
    return { error: "online_only must be a boolean" };
  }

  const allowedRadii = [5, 10, 25, 30, 50, 100];
  let radius: number | null = null;
  if (args.radius_km != null) {
    if (
      typeof args.radius_km !== "number" ||
      !Number.isInteger(args.radius_km) ||
      !allowedRadii.includes(args.radius_km)
    ) {
      return { error: "radius_km must be one of 5, 10, 25, 30, 50, 100" };
    }
    radius = args.radius_km;
  }

  let offset = 0;
  if (args.offset != null) {
    if (
      typeof args.offset !== "number" ||
      !Number.isInteger(args.offset) ||
      args.offset < 0 ||
      args.offset > 500
    ) {
      return { error: "offset must be an integer between 0 and 500" };
    }
    offset = args.offset;
  }

  return {
    input: {
      lang: language.value?.toLowerCase() ?? null,
      category: category.value,
      place: place.value,
      mode: args.online_only === true ? "online" : null,
      q: query.value,
      radius,
      offset,
    },
  };
}

function parseGetSpecialistArguments(
  value: unknown,
):
  | { specialistId: string; language: string | null }
  | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "arguments must be an object" };
  }
  const args = value as Record<string, unknown>;
  const extra = unexpectedKeys(args, ["specialist_id", "language"]);
  if (extra.length) return { error: `Unexpected argument: ${extra[0]}` };

  if (typeof args.specialist_id !== "string") {
    return { error: "specialist_id is required" };
  }
  const specialistId = args.specialist_id.trim();
  if (!specialistId || specialistId.length > 160) {
    return { error: "specialist_id must be between 1 and 160 characters" };
  }

  const language = cleanOptionalString(args.language, "language", 8);
  if ("error" in language) return language;
  const normalizedLanguage = language.value?.toLowerCase() ?? null;
  if (
    normalizedLanguage &&
    !["de", "ru", "ua", "uk"].includes(normalizedLanguage)
  ) {
    return { error: "language must be one of de, ru, ua, uk" };
  }

  return {
    specialistId,
    language: normalizedLanguage,
  };
}

export async function dispatchFreulyMcpRequest(
  request: JsonRpcRequest,
  deps: FreulyMcpDependencies,
): Promise<{ status: number; body: unknown }> {
  if (request.method === "server/discover") {
    return {
      status: 200,
      body: {
        jsonrpc: "2.0",
        id: request.id,
        result: buildFreulyMcpDiscoverResult(),
      },
    };
  }

  if (request.method === "tools/list") {
    return {
      status: 200,
      body: completeResult(request.id, {
        tools: buildFreulyMcpToolCatalog(),
        ttlMs: CACHE_TTL_MS,
        cacheScope: "public",
      }),
    };
  }

  if (request.method !== "tools/call") {
    return {
      status: 404,
      body: jsonRpcError(request.id, -32601, "Method not found"),
    };
  }

  const name =
    typeof request.params?.name === "string" ? request.params.name : null;
  const args = request.params?.arguments;

  if (name === "search_specialists") {
    const parsed = parseSearchArguments(args);
    if ("error" in parsed) {
      return { status: 200, body: toolResult(request.id, parsed.error, true) };
    }
    try {
      const value = await deps.searchSpecialists(parsed.input);
      return { status: 200, body: toolResult(request.id, value) };
    } catch {
      return {
        status: 200,
        body: toolResult(
          request.id,
          "Freuly specialist search is temporarily unavailable.",
          true,
        ),
      };
    }
  }

  if (name === "get_specialist") {
    const parsed = parseGetSpecialistArguments(args);
    if ("error" in parsed) {
      return { status: 200, body: toolResult(request.id, parsed.error, true) };
    }
    try {
      const value = await deps.getSpecialist(parsed);
      if (!value.ok) {
        return {
          status: 200,
          body: toolResult(request.id, value.message, true),
        };
      }
      return { status: 200, body: toolResult(request.id, value.value) };
    } catch {
      return {
        status: 200,
        body: toolResult(
          request.id,
          "Freuly specialist details are temporarily unavailable.",
          true,
        ),
      };
    }
  }

  return {
    status: 400,
    body: jsonRpcError(request.id, -32602, `Unknown tool: ${name ?? "missing"}`),
  };
}
