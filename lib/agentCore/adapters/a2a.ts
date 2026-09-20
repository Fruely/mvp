import { FREULY_CAPABILITY_CORE } from "../freuly";
import type { SpecialistSearchInput } from "@/lib/search/specialistSearch";

export const FREULY_A2A_PROTOCOL_VERSION = "1.0";
export const FREULY_A2A_ENDPOINT = "/api/a2a";
export const FREULY_A2A_AGENT_CARD_PATH = "/.well-known/agent-card.json";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

type LookupSuccess = { ok: true; value: unknown };
type LookupFailure = { ok: false; status: number; message: string };

export type A2ASpecialistLookupResult = LookupSuccess | LookupFailure;

export type FreulyA2ADependencies = {
  searchSpecialists: (input: SpecialistSearchInput) => Promise<unknown>;
  getSpecialist: (input: {
    specialistId: string;
    language: string | null;
  }) => Promise<A2ASpecialistLookupResult>;
};

type A2AAction =
  | {
      action: "search_specialists";
      input: Record<string, unknown>;
    }
  | {
      action: "get_specialist";
      input: Record<string, unknown>;
    };

const AI_READ_CAPABILITIES = ["search_specialists", "get_specialist"] as const;

function capability(id: string) {
  const value = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
  if (!value) throw new Error(`Missing capability: ${id}`);
  return value;
}

const searchCapability = capability("search_specialists");
const getSpecialistCapability = capability("get_specialist");

