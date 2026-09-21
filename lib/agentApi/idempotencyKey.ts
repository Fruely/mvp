import { createHash } from "node:crypto";
import { normalizeClientIdempotencyKey } from "@/lib/mutations/clientIdempotency";

export const AGENT_CREATE_SERVICE_REQUEST_IDEMPOTENCY_PREFIX =
  "agent:create_service_request";

/**
 * Map an external Agent Idempotency-Key onto the global
 * service_requests.client_idempotency_key namespace.
 *
 * Hash input is authenticated agentClientId + NUL + the already-normalized
 * external key. Capability prefix keeps future Agent writes from colliding.
 */
export function deriveAgentCreateServiceRequestStorageKey(input: {
  agentClientId: string;
  externalKey: string;
}): string | null {
  const agentClientId = input.agentClientId.trim();
  const externalKey = normalizeClientIdempotencyKey(input.externalKey);
  if (!agentClientId || !externalKey) return null;

  const digest = createHash("sha256")
    .update(agentClientId)
    .update("\0")
    .update(externalKey)
    .digest("hex");

  return normalizeClientIdempotencyKey(
    `${AGENT_CREATE_SERVICE_REQUEST_IDEMPOTENCY_PREFIX}:${digest}`,
  );
}
