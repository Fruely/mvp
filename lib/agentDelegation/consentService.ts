import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentClientRecord } from "@/lib/agentAuth/policy";
import {
  AGENT_USER_CONSENT_VERSION,
  grantableConsentCapabilities,
  isUserConsentableAgent,
  verifyCapabilityGrant,
} from "./consent";
import {
  normalizeConsentUuid,
  parseCreateDelegationInput,
  parseEmptyConsentBody,
} from "./consentValidation";
import type { AgentDelegationRecord } from "./types";

export type ConsentFailure = {
  kind: "validation_error" | "not_found" | "conflict" | "error";
  error: string;
  status: number;
};

export type ConsentSuccess<T> = { kind: "ok"; value: T };
export type ConsentResult<T> = ConsentSuccess<T> | ConsentFailure;

export type SafeConsentAgentPreview = {
  id: string;
  name: string;
  client_type: AgentClientRecord["client_type"];
  provider: string | null;
  status: "active";
  consent_version: typeof AGENT_USER_CONSENT_VERSION;
  delegatable_capabilities: Array<{ id: string; description: string }>;
};

export type SafeDelegationAgent = {
  name: string;
  client_type: AgentClientRecord["client_type"];
  provider: string | null;
};

export type SafeCreatedDelegation = {
  delegation_id: string;
  agent_client_id: string;
  agent: SafeDelegationAgent;
  status: "active";
  allowed_capabilities: string[];
  consent_version: string;
  granted_at: string;
  expires_at: string | null;
};

export type SafeListedDelegation = {
  delegation_id: string;
  agent_client_id: string;
  agent: SafeDelegationAgent;
  status: "active" | "revoked" | "expired";
  allowed_capabilities: string[];
  consent_version: string;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export type SafeRevokedDelegation = {
  delegation_id: string;
  agent_client_id: string;
  status: "revoked";
  revoked_at: string;
};

export type ConsentDependencies = {
  now?: () => Date;
};

const CLIENT_CONSENT_SELECT =
  "id, name, client_type, provider, status, scopes, owner_user_id";

const DELEGATION_SAFE_SELECT =
  "id, agent_client_id, user_id, status, allowed_capabilities, consent_version, granted_at, expires_at, revoked_at";

function fail(
  kind: ConsentFailure["kind"],
  error: string,
  status: number,
): ConsentFailure {
  return { kind, error, status };
}

function nowOf(deps: ConsentDependencies = {}) {
  return deps.now ?? (() => new Date());
}

function asClient(row: Record<string, unknown>): AgentClientRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    client_type: row.client_type as AgentClientRecord["client_type"],
    provider: typeof row.provider === "string" ? row.provider : null,
    status: row.status === "disabled" ? "disabled" : "active",
    scopes: Array.isArray(row.scopes)
      ? row.scopes.filter((scope): scope is string => typeof scope === "string")
      : [],
    specialist_id:
      typeof row.specialist_id === "string" ? row.specialist_id : null,
    owner_user_id:
      typeof row.owner_user_id === "string" ? row.owner_user_id : null,
  };
}

function asDelegation(row: Record<string, unknown>): AgentDelegationRecord {
  return {
    id: String(row.id),
    agent_client_id: String(row.agent_client_id),
    user_id: String(row.user_id),
    status: row.status === "revoked" ? "revoked" : "active",
    allowed_capabilities: Array.isArray(row.allowed_capabilities)
      ? row.allowed_capabilities.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    consent_version: String(row.consent_version),
    purpose: typeof row.purpose === "string" ? row.purpose : null,
    granted_at: String(row.granted_at),
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
  };
}

function safeAgent(client: AgentClientRecord): SafeDelegationAgent {
  return {
    name: client.name,
    client_type: client.client_type,
    provider: client.provider,
  };
}

