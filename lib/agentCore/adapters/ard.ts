import { FREULY_CAPABILITY_CORE } from "../freuly";

const DOMAIN = FREULY_CAPABILITY_CORE.service.canonical_url;
const ARD_CONTEXT = "https://agenticresourcediscovery.org/context/v1";

function getCapability(id: string) {
  const found = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
  if (!found) throw new Error(`Missing capability: ${id}`);
  return found;
}

function representativeQueries(): string[] {
  const ids = ["search_specialists", "get_specialist"];
  const unique = new Set<string>();

  for (const id of ids) {
    for (const intent of getCapability(id).representative_intents) {
      unique.add(intent);
      if (unique.size === 5) return Array.from(unique);
    }
  }

  return Array.from(unique);
}

export function buildFreulyArdManifest() {
  const queries = representativeQueries();

  return {
    // Kept for compatibility with the predecessor ai-catalog manifest shape.
    specVersion: "1.0",
    entries: [
      {
        "@context": ARD_CONTEXT,
        identifier: "urn:air:freuly.de:api:specialist-search",
        displayName: "Freuly Specialist Search API",
        type: "application/openapi+json",
        url: `${DOMAIN}/.well-known/openapi.json`,
        description:
          "Search public service professionals available through Freuly in Germany by language, category, location and online availability.",
        tags: [
          "Germany",
          "services",
          "specialists",
          "marketplace",
          "multilingual",
        ],
        capabilities: ["search_specialists", "get_specialist"],
        representativeQueries: queries,
        version: FREULY_CAPABILITY_CORE.schema_version,
        metadata: {
          market: "DE",
          readOnly: true,
          languages: FREULY_CAPABILITY_CORE.service.languages.join(","),
        },
        trustManifest: {
          identity: DOMAIN,
          identityType: "https",
        },
      },
      {
        "@context": ARD_CONTEXT,
        identifier: "urn:air:freuly.de:mcp:read",
        displayName: "Freuly MCP Read Server",
        type: "application/json",
        url: `${DOMAIN}/api/mcp`,
        description:
          "Stateless MCP 2026-07-28 endpoint exposing read-only Freuly specialist discovery tools.",
        tags: [
          "MCP",
          "Germany",
          "services",
          "specialists",
          "marketplace",
          "multilingual",
        ],
        capabilities: ["search_specialists", "get_specialist"],
        representativeQueries: queries,
        version: FREULY_CAPABILITY_CORE.schema_version,
        metadata: {
          market: "DE",
          readOnly: true,
          transport: "streamable-http",
          protocolVersion: "2026-07-28",
          languages: FREULY_CAPABILITY_CORE.service.languages.join(","),
        },
        trustManifest: {
          identity: DOMAIN,
          identityType: "https",
        },
      },
    ],
  };
}