export function buildFreulyA2AAgentCard() {
  return {
    name: "Freuly Service Discovery Agent",
    description:
      "Read-only A2A agent for discovering public multilingual service professionals available through Freuly in Germany. It does not create service requests, contact specialists, book services, or expose private customer data.",
    supportedInterfaces: [
      {
        url: `${FREULY_CAPABILITY_CORE.service.canonical_url}${FREULY_A2A_ENDPOINT}`,
        protocolBinding: "JSONRPC",
        protocolVersion: FREULY_A2A_PROTOCOL_VERSION,
      },
    ],
    provider: {
      organization: "Freuly",
      url: FREULY_CAPABILITY_CORE.service.canonical_url,
    },
    version: FREULY_CAPABILITY_CORE.schema_version,
    documentationUrl: `${FREULY_CAPABILITY_CORE.service.canonical_url}/.well-known/ard.json`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
    },
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    skills: [
      {
        id: searchCapability.id,
        name: "Search Freuly specialists",
        description:
          `${searchCapability.description} Input must be a structured JSON data part with action "search_specialists" and an input object.`,
        tags: ["services", "specialists", "Germany", "multilingual", "search"],
        examples: [
          JSON.stringify({
            action: "search_specialists",
            input: {
              language: "ru",
              category: "psychologists",
              online_only: true,
            },
          }),
        ],
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
      {
        id: getSpecialistCapability.id,
        name: "Get Freuly specialist",
        description:
          `${getSpecialistCapability.description} Input must be a structured JSON data part with action "get_specialist" and an input object.`,
        tags: ["services", "specialists", "Germany", "profile"],
        examples: [
          JSON.stringify({
            action: "get_specialist",
            input: {
              specialist_id: "public-specialist-slug",
              language: "de",
            },
          }),
        ],
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
    ],
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

function jsonRpcResult(id: JsonRpcId, result: unknown) {
  return {
    jsonrpc: "2.0" as const,
    id,
    result,
  };
}

function errorInfo(
  reason: string,
  metadata?: Record<string, string>,
) {
  return [
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      reason,
      domain: "a2a-protocol.org",
      ...(metadata ? { metadata } : {}),
    },
  ];
}

function badRequest(detail: string) {
  return [
    {
      "@type": "type.googleapis.com/google.rpc.BadRequest",
      fieldViolations: [
        {
          field: "request",
          description: detail,
        },
      ],
    },
  ];
}

function taskNotFound(id: JsonRpcId, taskId: string) {
  return jsonRpcError(
    id,
    -32001,
    "Task not found",
    errorInfo("TASK_NOT_FOUND", { taskId }),
  );
}

function unsupported(id: JsonRpcId, operation: string) {
  return jsonRpcError(
    id,
    -32004,
    "This operation is not supported",
    errorInfo("UNSUPPORTED_OPERATION", { operation }),
  );
}

function pushUnsupported(id: JsonRpcId) {
  return jsonRpcError(
    id,
    -32003,
    "Push Notification is not supported",
    errorInfo("PUSH_NOTIFICATION_NOT_SUPPORTED"),
  );
}

function extendedCardNotConfigured(id: JsonRpcId) {
  return jsonRpcError(
    id,
    -32007,
    "Extended Agent Card is not configured",
    errorInfo("EXTENDED_AGENT_CARD_NOT_CONFIGURED"),
  );
}

export function validateFreulyA2AVersion(
  headers: Headers,
  id: JsonRpcId,
):
  | { ok: true }
  | { ok: false; status: number; body: ReturnType<typeof jsonRpcError> } {
  const requested = headers.get("a2a-version")?.trim() ?? "";
  if (requested === FREULY_A2A_PROTOCOL_VERSION) return { ok: true };

  return {
    ok: false,
    status: 400,
    body: jsonRpcError(
      id,
      -32009,
      "Version not supported",
      errorInfo("VERSION_NOT_SUPPORTED", {
        requestedVersion: requested || "",
        supportedVersions: FREULY_A2A_PROTOCOL_VERSION,
      }),
    ),
  };
}

function readId(value: unknown): JsonRpcId {
  if (typeof value === "string" || typeof value === "number" || value === null) {
    return value;
  }
  return null;
}

export function parseFreulyA2AJsonRpc(value: unknown):
  | { ok: true; request: JsonRpcRequest }
  | { ok: false; body: ReturnType<typeof jsonRpcError> } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, body: jsonRpcError(null, -32600, "Invalid Request") };
  }

  const raw = value as Record<string, unknown>;
  const id = readId(raw.id);
  if (raw.jsonrpc !== "2.0" || typeof raw.method !== "string") {
    return { ok: false, body: jsonRpcError(id, -32600, "Invalid Request") };
  }

  if (raw.params != null && (typeof raw.params !== "object" || Array.isArray(raw.params))) {
    return { ok: false, body: jsonRpcError(id, -32602, "Invalid params") };
  }

  return {
    ok: true,
    request: {
      jsonrpc: "2.0",
      id,
      method: raw.method,
      ...(raw.params ? { params: raw.params as Record<string, unknown> } : {}),
    },
  };
}

function unexpectedKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  const set = new Set(allowed);
  return Object.keys(input).filter((key) => !set.has(key));
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
  if (cleaned.length > maxLength) return { error: `${field} is too long` };
  return { value: cleaned };
}

