export { FREULY_CAPABILITY_CORE } from "./freuly";
export { CAPABILITY_CORE_JSON_SCHEMA } from "./schema";
export { validateCapabilityCore } from "./validate";
export { buildFreulyArdManifest } from "./adapters/ard";
export { buildFreulyReadOnlyOpenApiDocument } from "./adapters/openapi";
export {
  FREULY_MCP_ENDPOINT,
  FREULY_MCP_PROTOCOL_VERSION,
  buildFreulyMcpDiscoverResult,
  buildFreulyMcpToolCatalog,
  dispatchFreulyMcpRequest,
  validateFreulyMcpHttpRequest,
} from "./adapters/mcp";
export type {
  AgentAudience,
  AuthProfile,
  CapabilityCore,
  CapabilityDefinition,
  CapabilityMode,
  CapabilityService,
  ConsentRequirement,
  ConsentType,
  IdempotencyRequirement,
  JsonSchema,
  PersonalDataLevel,
  PersonalDataPolicy,
  ProtocolExposure,
} from "./types";
