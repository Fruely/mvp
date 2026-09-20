import "server-only";

import { recordAgentApiAuditEvent } from "@/lib/agentAuth/audit";
import {
  markAgentCredentialUsed,
  resolveAgentCredential,
} from "@/lib/agentAuth/resolve";
import { resolveAgentDelegation } from "@/lib/agentDelegation/resolve";
import {
  runDelegatedAuthorization,
  type DelegatedAuthorizationDependencies,
} from "./orchestrate";

export type { DelegatedAgentAuthorization } from "./decision";
export type { DelegatedAuthorizationDependencies } from "./orchestrate";

const defaultDependencies: DelegatedAuthorizationDependencies = {
  resolveCredential: resolveAgentCredential,
  resolveDelegation: resolveAgentDelegation,
  markCredentialUsed: markAgentCredentialUsed,
  recordAudit: recordAgentApiAuditEvent,
};

export async function authorizeDelegatedAgentCapability(input: {
  request: Request;
  capabilityId: string;
  deps?: Partial<DelegatedAuthorizationDependencies>;
}) {
  return runDelegatedAuthorization({
    request: input.request,
    capabilityId: input.capabilityId,
    deps: { ...defaultDependencies, ...input.deps },
  });
}