export function effectiveDelegationStatus(
  row: Pick<AgentDelegationRecord, "status" | "expires_at">,
  now: Date,
): "active" | "revoked" | "expired" {
  if (row.status === "revoked") return "revoked";
  if (row.expires_at) {
    const expiresAt = Date.parse(row.expires_at);
    if (Number.isFinite(expiresAt) && expiresAt <= now.getTime()) {
      return "expired";
    }
  }
  return "active";
}

async function loadConsentableClient(
  supabase: SupabaseClient,
  agentClientId: string,
  userId: string,
): Promise<ConsentResult<AgentClientRecord>> {
  const { data, error } = await supabase
    .from("agent_clients")
    .select(CLIENT_CONSENT_SELECT)
    .eq("id", agentClientId)
    .maybeSingle();

  if (error) return fail("error", "server_error", 500);
  if (!data) return fail("not_found", "agent_client not found", 404);
  const client = asClient(data as Record<string, unknown>);
  if (!isUserConsentableAgent(client, userId)) {
    return fail("not_found", "agent_client not found", 404);
  }
  return { kind: "ok", value: client };
}

export async function previewConsentableAgent(
  supabase: SupabaseClient,
  userId: string,
  agentClientIdRaw: string,
): Promise<ConsentResult<SafeConsentAgentPreview>> {
  const agentClientId = normalizeConsentUuid(agentClientIdRaw, "agent_client_id");
  if (typeof agentClientId === "object") {
    return fail("validation_error", agentClientId.error, agentClientId.status);
  }

  const loaded = await loadConsentableClient(supabase, agentClientId, userId);
  if (loaded.kind !== "ok") return loaded;

  return {
    kind: "ok",
    value: {
      id: loaded.value.id,
      name: loaded.value.name,
      client_type: loaded.value.client_type,
      provider: loaded.value.provider,
      status: "active",
      consent_version: AGENT_USER_CONSENT_VERSION,
      delegatable_capabilities: grantableConsentCapabilities(loaded.value),
    },
  };
}

export async function createUserDelegation(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
  deps: ConsentDependencies = {},
): Promise<ConsentResult<SafeCreatedDelegation>> {
  const parsed = parseCreateDelegationInput(body, nowOf(deps)());
  if ("error" in parsed) {
    return fail(
      parsed.status === 409 ? "conflict" : "validation_error",
      parsed.error,
      parsed.status,
    );
  }

  const loaded = await loadConsentableClient(
    supabase,
    parsed.agentClientId,
    userId,
  );
  if (loaded.kind !== "ok") return loaded;

  for (const capabilityId of parsed.allowedCapabilities) {
    const verified = verifyCapabilityGrant(capabilityId, loaded.value);
    if (!verified.ok) {
      return fail("validation_error", verified.error, 400);
    }
  }

  const now = nowOf(deps)();
  const { data: existingRows, error: existingError } = await supabase
    .from("agent_delegations")
    .select(DELEGATION_SAFE_SELECT)
    .eq("user_id", userId)
    .eq("agent_client_id", parsed.agentClientId)
    .eq("status", "active");

  if (existingError) return fail("error", "server_error", 500);
  const effectivelyActive = (Array.isArray(existingRows) ? existingRows : []).some(
    (raw) =>
      effectiveDelegationStatus(asDelegation(raw as Record<string, unknown>), now) ===
      "active",
  );
  if (effectivelyActive) {
    return fail("conflict", "active_delegation_exists", 409);
  }

  const { data, error } = await supabase
    .from("agent_delegations")
    .insert({
      agent_client_id: parsed.agentClientId,
      user_id: userId,
      status: "active",
      allowed_capabilities: parsed.allowedCapabilities,
      consent_version: AGENT_USER_CONSENT_VERSION,
      purpose: null,
      expires_at: parsed.expiresAt,
    })
    .select(DELEGATION_SAFE_SELECT)
    .single();

  if (error || !data) return fail("error", "server_error", 500);
  const row = asDelegation(data as Record<string, unknown>);
  return {
    kind: "ok",
    value: {
      delegation_id: row.id,
      agent_client_id: row.agent_client_id,
      agent: safeAgent(loaded.value),
      status: "active",
      allowed_capabilities: row.allowed_capabilities,
      consent_version: row.consent_version,
      granted_at: row.granted_at,
      expires_at: row.expires_at,
    },
  };
}

