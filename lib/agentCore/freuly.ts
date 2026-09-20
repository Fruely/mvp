import type { CapabilityCore, JsonSchema } from "./types";

const objectSchema = (
  properties: Record<string, unknown>,
  required: string[] = [],
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  ...(required.length ? { required } : {}),
});

const publicProtocols = ["openapi", "mcp", "a2a", "ard", "nlweb"] as const;
const actionProtocols = ["openapi", "mcp", "a2a", "ard"] as const;

export const FREULY_CAPABILITY_CORE: CapabilityCore = {
  schema_version: "1.0.0",
  service: {
    id: "freuly",
    name: "Freuly",
    type: "service_marketplace",
    canonical_url: "https://freuly.de",
    markets: ["DE"],
    languages: ["de", "ru", "uk"],
  },
  entities: [
    "specialist",
    "service",
    "service_request",
    "lead",
    "match",
  ],
  policies: {
    auth_profiles: {
      public_read: {
        authentication_required: false,
        scopes_required: false,
        audit_log: true,
        rate_limit_profile: "public",
      },
      verified_agent: {
        authentication_required: true,
        scopes_required: true,
        audit_log: true,
        rate_limit_profile: "standard_agent",
      },
      provider_agent: {
        authentication_required: true,
        scopes_required: true,
        audit_log: true,
        rate_limit_profile: "provider_agent",
      },
    },
  },
  capabilities: [
    {
      id: "search_specialists",
      audience: ["consumer_agent", "business_agent", "human"],
      mode: "read",
      description: "Search service professionals available through Freuly.",
      representative_intents: [
        "Find me a Russian-speaking psychologist in Germany",
        "I need a Ukrainian-speaking tutor online",
        "Find an accountant near Cologne",
      ],
      input_schema: objectSchema({
        category: { type: "string" },
        language: { type: "string" },
        country: { type: "string" },
        postal_code: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        work_format: {
          enum: ["online", "offline", "hybrid", null],
        },
        budget_max: { type: ["number", "null"], minimum: 0 },
      }),
      output_entity: "specialist",
      side_effects: false,
      auth_profile: "public_read",
      personal_data: {
        input: "none",
        output: "public",
      },
      protocol_exposure: [...publicProtocols],
    },
    {
      id: "get_specialist",
      audience: ["consumer_agent", "business_agent", "human"],
      mode: "read",
      description: "Get the public details of a Freuly specialist.",
      representative_intents: [
        "Show me more information about this specialist",
        "What services and languages does this professional offer?",
      ],
      input_schema: objectSchema(
        {
          specialist_id: { type: "string", minLength: 1 },
        },
        ["specialist_id"],
      ),
      output_entity: "specialist",
      side_effects: false,
      auth_profile: "public_read",
      personal_data: {
        input: "none",
        output: "public",
      },
      protocol_exposure: [...publicProtocols],
    },
    {
      id: "create_service_request",
      audience: ["consumer_agent", "business_agent"],
      mode: "write",
      description: "Create a service request on behalf of an authorized user.",
      representative_intents: [
        "Find a psychologist for me and send my request",
        "Send my request to suitable accountants",
        "Help me find a Russian-speaking tutor and create the request",
      ],
      input_schema: objectSchema(
        {
          category: { type: "string" },
          language: { type: "string" },
          work_format: { enum: ["online", "offline", "hybrid"] },
          location: { type: ["string", "null"] },
          budget_max: { type: ["number", "null"], minimum: 0 },
          request_text: { type: "string", minLength: 1 },
          user_contact: { type: "object" },
        },
        ["category", "language", "request_text", "user_contact"],
      ),
      output_entity: "service_request",
      side_effects: true,
      auth_profile: "verified_agent",
      required_scopes: ["requests:create"],
      consent: {
        required: true,
        type: "explicit_user_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "restricted",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "get_service_request",
      audience: ["consumer_agent", "business_agent"],
      mode: "read",
      description: "Read the status of a service request created by the authorized agent.",
      representative_intents: [
        "What is the status of my specialist request?",
        "Has Freuly matched my request yet?",
      ],
      input_schema: objectSchema(
        {
          request_id: { type: "string", minLength: 1 },
        },
        ["request_id"],
      ),
      output_entity: "service_request",
      side_effects: false,
      auth_profile: "verified_agent",
      required_scopes: ["requests:read"],
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "cancel_service_request",
      audience: ["consumer_agent", "business_agent"],
      mode: "write",
      description: "Cancel an existing service request when the user authorizes the action.",
      representative_intents: [
        "Cancel my specialist request",
        "I no longer need this service request",
      ],
      input_schema: objectSchema(
        {
          request_id: { type: "string", minLength: 1 },
        },
        ["request_id"],
      ),
      output_entity: "service_request",
      side_effects: true,
      auth_profile: "verified_agent",
      required_scopes: ["requests:cancel"],
      consent: {
        required: true,
        type: "explicit_user_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "discover_matching_leads",
      audience: ["provider_agent"],
      mode: "read",
      description: "Discover anonymized service demand that matches an authorized provider profile.",
      representative_intents: [
        "Find new psychology leads matching my practice",
        "Show me Russian-speaking clients looking for accounting help",
        "Find service requests that match my specialist profile",
      ],
      input_schema: objectSchema({
        category: { type: "string" },
        languages: {
          type: "array",
          items: { type: "string" },
        },
        work_formats: {
          type: "array",
          items: { enum: ["online", "offline", "hybrid"] },
        },
        locations: {
          type: "array",
          items: { type: "string" },
        },
      }),
      output_entity: "lead",
      side_effects: false,
      auth_profile: "provider_agent",
      required_scopes: ["leads:discover"],
      personal_data: {
        input: "minimal",
        output: "anonymized",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "get_lead_summary",
      audience: ["provider_agent"],
      mode: "read",
      description: "Get an anonymized summary of a lead visible to the authorized provider.",
      representative_intents: [
        "Show me the details I am allowed to see for this lead",
        "Is this customer request relevant to my services?",
      ],
      input_schema: objectSchema(
        {
          lead_id: { type: "string", minLength: 1 },
        },
        ["lead_id"],
      ),
      output_entity: "lead",
      side_effects: false,
      auth_profile: "provider_agent",
      required_scopes: ["leads:read"],
      personal_data: {
        input: "minimal",
        output: "anonymized",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "express_interest",
      audience: ["provider_agent"],
      mode: "write",
      description: "Express provider interest in an eligible lead without revealing customer contact data.",
      representative_intents: [
        "I am interested in this lead",
        "Tell Freuly I can take this customer request",
      ],
      input_schema: objectSchema(
        {
          lead_id: { type: "string", minLength: 1 },
        },
        ["lead_id"],
      ),
      output_entity: "match",
      side_effects: true,
      auth_profile: "provider_agent",
      required_scopes: ["leads:respond"],
      consent: {
        required: true,
        type: "provider_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "decline_lead",
      audience: ["provider_agent"],
      mode: "write",
      description: "Decline an eligible lead for the authorized provider.",
      representative_intents: [
        "Decline this lead",
        "This request is not suitable for my practice",
      ],
      input_schema: objectSchema(
        {
          lead_id: { type: "string", minLength: 1 },
          reason_code: { type: ["string", "null"] },
        },
        ["lead_id"],
      ),
      output_entity: "lead",
      side_effects: true,
      auth_profile: "provider_agent",
      required_scopes: ["leads:respond"],
      consent: {
        required: true,
        type: "provider_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "minimal",
        output: "anonymized",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "get_match",
      audience: ["consumer_agent", "provider_agent", "business_agent"],
      mode: "read",
      description: "Read the authorized view of a Freuly match.",
      representative_intents: [
        "Show me the status of this match",
        "Has the other side accepted the match?",
      ],
      input_schema: objectSchema(
        {
          match_id: { type: "string", minLength: 1 },
        },
        ["match_id"],
      ),
      output_entity: "match",
      side_effects: false,
      auth_profile: "verified_agent",
      required_scopes: ["matches:read"],
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "accept_match",
      audience: ["consumer_agent", "provider_agent", "business_agent"],
      mode: "write",
      description: "Accept a proposed match for the represented party.",
      representative_intents: [
        "Accept this specialist match",
        "Accept this customer match",
      ],
      input_schema: objectSchema(
        {
          match_id: { type: "string", minLength: 1 },
        },
        ["match_id"],
      ),
      output_entity: "match",
      side_effects: true,
      auth_profile: "verified_agent",
      required_scopes: ["matches:respond"],
      consent: {
        required: true,
        type: "explicit_user_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
    {
      id: "decline_match",
      audience: ["consumer_agent", "provider_agent", "business_agent"],
      mode: "write",
      description: "Decline a proposed match for the represented party.",
      representative_intents: [
        "Decline this specialist match",
        "Reject this proposed match",
      ],
      input_schema: objectSchema(
        {
          match_id: { type: "string", minLength: 1 },
          reason_code: { type: ["string", "null"] },
        },
        ["match_id"],
      ),
      output_entity: "match",
      side_effects: true,
      auth_profile: "verified_agent",
      required_scopes: ["matches:respond"],
      consent: {
        required: true,
        type: "explicit_user_authorization",
      },
      idempotency: {
        required: true,
      },
      personal_data: {
        input: "minimal",
        output: "minimal",
      },
      protocol_exposure: [...actionProtocols],
    },
  ],
};
