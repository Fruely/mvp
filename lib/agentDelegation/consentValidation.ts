import { parseRfc3339Timestamp } from "@/lib/rfc3339";
import { AGENT_USER_CONSENT_VERSION } from "./consentContract";
import {
  isEnabledUserDelegationCapability,
  type EnabledUserDelegationCapability,
} from "./consent";

export const CONSENT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConsentValidationError = { error: string; status: number };

const CREATE_KEYS = new Set([
  "agent_client_id",
  "allowed_capabilities",
  "consent_version",
  "expires_at",
]);

export type ParsedCreateDelegation = {
  agentClientId: string;
  allowedCapabilities: EnabledUserDelegationCapability[];
  expiresAt: string | null;
};

function err(error: string, status = 400): ConsentValidationError {
  return { error, status };
}

function unknownKeys(record: Record<string, unknown>, allowed: Set<string>) {
  return Object.keys(record).filter((key) => !allowed.has(key));
}

export function normalizeConsentUuid(
  value: unknown,
  field: string,
): string | ConsentValidationError {
  if (typeof value !== "string" || !value.trim()) {
    return err(`${field} must be a uuid`);
  }
  const trimmed = value.trim();
  if (!CONSENT_UUID_PATTERN.test(trimmed)) {
    return err(`${field} must be a uuid`);
  }
  return trimmed.toLowerCase();
}

export function parseCreateDelegationInput(
  body: unknown,
  now = new Date(),
): ParsedCreateDelegation | ConsentValidationError {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }
  const record = body as Record<string, unknown>;
  if (unknownKeys(record, CREATE_KEYS).length > 0) {
    return err("unknown fields are not allowed");
  }

  const agentClientId = normalizeConsentUuid(
    record.agent_client_id,
    "agent_client_id",
  );
  if (typeof agentClientId === "object") return agentClientId;

  if (!Array.isArray(record.allowed_capabilities)) {
    return err("allowed_capabilities must be an array");
  }
  if (record.allowed_capabilities.length === 0) {
    return err("allowed_capabilities must not be empty");
  }

  const allowedCapabilities: EnabledUserDelegationCapability[] = [];
  const seen = new Set<string>();
  for (const raw of record.allowed_capabilities) {
    if (typeof raw !== "string" || !raw.trim()) {
      return err("unknown capability");
    }
    const capability = raw.trim();
    if (!isEnabledUserDelegationCapability(capability)) {
      return err(
        capability === "get_service_request" ||
          capability === "cancel_service_request" ||
          capability === "get_match" ||
          capability === "accept_match" ||
          capability === "decline_match"
          ? "capability_not_enabled"
          : "unknown capability",
      );
    }
    if (seen.has(capability)) continue;
    seen.add(capability);
    allowedCapabilities.push(capability);
  }

  if (typeof record.consent_version !== "string" || !record.consent_version.trim()) {
    return err("consent_version is required");
  }
  if (record.consent_version.trim() !== AGENT_USER_CONSENT_VERSION) {
    return err("consent_version_mismatch", 409);
  }

  let expiresAt: string | null = null;
  if (record.expires_at != null && record.expires_at !== "") {
    if (typeof record.expires_at !== "string") {
      return err("expires_at must be an RFC3339 timestamp");
    }
    const parsed = parseRfc3339Timestamp(record.expires_at);
    if (!parsed) return err("expires_at must be an RFC3339 timestamp");
    if (Date.parse(parsed) <= now.getTime()) {
      return err("expires_at must be in the future");
    }
    expiresAt = parsed;
  }

  return {
    agentClientId,
    allowedCapabilities,
    expiresAt,
  };
}

export function parseEmptyConsentBody(
  body: unknown,
): true | ConsentValidationError {
  if (body == null || body === "") return true;
  if (typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }
  if (Object.keys(body as Record<string, unknown>).length > 0) {
    return err("unknown fields are not allowed");
  }
  return true;
}
