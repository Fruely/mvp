import type { CapabilityCore } from "./types";

export function validateCapabilityCore(core: CapabilityCore): string[] {
  const errors: string[] = [];

  if (!/^\d+\.\d+\.\d+$/.test(core.schema_version)) {
    errors.push("schema_version must use semantic version format");
  }

  if (!core.service.id || !core.service.name || !core.service.canonical_url) {
    errors.push("service identity is incomplete");
  }

  const entitySet = new Set(core.entities);
  if (entitySet.size !== core.entities.length) {
    errors.push("entities must be unique");
  }

  const capabilityIds = new Set<string>();

  for (const capability of core.capabilities) {
    if (capabilityIds.has(capability.id)) {
      errors.push(`duplicate capability id: ${capability.id}`);
    }
    capabilityIds.add(capability.id);

    if (!capability.representative_intents.length) {
      errors.push(`${capability.id}: representative_intents must not be empty`);
    }

    if (!core.policies.auth_profiles[capability.auth_profile]) {
      errors.push(`${capability.id}: unknown auth_profile ${capability.auth_profile}`);
    }

    if (capability.output_entity && !entitySet.has(capability.output_entity)) {
      errors.push(`${capability.id}: unknown output_entity ${capability.output_entity}`);
    }

    if (capability.mode === "write" && !capability.side_effects) {
      errors.push(`${capability.id}: write capabilities must declare side_effects`);
    }

    if (capability.side_effects && capability.auth_profile === "public_read") {
      errors.push(`${capability.id}: side-effecting capabilities cannot be public_read`);
    }

    if (capability.mode === "write" && capability.idempotency?.required !== true) {
      errors.push(`${capability.id}: write capabilities must require idempotency`);
    }

    if (capability.consent?.required && !capability.consent.type) {
      errors.push(`${capability.id}: required consent must declare a consent type`);
    }
  }

  return errors;
}
