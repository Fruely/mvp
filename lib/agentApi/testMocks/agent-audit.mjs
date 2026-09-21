import { agentHarness } from "../testHarness.mjs";

export async function recordAgentApiAuditEvent(event) {
  if (agentHarness.auditShouldFail) {
    throw new Error("audit unavailable");
  }
  agentHarness.auditEvents.push(event);
}
