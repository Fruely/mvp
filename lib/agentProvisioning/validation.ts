import {
  AGENT_CLIENT_TYPES,
  type AgentClientType,
} from "@/lib/agentAuth/policy";
import { isKnownAgentScope } from "@/lib/agentAuth/scopes";

export const AGENT_PROVISIONING_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProvisioningValidationError = { error: string; status: number };

const CREATE_CLIENT_KEYS = new Set([
  "name",
  "client_type",
  "provider",
  "scopes",
  "owner_user_id",
  "specialist_id",
]);

const ISSUE_CREDENTIAL_KEYS = new Set(["expires_at"]);

export type ParsedCreateAgentClient = {
  name: string;
  clientType: AgentClientType;
  provider: string | null;
  scopes: string[];
  ownerUserId: string | null;
  specialistId: string | null;
};

export type ParsedIssueCredential = {
  expiresAt: string | null;
};

// RFC3339 / ISO-8601 timestamp with a required timezone: Z or ±HH:MM.
const RFC3339_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

function err(error: string, status = 400): ProvisioningValidationError {
  return { error, status };
}

function unknownKeys(record: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(record).filter((key) => !allowed.has(key));
}

export function normalizeAgentProvisioningUuid(
  value: unknown,
  field: string,
): string | null | ProvisioningValidationError {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return err(`${field} must be a uuid`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!AGENT_PROVISIONING_UUID_PATTERN.test(trimmed)) {
    return err(`${field} must be a uuid`);
  }
  return trimmed.toLowerCase();
}

export function parseCreateAgentClientInput(
  body: unknown,
): ParsedCreateAgentClient | ProvisioningValidationError {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }
  const record = body as Record<string, unknown>;
  if (unknownKeys(record, CREATE_CLIENT_KEYS).length > 0) {
    return err("unknown fields are not allowed");
  }

  if (typeof record.name !== "string" || !record.name.trim()) {
    return err("name is required");
  }

  if (typeof record.client_type !== "string" || !record.client_type.trim()) {
    return err("client_type is required");
  }
  if (
    !(AGENT_CLIENT_TYPES as readonly string[]).includes(record.client_type.trim())
  ) {
    return err("unknown client_type");
  }

  if (!Array.isArray(record.scopes)) {
    return err("scopes must be an array");
  }
  const scopes: string[] = [];
  const seen = new Set<string>();
  for (const scope of record.scopes) {
    if (typeof scope !== "string" || !scope.trim()) {
      return err("unknown scope");
    }
    const normalized = scope.trim();
    if (!isKnownAgentScope(normalized)) {
      return err("unknown scope");
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    scopes.push(normalized);
  }

  let provider: string | null = null;
  if (record.provider != null && record.provider !== "") {
    if (typeof record.provider !== "string") {
      return err("provider must be a string");
    }
    provider = record.provider.trim() || null;
  }

  const ownerUserId = normalizeAgentProvisioningUuid(
    record.owner_user_id,
    "owner_user_id",
  );
  if (ownerUserId && typeof ownerUserId === "object") return ownerUserId;
  const specialistId = normalizeAgentProvisioningUuid(
    record.specialist_id,
    "specialist_id",
  );
  if (specialistId && typeof specialistId === "object") return specialistId;

  return {
    name: record.name.trim(),
    clientType: record.client_type.trim() as AgentClientType,
    provider,
    scopes,
    ownerUserId,
    specialistId,
  };
}

export function parseIssueAgentCredentialInput(
  body: unknown,
  now = new Date(),
): ParsedIssueCredential | ProvisioningValidationError {
  if (body == null || body === "") {
    return { expiresAt: null };
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }
  const record = body as Record<string, unknown>;
  if (unknownKeys(record, ISSUE_CREDENTIAL_KEYS).length > 0) {
    return err("unknown fields are not allowed");
  }
  if (record.expires_at == null || record.expires_at === "") {
    return { expiresAt: null };
  }
  if (typeof record.expires_at !== "string") {
    return err("expires_at must be an RFC3339 timestamp");
  }
  const expiresAt = parseRfc3339Timestamp(record.expires_at);
  if (!expiresAt) {
    return err("expires_at must be an RFC3339 timestamp");
  }
  if (Date.parse(expiresAt) <= now.getTime()) {
    return err("expires_at must be in the future");
  }
  return { expiresAt };
}

export function parseRfc3339Timestamp(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(RFC3339_TIMESTAMP_PATTERN);
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[8];

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (hour > 23 || minute > 59 || second > 60) return null;

  if (offset !== "Z") {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

export function parseEmptyPatchBody(
  body: unknown,
): true | ProvisioningValidationError {
  if (body == null || body === "") return true;
  if (typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }
  if (Object.keys(body as Record<string, unknown>).length > 0) {
    return err("unknown fields are not allowed");
  }
  return true;
}
