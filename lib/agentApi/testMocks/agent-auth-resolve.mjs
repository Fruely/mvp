import { agentHarness } from "../testHarness.mjs";

export async function resolveAgentCredential() {
  return agentHarness.auth;
}

export async function markAgentCredentialUsed(credentialId) {
  agentHarness.markUsedCalls.push(credentialId);
}
