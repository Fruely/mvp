import { FREULY_CAPABILITY_CORE } from "../freuly";
import type { CapabilityDefinition } from "../types";

const DOMAIN = FREULY_CAPABILITY_CORE.service.canonical_url;

function capability(id: string): CapabilityDefinition {
  const found = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
  if (!found) throw new Error(`Missing capability: ${id}`);
  return found;
}

const searchCapability = capability("search_specialists");
const specialistCapability = capability("get_specialist");

const specialistSummarySchema = {
  type: "object",
  additionalProperties: true,
  required: ["id", "languages"],
  properties: {
    id: { type: "string" },
    slug: { type: ["string", "null"] },
    name: { type: ["string", "null"] },
    bio: { type: ["string", "null"] },
    avatar_url: { type: ["string", "null"] },
    category_id: { type: ["string", "null"] },
    category_slug: { type: ["string", "null"] },
    category_title: { type: ["string", "null"] },
    category_title_ru: { type: ["string", "null"] },
    category_title_de: { type: ["string", "null"] },
    category_title_ua: { type: ["string", "null"] },
    languages: {
      type: "array",
      items: { type: "string" },
    },
    work_format: { type: ["string", "null"] },
    postal_code: { type: ["string", "null"] },
    distance: { type: "number" },
  },
} as const;

export function buildFreulyReadOnlyOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Freuly Agent Read API",
      version: FREULY_CAPABILITY_CORE.schema_version,
      description:
        "Stable v1 read-only machine interface for discovering public service professionals available through Freuly in Germany. Write actions are intentionally not advertised in this version.",
    },
    servers: [{ url: DOMAIN }],
    paths: {
      "/api/v1/agent/specialists": {
        get: {
          operationId: searchCapability.id,
          summary: searchCapability.description,
          description:
            `${searchCapability.description} Representative intents: ${searchCapability.representative_intents.join("; ")}.`,
          parameters: [
            {
              name: "lang",
              in: "query",
              required: false,
              description: "Preferred specialist language.",
              schema: { type: "string", enum: ["de", "ru", "ua", "uk"] },
            },
            {
              name: "category",
              in: "query",
              required: false,
              description: "Freuly category slug.",
              schema: { type: "string" },
            },
            {
              name: "mode",
              in: "query",
              required: false,
              description:
                "Use online to restrict results to specialists who work online or hybrid.",
              schema: { type: "string", enum: ["online"] },
            },
            {
              name: "place",
              in: "query",
              required: false,
              description: "German city name or five-digit postal code for local search.",
              schema: { type: "string" },
            },
            {
              name: "q",
              in: "query",
              required: false,
              description: "Free-text service or specialist search query.",
              schema: { type: "string" },
            },
            {
              name: "radius",
              in: "query",
              required: false,
              description: "Local search radius in kilometres.",
              schema: {
                type: "integer",
                enum: [5, 10, 25, 30, 50, 100],
              },
            },
            {
              name: "offset",
              in: "query",
              required: false,
              description: "Pagination offset.",
              schema: { type: "integer", minimum: 0, default: 0 },
            },
          ],
          responses: {
            "200": {
              description: "Public specialist search result.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                    required: ["data"],
                    properties: {
                      data: {
                        type: "array",
                        items: { "$ref": "#/components/schemas/SpecialistSummary" },
                      },
                      mode: { type: "string" },
                      radius: { type: "number" },
                      fallback: { type: "string" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          "x-representative-intents": searchCapability.representative_intents,
        },
      },
      "/api/v1/agent/specialists/{id}": {
        get: {
          operationId: specialistCapability.id,
          summary: specialistCapability.description,
          description:
            `${specialistCapability.description} Representative intents: ${specialistCapability.representative_intents.join("; ")}.`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Freuly specialist UUID or public slug.",
              schema: { type: "string", minLength: 1 },
            },
            {
              name: "lang",
              in: "query",
              required: false,
              description: "Preferred content language.",
              schema: { type: "string", enum: ["de", "ru", "ua", "uk"] },
            },
          ],
          responses: {
            "200": {
              description: "Public specialist details.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    additionalProperties: true,
                    required: ["data"],
                    properties: {
                      data: {
                        type: "object",
                        additionalProperties: true,
                        required: ["id", "languages", "specialist_services"],
                        properties: {
                          ...specialistSummarySchema.properties,
                          city: { type: ["string", "null"] },
                          description: { type: ["string", "null"] },
                          video_url: { type: ["string", "null"] },
                          gallery_urls: {
                            type: "array",
                            items: { type: "string" },
                          },
                          certificate_urls: {
                            type: "array",
                            items: { type: "string" },
                          },
                          rating: { type: ["number", "null"] },
                          reviews_count: { type: "integer", minimum: 0 },
                          specialist_services: {
                            type: "array",
                            items: {
                              type: "object",
                              additionalProperties: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "404": {
              description: "Specialist not found or not publicly visible.",
            },
          },
          "x-representative-intents": specialistCapability.representative_intents,
        },
      },
    },
    components: {
      schemas: {
        SpecialistSummary: specialistSummarySchema,
      },
    },
    "x-freuly-capability-core-version": FREULY_CAPABILITY_CORE.schema_version,
    "x-freuly-agent-api-version": "v1",
    "x-agent-safety": {
      readOnly: true,
      writeCapabilitiesAdvertised: false,
    },
  };
}
