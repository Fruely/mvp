import assert from "node:assert/strict";
import test from "node:test";
import { FREULY_CAPABILITY_CORE } from "../agentCore/freuly.ts";
import { listCapabilityCoreScopes } from "../agentAuth/scopes.ts";
import { USER_DELEGATABLE_CAPABILITIES } from "./types.ts";

test("user-delegatable capabilities match Capability Core consent and scopes", () => {
  const coreIds = FREULY_CAPABILITY_CORE.capabilities.map((capability) => capability.id);
  const knownScopes = new Set(listCapabilityCoreScopes());

  for (const id of USER_DELEGATABLE_CAPABILITIES) {
    const capability = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
    assert.ok(capability, `missing Capability Core entry for ${id}`);
    assert.equal(coreIds.includes(id), true);
    assert.equal(capability.auth_profile, "verified_agent");
    assert.equal(capability.consent?.required, true, `${id} must require consent`);
    assert.equal(
      capability.consent?.type,
      "explicit_user_authorization",
      `${id} must require explicit user authorization`,
    );
    assert.ok(
      capability.required_scopes && capability.required_scopes.length > 0,
      `${id} must declare required scopes`,
    );
    for (const scope of capability.required_scopes) {
      assert.equal(knownScopes.has(scope), true, `${id}:${scope}`);
    }
    assert.ok(
      capability.audience.includes("consumer_agent") ||
        capability.audience.includes("business_agent"),
      `${id} must be user-delegatable to consumer or business agents`,
    );
  }
});

test("private user reads are not a runtime-only delegation exception", () => {
  for (const id of ["get_service_request", "get_match"] as const) {
    assert.equal(USER_DELEGATABLE_CAPABILITIES.includes(id), true);
    const capability = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
    assert.ok(capability);
    assert.equal(capability.mode, "read");
    assert.equal(capability.consent?.required, true);
    assert.equal(capability.consent?.type, "explicit_user_authorization");
  }
});

test("provider-only capabilities stay outside the user delegation allowlist", () => {
  for (const id of ["discover_matching_leads", "get_lead_summary", "express_interest", "decline_lead"]) {
    assert.equal(USER_DELEGATABLE_CAPABILITIES.includes(id as never), false);
    const capability = FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id);
    assert.ok(capability);
    assert.deepEqual(capability.audience, ["provider_agent"]);
  }
});
