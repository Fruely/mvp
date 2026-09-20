import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  parseAgentCredential,
  readAgentApiKeyPepper,
} from "./credentials";
import {
  authenticateAgentCredentialRecord,
  type AgentAuthenticationDecision,
  type AgentClientRecord,
  type AgentCredentialRecord,
} from "./policy";

export type AgentCredentialResolution =
  | { kind: "absent" }
  | AgentAuthenticationDecision;

function readBearerCredential(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function resolveAgentCredential(
  request: Request,
  requiredScopes: readonly string[] = [],
): Promise<AgentCredentialResolution> {
  const bearer = readBearerCredential(request);
  if (!bearer) return { kind: "absent" };

  const parsed = parseAgentCredential(bearer);
  if (!parsed) return { kind: "invalid" };

  const pepper = readAgentApiKeyPepper();
  if (!pepper) {
    console.error("[agent-auth] AGENT_API_KEY_PEPPER is missing or too short");
    return { kind: "invalid" };
  }

  const supabase = createSupabaseServerClient();

  const { data: credential, error: credentialError } = await supabase
    .from("agent_credentials")
    .select(
      "id, agent_client_id, key_prefix, credential_hash, status, expires_at, revoked_at",
    )
    .eq("key_prefix", parsed.keyPrefix)
    .maybeSingle();

  if (credentialError) {
    console.error("[agent-auth] credential lookup failed", {
      code: credentialError.code,
    });
    return { kind: "invalid" };
  }
  if (!credential) return { kind: "invalid" };

  const { data: client, error: clientError } = await supabase
    .from("agent_clients")
    .select(
      "id, name, client_type, provider, status, scopes, specialist_id, owner_user_id",
    )
    .eq("id", credential.agent_client_id)
    .maybeSingle();

  if (clientError) {
    console.error("[agent-auth] client lookup failed", {
      code: clientError.code,
    });
    return { kind: "invalid" };
  }

  return authenticateAgentCredentialRecord({
    rawCredential: parsed.raw,
    pepper,
    credential: credential as AgentCredentialRecord | null,
    client: client as AgentClientRecord | null,
    requiredScopes,
  });
}

export async function markAgentCredentialUsed(
  credentialId: string,
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    await supabase
      .from("agent_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", credentialId)
      .eq("status", "active");
  } catch (error) {
    console.error("[agent-auth] last_used_at update failed", error);
  }
}
