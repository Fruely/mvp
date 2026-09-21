import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  generateAgentCredential,
  readAgentApiKeyPepper,
  type GeneratedAgentCredential,
} from "@/lib/agentAuth/credentials";
import type { AgentClientType } from "@/lib/agentAuth/policy";
import { isUniqueViolation } from "@/lib/mutations/clientIdempotency";
import {
  normalizeAgentProvisioningUuid,
  parseCreateAgentClientInput,
  parseEmptyPatchBody,
  parseIssueAgentCredentialInput,
  type ParsedCreateAgentClient,
} from "./validation";

export const CREDENTIAL_ISSUE_RETRY_LIMIT = 5;

export type SafeAgentClient = {
  id: string;
  name: string;
  client_type: AgentClientType;
  provider: string | null;
  status: "active" | "disabled";
  scopes: string[];
  owner_user_id: string | null;
  specialist_id: string | null;
  created_at: string;
};

export type IssuedAgentCredential = {
  credential_id: string;
  agent_client_id: string;
  key_prefix: string;
  raw_credential: string;
  expires_at: string | null;
  created_at: string;
};

export type RevokedAgentCredential = {
  credential_id: string;
  agent_client_id: string;
  status: "revoked";
  revoked_at: string;
};

export type DisabledAgentClient = {
  id: string;
  status: "disabled";
  updated_at: string;
};

export type ProvisioningFailure = {
  kind: "validation_error" | "not_found" | "conflict" | "unavailable" | "error";
  error: string;
  status: number;
};

export type ProvisioningSuccess<T> = { kind: "ok"; value: T };
export type ProvisioningResult<T> = ProvisioningSuccess<T> | ProvisioningFailure;

export type AgentProvisioningDependencies = {
  readPepper?: () => string | null;
  generateCredential?: (pepper: string) => GeneratedAgentCredential;
  now?: () => Date;
};

const CLIENT_SAFE_SELECT =
  "id, name, client_type, provider, status, scopes, owner_user_id, specialist_id, created_at";

function fail(
  kind: ProvisioningFailure["kind"],
  error: string,
  status: number,
): ProvisioningFailure {
  return { kind, error, status };
}

function depsWithDefaults(deps: AgentProvisioningDependencies = {}) {
  return {
    readPepper: deps.readPepper ?? readAgentApiKeyPepper,
    generateCredential: deps.generateCredential ?? generateAgentCredential,
    now: deps.now ?? (() => new Date()),
  };
}

function asClientRow(row: Record<string, unknown>): SafeAgentClient {
  return {
    id: String(row.id),
    name: String(row.name),
    client_type: row.client_type as AgentClientType,
    provider: typeof row.provider === "string" ? row.provider : null,
    status: row.status === "disabled" ? "disabled" : "active",
    scopes: Array.isArray(row.scopes)
      ? row.scopes.filter((scope): scope is string => typeof scope === "string")
      : [],
    owner_user_id:
      typeof row.owner_user_id === "string" ? row.owner_user_id : null,
    specialist_id:
      typeof row.specialist_id === "string" ? row.specialist_id : null,
    created_at: String(row.created_at),
  };
}

export async function createAgentClient(
  supabase: SupabaseClient,
  body: unknown,
): Promise<ProvisioningResult<SafeAgentClient>> {
  const parsed = parseCreateAgentClientInput(body);
  if ("error" in parsed) {
    return fail("validation_error", parsed.error, parsed.status);
  }
  return insertAgentClient(supabase, parsed);
}

async function insertAgentClient(
  supabase: SupabaseClient,
  input: ParsedCreateAgentClient,
): Promise<ProvisioningResult<SafeAgentClient>> {
  const { data, error } = await supabase
    .from("agent_clients")
    .insert({
      name: input.name,
      client_type: input.clientType,
      provider: input.provider,
      status: "active",
      scopes: input.scopes,
      owner_user_id: input.ownerUserId,
      specialist_id: input.specialistId,
    })
    .select(CLIENT_SAFE_SELECT)
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23503") {
      return fail("validation_error", "invalid owner_user_id or specialist_id", 400);
    }
    return fail("error", "server_error", 500);
  }
  return { kind: "ok", value: asClientRow(data as Record<string, unknown>) };
}

