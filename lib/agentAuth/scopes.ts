import { FREULY_CAPABILITY_CORE } from "@/lib/agentCore/freuly";

export function listCapabilityCoreScopes(
  core: { capabilities: Array<{ required_scopes?: readonly string[] }> } = FREULY_CAPABILITY_CORE,
): string[] {
  const scopes = new Set<string>();
  for (const capability of core.capabilities) {
    for (const scope of capability.required_scopes ?? []) {
      const normalized = scope.trim();
      if (normalized) scopes.add(normalized);
    }
  }
  return Array.from(scopes).sort();
}

export function isKnownAgentScope(scope: string): boolean {
  return listCapabilityCoreScopes().includes(scope.trim());
}

export function clientScopesAreKnown(scopes: readonly string[]): boolean {
  const known = new Set(listCapabilityCoreScopes());
  return scopes.every((scope) => known.has(scope));
}
