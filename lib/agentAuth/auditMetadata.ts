export const AGENT_AUDIT_METADATA_MAX_STRING_LENGTH = 80;

export const AGENT_AUDIT_METADATA_ALLOWED_KEYS = [
  "reason",
  "missing_scope_count",
  "client_type",
  "delegation_reason",
] as const;

export type AgentAuditMetadataKey =
  (typeof AGENT_AUDIT_METADATA_ALLOWED_KEYS)[number];

export type AgentAuditMetadataValue = string | number | boolean | null;

export type AgentAuditMetadata = {
  reason?: string | null;
  missing_scope_count?: number | null;
  client_type?: string | null;
  delegation_reason?: string | null;
};

const ALLOWED_KEYS = new Set<string>(AGENT_AUDIT_METADATA_ALLOWED_KEYS);

const SENSITIVE_AUDIT_METADATA_KEY =
  /(authorization|token|credential|api[_-]?key|secret|password|cookie|email|phone|contact|payload|request_body|ip_address|\bip\b|body)/i;

export function isSensitiveAuditMetadataKey(key: string): boolean {
  return SENSITIVE_AUDIT_METADATA_KEY.test(key);
}

export function isAllowedAuditMetadataKey(
  key: string,
): key is AgentAuditMetadataKey {
  return ALLOWED_KEYS.has(key);
}

function sanitizeAuditMetadataValue(
  value: unknown,
): AgentAuditMetadataValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const normalized = value.trim().slice(0, AGENT_AUDIT_METADATA_MAX_STRING_LENGTH);
    return normalized || null;
  }
  return undefined;
}

export function sanitizeAgentAuditMetadata(
  metadata: AgentAuditMetadata | null | undefined,
): Record<string, AgentAuditMetadataValue> {
  const sanitized: Record<string, AgentAuditMetadataValue> = {};
  if (metadata == null || typeof metadata !== "object" || Array.isArray(metadata)) {
    return sanitized;
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (!isAllowedAuditMetadataKey(key)) continue;
    if (isSensitiveAuditMetadataKey(key)) continue;

    const clean = sanitizeAuditMetadataValue(value);
    if (clean === undefined) continue;
    sanitized[key] = clean;
  }

  return sanitized;
}
