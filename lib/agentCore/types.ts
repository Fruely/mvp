export type AgentAudience =
  | "consumer_agent"
  | "provider_agent"
  | "business_agent"
  | "internal_agent"
  | "human";

export type CapabilityMode = "read" | "write";

export type ProtocolExposure =
  | "openapi"
  | "mcp"
  | "a2a"
  | "ard"
  | "nlweb";

export type PersonalDataLevel =
  | "none"
  | "public"
  | "minimal"
  | "restricted"
  | "anonymized";

export type ConsentType =
  | "explicit_user_authorization"
  | "provider_authorization"
  | "business_authorization";

export type JsonSchema = Record<string, unknown>;

export type ConsentRequirement = {
  required: boolean;
  type?: ConsentType;
};

export type IdempotencyRequirement = {
  required: boolean;
};

export type PersonalDataPolicy = {
  input: PersonalDataLevel;
  output: PersonalDataLevel;
};

export type CapabilityDefinition = {
  id: string;
  audience: AgentAudience[];
  mode: CapabilityMode;
  description: string;
  representative_intents: string[];
  input_schema?: JsonSchema;
  output_schema?: JsonSchema;
  output_entity?: string;
  side_effects: boolean;
  auth_profile: string;
  required_scopes?: string[];
  consent?: ConsentRequirement;
  idempotency?: IdempotencyRequirement;
  personal_data: PersonalDataPolicy;
  protocol_exposure: ProtocolExposure[];
};

export type AuthProfile = {
  authentication_required: boolean;
  scopes_required: boolean;
  audit_log: boolean;
  rate_limit_profile: "public" | "standard_agent" | "provider_agent" | "internal";
};

export type CapabilityService = {
  id: string;
  name: string;
  type: string;
  canonical_url: string;
  markets: string[];
  languages: string[];
};

export type CapabilityCore = {
  schema_version: string;
  service: CapabilityService;
  entities: string[];
  capabilities: CapabilityDefinition[];
  policies: {
    auth_profiles: Record<string, AuthProfile>;
  };
};
