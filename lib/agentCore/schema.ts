export const CAPABILITY_CORE_JSON_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://freuly.de/schemas/agent-capability-core-v1.json",
  title: "Agent Capability Core",
  type: "object",
  additionalProperties: false,
  required: ["schema_version", "service", "entities", "capabilities", "policies"],
  properties: {
    schema_version: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    service: {
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "type", "canonical_url", "markets", "languages"],
      properties: {
        id: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        type: { type: "string", minLength: 1 },
        canonical_url: { type: "string", format: "uri" },
        markets: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "string", minLength: 2 },
        },
        languages: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "string", minLength: 2 },
        },
      },
    },
    entities: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
    capabilities: {
      type: "array",
      minItems: 1,
      items: { "$ref": "#/$defs/capability" },
    },
    policies: {
      type: "object",
      additionalProperties: false,
      required: ["auth_profiles"],
      properties: {
        auth_profiles: {
          type: "object",
          additionalProperties: { "$ref": "#/$defs/authProfile" },
        },
      },
    },
  },
  "$defs": {
    authProfile: {
      type: "object",
      additionalProperties: false,
      required: [
        "authentication_required",
        "scopes_required",
        "audit_log",
        "rate_limit_profile",
      ],
      properties: {
        authentication_required: { type: "boolean" },
        scopes_required: { type: "boolean" },
        audit_log: { type: "boolean" },
        rate_limit_profile: {
          enum: ["public", "standard_agent", "provider_agent", "internal"],
        },
      },
    },
    personalData: {
      type: "object",
      additionalProperties: false,
      required: ["input", "output"],
      properties: {
        input: {
          enum: ["none", "public", "minimal", "restricted", "anonymized"],
        },
        output: {
          enum: ["none", "public", "minimal", "restricted", "anonymized"],
        },
      },
    },
    consent: {
      type: "object",
      additionalProperties: false,
      required: ["required"],
      properties: {
        required: { type: "boolean" },
        type: {
          enum: [
            "explicit_user_authorization",
            "provider_authorization",
            "business_authorization",
          ],
        },
      },
    },
    capability: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "audience",
        "mode",
        "description",
        "representative_intents",
        "side_effects",
        "auth_profile",
        "personal_data",
        "protocol_exposure",
      ],
      properties: {
        id: { type: "string", pattern: "^[a-z][a-z0-9_]*$" },
        audience: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            enum: [
              "consumer_agent",
              "provider_agent",
              "business_agent",
              "internal_agent",
              "human",
            ],
          },
        },
        mode: { enum: ["read", "write"] },
        description: { type: "string", minLength: 1 },
        representative_intents: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "string", minLength: 1 },
        },
        input_schema: { type: "object" },
        output_schema: { type: "object" },
        output_entity: { type: "string", minLength: 1 },
        side_effects: { type: "boolean" },
        auth_profile: { type: "string", minLength: 1 },
        required_scopes: {
          type: "array",
          uniqueItems: true,
          items: { type: "string", minLength: 1 },
        },
        consent: { "$ref": "#/$defs/consent" },
        idempotency: {
          type: "object",
          additionalProperties: false,
          required: ["required"],
          properties: {
            required: { type: "boolean" },
          },
        },
        personal_data: { "$ref": "#/$defs/personalData" },
        protocol_exposure: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            enum: ["openapi", "mcp", "a2a", "ard", "nlweb"],
          },
        },
      },
    },
  },
} as const;
