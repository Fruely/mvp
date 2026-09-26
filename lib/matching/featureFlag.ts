/**
 * Server-only switch for automatic matching after a service request is created.
 * Default off. This is not a client flag and it is not the intent-extraction flag.
 */
export const SERVICE_REQUEST_MATCHING_FLAG = "SERVICE_REQUEST_MATCHING_ENABLED";

export function isServiceRequestMatchingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_REQUEST_MATCHING_FLAG]?.trim().toLowerCase() === "true";
}
