import {
  SPECIALIST_PROFILE_EDITABLE_FIELDS,
  type SpecialistProfilePatchBody,
} from "./types.ts";

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function pickEditableProfilePatch(body: Record<string, unknown>): SpecialistProfilePatchBody {
  const patch: SpecialistProfilePatchBody = {};
  for (const key of SPECIALIST_PROFILE_EDITABLE_FIELDS) {
    if (hasOwn(body, key)) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }
  return patch;
}

export function findForbiddenProfilePatchKeys(body: Record<string, unknown>): string[] {
  const allowed = new Set<string>([...SPECIALIST_PROFILE_EDITABLE_FIELDS]);
  return Object.keys(body).filter((key) => !allowed.has(key));
}