function parseSearchInput(
  value: unknown,
): { input: SpecialistSearchInput } | { error: string } {
  if (value == null) return { input: {} };
  if (typeof value !== "object" || Array.isArray(value)) {
    return { error: "input must be an object" };
  }
  const input = value as Record<string, unknown>;
  const extra = unexpectedKeys(input, [
    "language",
    "category",
    "place",
    "online_only",
    "query",
    "radius_km",
    "offset",
  ]);
  if (extra.length) return { error: `Unexpected input field: ${extra[0]}` };

  const language = cleanOptionalString(input.language, "language", 8);
  if ("error" in language) return language;
  const normalizedLanguage = language.value?.toLowerCase() ?? null;
  if (
    normalizedLanguage &&
    !["de", "ru", "ua", "uk"].includes(normalizedLanguage)
  ) {
    return { error: "language must be one of de, ru, ua, uk" };
  }

  const category = cleanOptionalString(input.category, "category", 120);
  if ("error" in category) return category;
  const place = cleanOptionalString(input.place, "place", 160);
  if ("error" in place) return place;
  const query = cleanOptionalString(input.query, "query", 300);
  if ("error" in query) return query;

  if (
    input.online_only != null &&
    typeof input.online_only !== "boolean"
  ) {
    return { error: "online_only must be a boolean" };
  }

  let radius: number | null = null;
  const radii = [5, 10, 25, 30, 50, 100];
  if (input.radius_km != null) {
    if (
      typeof input.radius_km !== "number" ||
      !Number.isInteger(input.radius_km) ||
      !radii.includes(input.radius_km)
    ) {
      return { error: "radius_km must be one of 5, 10, 25, 30, 50, 100" };
    }
    radius = input.radius_km;
  }

  let offset = 0;
  if (input.offset != null) {
    if (
      typeof input.offset !== "number" ||
      !Number.isInteger(input.offset) ||
      input.offset < 0 ||
      input.offset > 500
    ) {
      return { error: "offset must be an integer between 0 and 500" };
    }
    offset = input.offset;
  }

  return {
    input: {
      lang: normalizedLanguage,
      category: category.value,
      place: place.value,
      mode: input.online_only === true ? "online" : null,
      q: query.value,
      radius,
      offset,
    },
  };
}

function parseGetSpecialistInput(
  value: unknown,
):
  | { specialistId: string; language: string | null }
  | { error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { error: "input must be an object" };
  }
  const input = value as Record<string, unknown>;
  const extra = unexpectedKeys(input, ["specialist_id", "language"]);
  if (extra.length) return { error: `Unexpected input field: ${extra[0]}` };

  if (typeof input.specialist_id !== "string") {
    return { error: "specialist_id is required" };
  }
  const specialistId = input.specialist_id.trim();
  if (!specialistId || specialistId.length > 160) {
    return { error: "specialist_id must be between 1 and 160 characters" };
  }

  const language = cleanOptionalString(input.language, "language", 8);
  if ("error" in language) return language;
  const normalizedLanguage = language.value?.toLowerCase() ?? null;
  if (
    normalizedLanguage &&
    !["de", "ru", "ua", "uk"].includes(normalizedLanguage)
  ) {
    return { error: "language must be one of de, ru, ua, uk" };
  }

  return { specialistId, language: normalizedLanguage };
}

function extractAction(params: Record<string, unknown> | undefined):
  | { action: A2AAction; messageId: string; contextId: string | null }
  | { error: string } {
  const message = params?.message;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { error: "params.message is required" };
  }

  const msg = message as Record<string, unknown>;
  if (msg.role !== "ROLE_USER") {
    return { error: "message.role must be ROLE_USER" };
  }
  if (typeof msg.messageId !== "string" || !msg.messageId.trim()) {
    return { error: "message.messageId is required" };
  }
  const messageId = msg.messageId.trim().slice(0, 200);

  const contextId =
    typeof msg.contextId === "string" && msg.contextId.trim()
      ? msg.contextId.trim().slice(0, 200)
      : null;

  if (!Array.isArray(msg.parts) || msg.parts.length !== 1) {
    return { error: "message.parts must contain exactly one JSON data part" };
  }

  const part = msg.parts[0];
  if (!part || typeof part !== "object" || Array.isArray(part)) {
    return { error: "message part must be an object" };
  }
  const p = part as Record<string, unknown>;
  if (!p.data || typeof p.data !== "object" || Array.isArray(p.data)) {
    return { error: "message part must contain structured data" };
  }
  if (
    p.mediaType != null &&
    p.mediaType !== "application/json"
  ) {
    return { error: "message data part mediaType must be application/json" };
  }

  const data = p.data as Record<string, unknown>;
  if (!AI_READ_CAPABILITIES.includes(data.action as (typeof AI_READ_CAPABILITIES)[number])) {
    return {
      error:
        'data.action must be "search_specialists" or "get_specialist"',
    };
  }
  const input =
    data.input && typeof data.input === "object" && !Array.isArray(data.input)
      ? (data.input as Record<string, unknown>)
      : {};

  return {
    action: {
      action: data.action as A2AAction["action"],
      input,
    } as A2AAction,
    messageId,
    contextId,
  };
}