export async function listUserDelegations(
  supabase: SupabaseClient,
  userId: string,
  deps: ConsentDependencies = {},
): Promise<ConsentResult<SafeListedDelegation[]>> {
  const { data, error } = await supabase
    .from("agent_delegations")
    .select(DELEGATION_SAFE_SELECT)
    .eq("user_id", userId)
    .order("granted_at", { ascending: false });

  if (error) return fail("error", "server_error", 500);
  const rows = Array.isArray(data) ? data : [];
  const clientIds = Array.from(
    new Set(rows.map((row) => String((row as { agent_client_id: string }).agent_client_id))),
  );

  const clients = new Map<string, AgentClientRecord>();
  if (clientIds.length) {
    const { data: clientRows, error: clientError } = await supabase
      .from("agent_clients")
      .select(CLIENT_CONSENT_SELECT)
      .in("id", clientIds);
    if (clientError) return fail("error", "server_error", 500);
    for (const row of clientRows ?? []) {
      const client = asClient(row as Record<string, unknown>);
      clients.set(client.id, client);
    }
  }

  const now = nowOf(deps)();
  const listed: SafeListedDelegation[] = [];
  for (const raw of rows) {
    const row = asDelegation(raw as Record<string, unknown>);
    const client = clients.get(row.agent_client_id);
    if (!client) {
      return fail("error", "server_error", 500);
    }
    listed.push({
      delegation_id: row.id,
      agent_client_id: row.agent_client_id,
      agent: safeAgent(client),
      status: effectiveDelegationStatus(row, now),
      allowed_capabilities: row.allowed_capabilities,
      consent_version: row.consent_version,
      granted_at: row.granted_at,
      expires_at: row.expires_at,
      revoked_at: row.revoked_at,
    });
  }
  return { kind: "ok", value: listed };
}

export async function revokeUserDelegation(
  supabase: SupabaseClient,
  userId: string,
  delegationIdRaw: string,
  body: unknown = {},
  deps: ConsentDependencies = {},
): Promise<ConsentResult<SafeRevokedDelegation>> {
  const empty = parseEmptyConsentBody(body);
  if (empty !== true) {
    return fail("validation_error", empty.error, empty.status);
  }

  const delegationId = normalizeConsentUuid(delegationIdRaw, "delegation_id");
  if (typeof delegationId === "object") {
    return fail("validation_error", delegationId.error, delegationId.status);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("agent_delegations")
    .select(DELEGATION_SAFE_SELECT)
    .eq("id", delegationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) return fail("error", "server_error", 500);
  if (!existing) return fail("not_found", "delegation not found", 404);

  const row = asDelegation(existing as Record<string, unknown>);
  const revokedAt = nowOf(deps)().toISOString();
  const { error } = await supabase
    .from("agent_delegations")
    .update({
      status: "revoked",
      revoked_at: revokedAt,
      updated_at: revokedAt,
    })
    .eq("user_id", userId)
    .eq("agent_client_id", row.agent_client_id)
    .eq("status", "active");

  if (error) return fail("error", "server_error", 500);

  const { data: refreshed, error: refreshError } = await supabase
    .from("agent_delegations")
    .select(DELEGATION_SAFE_SELECT)
    .eq("id", delegationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (refreshError || !refreshed) return fail("error", "server_error", 500);
  const updated = asDelegation(refreshed as Record<string, unknown>);
  return {
    kind: "ok",
    value: {
      delegation_id: updated.id,
      agent_client_id: updated.agent_client_id,
      status: "revoked",
      revoked_at:
        updated.revoked_at ??
        (row.status === "revoked" && row.revoked_at ? row.revoked_at : revokedAt),
    },
  };
}