export async function issueAgentCredential(
  supabase: SupabaseClient,
  agentClientIdRaw: string,
  body: unknown,
  deps: AgentProvisioningDependencies = {},
): Promise<ProvisioningResult<IssuedAgentCredential>> {
  const resolved = depsWithDefaults(deps);
  const agentClientId = normalizeAgentProvisioningUuid(
    agentClientIdRaw,
    "agent_client_id",
  );
  if (!agentClientId) return fail("validation_error", "agent_client_id must be a uuid", 400);
  if (typeof agentClientId === "object") {
    return fail("validation_error", agentClientId.error, agentClientId.status);
  }

  const parsed = parseIssueAgentCredentialInput(body, resolved.now());
  if ("error" in parsed) {
    return fail("validation_error", parsed.error, parsed.status);
  }

  const pepper = resolved.readPepper();
  if (!pepper) {
    return fail("unavailable", "credential issuance unavailable", 503);
  }

  const { data: client, error: clientError } = await supabase
    .from("agent_clients")
    .select("id, status")
    .eq("id", agentClientId)
    .maybeSingle();

  if (clientError) return fail("error", "server_error", 500);
  if (!client) return fail("not_found", "agent_client not found", 404);
  if (client.status !== "active") {
    return fail("conflict", "agent_client_disabled", 409);
  }

  for (let attempt = 0; attempt < CREDENTIAL_ISSUE_RETRY_LIMIT; attempt += 1) {
    const generated = resolved.generateCredential(pepper);
    const nowIso = resolved.now().toISOString();
    const { data, error } = await supabase
      .from("agent_credentials")
      .insert({
        agent_client_id: agentClientId,
        key_prefix: generated.keyPrefix,
        credential_hash: generated.credentialHash,
        status: "active",
        expires_at: parsed.expiresAt,
      })
      .select("id, agent_client_id, key_prefix, expires_at, created_at")
      .single();

    if (!error && data) {
      return {
        kind: "ok",
        value: {
          credential_id: String(data.id),
          agent_client_id: String(data.agent_client_id),
          key_prefix: String(data.key_prefix),
          raw_credential: generated.raw,
          expires_at:
            typeof data.expires_at === "string" ? data.expires_at : null,
          created_at: String(data.created_at ?? nowIso),
        },
      };
    }

    if (isUniqueViolation(error) && attempt < CREDENTIAL_ISSUE_RETRY_LIMIT - 1) {
      continue;
    }
    if (isUniqueViolation(error)) {
      return fail("error", "server_error", 500);
    }
    return fail("error", "server_error", 500);
  }

  return fail("error", "server_error", 500);
}

export async function revokeAgentCredential(
  supabase: SupabaseClient,
  credentialIdRaw: string,
  body: unknown = {},
  deps: AgentProvisioningDependencies = {},
): Promise<ProvisioningResult<RevokedAgentCredential>> {
  const empty = parseEmptyPatchBody(body);
  if (empty !== true) return fail("validation_error", empty.error, empty.status);

  const credentialId = normalizeAgentProvisioningUuid(
    credentialIdRaw,
    "credential_id",
  );
  if (!credentialId) return fail("validation_error", "credential_id must be a uuid", 400);
  if (typeof credentialId === "object") {
    return fail("validation_error", credentialId.error, credentialId.status);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("agent_credentials")
    .select("id, agent_client_id, status, revoked_at")
    .eq("id", credentialId)
    .maybeSingle();

  if (lookupError) return fail("error", "server_error", 500);
  if (!existing) return fail("not_found", "credential not found", 404);

  if (existing.status === "revoked" && typeof existing.revoked_at === "string") {
    return {
      kind: "ok",
      value: {
        credential_id: String(existing.id),
        agent_client_id: String(existing.agent_client_id),
        status: "revoked",
        revoked_at: existing.revoked_at,
      },
    };
  }

  const revokedAt = depsWithDefaults(deps).now().toISOString();
  const { data, error } = await supabase
    .from("agent_credentials")
    .update({ status: "revoked", revoked_at: revokedAt })
    .eq("id", credentialId)
    .select("id, agent_client_id, status, revoked_at")
    .maybeSingle();

  if (error || !data) return fail("error", "server_error", 500);
  return {
    kind: "ok",
    value: {
      credential_id: String(data.id),
      agent_client_id: String(data.agent_client_id),
      status: "revoked",
      revoked_at: String(data.revoked_at ?? revokedAt),
    },
  };
}

/**
 * Disabling a client does not revoke historical credentials.
 * Existing authenticateAgentCredentialRecord already treats a disabled
 * client as invalid, so this PR does not silently mutate agent_credentials.
 */
export async function disableAgentClient(
  supabase: SupabaseClient,
  agentClientIdRaw: string,
  body: unknown = {},
  deps: AgentProvisioningDependencies = {},
): Promise<ProvisioningResult<DisabledAgentClient>> {
  const empty = parseEmptyPatchBody(body);
  if (empty !== true) return fail("validation_error", empty.error, empty.status);

  const agentClientId = normalizeAgentProvisioningUuid(
    agentClientIdRaw,
    "agent_client_id",
  );
  if (!agentClientId) return fail("validation_error", "agent_client_id must be a uuid", 400);
  if (typeof agentClientId === "object") {
    return fail("validation_error", agentClientId.error, agentClientId.status);
  }

  const { data: existing, error: lookupError } = await supabase
    .from("agent_clients")
    .select("id, status, updated_at")
    .eq("id", agentClientId)
    .maybeSingle();

  if (lookupError) return fail("error", "server_error", 500);
  if (!existing) return fail("not_found", "agent_client not found", 404);

  if (existing.status === "disabled") {
    return {
      kind: "ok",
      value: {
        id: String(existing.id),
        status: "disabled",
        updated_at: String(existing.updated_at),
      },
    };
  }

  const updatedAt = depsWithDefaults(deps).now().toISOString();
  const { data, error } = await supabase
    .from("agent_clients")
    .update({ status: "disabled", updated_at: updatedAt })
    .eq("id", agentClientId)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error || !data) return fail("error", "server_error", 500);
  return {
    kind: "ok",
    value: {
      id: String(data.id),
      status: "disabled",
      updated_at: String(data.updated_at ?? updatedAt),
    },
  };
}