function directAgentMessage(
  sourceMessageId: string,
  contextId: string | null,
  action: string,
  result: unknown,
) {
  return {
    message: {
      messageId: `freuly:${sourceMessageId}`,
      role: "ROLE_AGENT",
      parts: [
        {
          data: {
            ok: true,
            action,
            result,
          },
          mediaType: "application/json",
        },
      ],
      ...(contextId ? { contextId } : {}),
    },
  };
}

async function handleSendMessage(
  request: JsonRpcRequest,
  deps: FreulyA2ADependencies,
) {
  const parsed = extractAction(request.params);
  if ("error" in parsed) {
    return jsonRpcError(request.id, -32602, "Invalid params", badRequest(parsed.error));
  }

  try {
    if (parsed.action.action === "search_specialists") {
      const input = parseSearchInput(parsed.action.input);
      if ("error" in input) {
        return jsonRpcError(request.id, -32602, "Invalid params", badRequest(input.error));
      }
      const result = await deps.searchSpecialists(input.input);
      return jsonRpcResult(
        request.id,
        directAgentMessage(
          parsed.messageId,
          parsed.contextId,
          parsed.action.action,
          result,
        ),
      );
    }

    const input = parseGetSpecialistInput(parsed.action.input);
    if ("error" in input) {
      return jsonRpcError(request.id, -32602, "Invalid params", {
        detail: input.error,
      });
    }
    const result = await deps.getSpecialist(input);
    if (!result.ok) {
      if (result.status === 404) {
        return jsonRpcError(
          request.id,
          -32602,
          "Invalid params",
          badRequest(result.message),
        );
      }
      return jsonRpcError(request.id, -32603, "Internal error");
    }

    return jsonRpcResult(
      request.id,
      directAgentMessage(
        parsed.messageId,
        parsed.contextId,
        parsed.action.action,
        result.value,
      ),
    );
  } catch {
    return jsonRpcError(request.id, -32603, "Internal error");
  }
}

function taskIdFromParams(params: Record<string, unknown> | undefined): string | null {
  const id = params?.id;
  return typeof id === "string" && id.trim() ? id.trim().slice(0, 200) : null;
}

export async function dispatchFreulyA2ARequest(
  request: JsonRpcRequest,
  deps: FreulyA2ADependencies,
): Promise<unknown> {
  switch (request.method) {
    case "SendMessage":
      return handleSendMessage(request, deps);

    case "GetTask":
    case "CancelTask":
    case "SubscribeToTask": {
      const taskId = taskIdFromParams(request.params);
      if (!taskId) {
        return jsonRpcError(
          request.id,
          -32602,
          "Invalid params",
          badRequest("params.id is required"),
        );
      }
      return taskNotFound(request.id, taskId);
    }

    case "ListTasks":
      return jsonRpcResult(request.id, {
        tasks: [],
        nextPageToken: "",
        pageSize:
          typeof request.params?.pageSize === "number" &&
          Number.isInteger(request.params.pageSize) &&
          request.params.pageSize >= 1 &&
          request.params.pageSize <= 100
            ? request.params.pageSize
            : 50,
        totalSize: 0,
      });

    case "SendStreamingMessage":
      return unsupported(request.id, "SendStreamingMessage");

    case "CreateTaskPushNotificationConfig":
    case "GetTaskPushNotificationConfig":
    case "ListTaskPushNotificationConfigs":
    case "DeleteTaskPushNotificationConfig":
      return pushUnsupported(request.id);

    case "GetExtendedAgentCard":
      return extendedCardNotConfigured(request.id);

    default:
      return jsonRpcError(request.id, -32601, "Method not found");
  }
}
