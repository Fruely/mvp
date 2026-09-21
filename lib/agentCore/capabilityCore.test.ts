import assert from "node:assert/strict";
import test from "node:test";
import {
  CAPABILITY_CORE_JSON_SCHEMA,
  FREULY_CAPABILITY_CORE,
  validateCapabilityCore,
} from "./index.ts";

test("Freuly Capability Core satisfies internal invariants", () => {
  assert.deepEqual(validateCapabilityCore(FREULY_CAPABILITY_CORE), []);
});

test("capability identifiers are unique and representative intents are present", () => {
  const ids = FREULY_CAPABILITY_CORE.capabilities.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const capability of FREULY_CAPABILITY_CORE.capabilities) {
    assert.ok(capability.representative_intents.length > 0);
    assert.ok(capability.representative_intents.every((intent) => intent.trim().length > 0));
  }
});

test("write capabilities are authenticated, idempotent and explicit about authorization", () => {
  const writes = FREULY_CAPABILITY_CORE.capabilities.filter(
    (capability) => capability.mode === "write",
  );

  assert.ok(writes.length > 0);

  for (const capability of writes) {
    assert.equal(capability.side_effects, true);
    assert.notEqual(capability.auth_profile, "public_read");
    assert.equal(capability.idempotency?.required, true);
    assert.equal(capability.consent?.required, true);
    assert.ok(capability.consent?.type);
  }
});

test("Capability Core remains transport and vendor neutral", () => {
  const serialized = JSON.stringify(FREULY_CAPABILITY_CORE).toLowerCase();

  assert.equal(serialized.includes("/api/"), false);
  assert.equal(serialized.includes("api.openai.com"), false);
  assert.equal(serialized.includes("generativelanguage.googleapis.com"), false);
  assert.equal(serialized.includes("anthropic.com"), false);
});

test("JSON Schema exposes the canonical v1 contract", () => {
  assert.equal(CAPABILITY_CORE_JSON_SCHEMA.type, "object");
  assert.equal(CAPABILITY_CORE_JSON_SCHEMA.properties.schema_version.type, "string");
  assert.equal(CAPABILITY_CORE_JSON_SCHEMA.properties.capabilities.type, "array");
});

test("create_service_request input is explicit and persistable", () => {
  const capability = FREULY_CAPABILITY_CORE.capabilities.find(
    (item) => item.id === "create_service_request",
  );
  assert.ok(capability);
  const schema = capability.input_schema as {
    required?: string[];
    properties?: Record<string, unknown>;
  };
  const properties = schema.properties ?? {};

  assert.equal("location" in properties, false);
  assert.equal("budget_max" in properties, false);
  assert.deepEqual(schema.required, [
    "category",
    "language",
    "work_format",
    "request_text",
    "user_contact",
  ]);
  assert.deepEqual(
    (properties.language as { enum?: string[] }).enum,
    ["de", "ru", "uk"],
  );
  assert.deepEqual(
    (properties.work_format as { enum?: string[] }).enum,
    ["online", "offline", "hybrid"],
  );
  assert.ok("city" in properties);
  assert.ok("postal_code" in properties);
  const contact = properties.user_contact as {
    additionalProperties?: boolean;
    required?: string[];
    properties?: Record<string, unknown>;
  };
  assert.equal(contact.additionalProperties, false);
  assert.deepEqual(contact.required, ["name"]);
  assert.ok(contact.properties?.name);
  assert.ok(contact.properties?.email);
  assert.ok(contact.properties?.phone);
});
