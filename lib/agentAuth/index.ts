export {
  AGENT_API_KEY_PREFIX,
  generateAgentCredential,
  hashAgentCredential,
  parseAgentCredential,
  readAgentApiKeyPepper,
  verifyAgentCredentialHash,
} from "./credentials";
export {
  AGENT_CLIENT_TYPES,
  authenticateAgentCredentialRecord,
  missingAgentScopes,
} from "./policy";
export {
  markAgentCredentialUsed,
  resolveAgentCredential,
} from "./resolve";
export { recordAgentApiAuditEvent } from "./audit";
export {
  AGENT_AUDIT_METADATA_ALLOWED_KEYS,
  sanitizeAgentAuditMetadata,
} from "./auditMetadata";
export {
  clientScopesAreKnown,
  isKnownAgentScope,
  listCapabilityCoreScopes,
} from "./scopes";
export type {
  AgentClientRecord,
  AgentClientType,
  AgentCredentialRecord,
  AgentIdentity,
} from "./policy";
export type {
  AgentApiAuditEvent,
  AgentAuditMetadata,
  AgentAuditOutcome,
} from "./audit";
