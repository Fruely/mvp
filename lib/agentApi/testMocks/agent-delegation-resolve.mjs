import { agentHarness } from "../testHarness.mjs";

export const AGENT_DELEGATION_HEADER = "x-freuly-delegation-id";

export function readAgentDelegationId() {
  return null;
}

export async function resolveAgentDelegation() {
  return agentHarness.delegation;
}
