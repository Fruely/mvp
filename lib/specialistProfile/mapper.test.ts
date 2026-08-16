import assert from "node:assert/strict";
import test from "node:test";

import {
  findForbiddenProfilePatchKeys,
  pickEditableProfilePatch,
} from "./patchWhitelist.ts";
import { SPECIALIST_PROFILE_EDITABLE_FIELDS } from "./types.ts";

test("pickEditableProfilePatch whitelists basic profile fields only", () => {
  const patch = pickEditableProfilePatch({
    name: "Anna",
    about: "About me",
    languages: ["ru"],
    work_format: "hybrid",
    country_code: "DE",
    postal_code: "10115",
    city: "Berlin",
    lat: 52.52,
    lng: 13.405,
    service_radius_km: 30,
    category_id: "11111111-1111-1111-1111-111111111111",
    status: "published_unverified",
    user_id: "hack",
    specialist_id: "hack",
    is_visible: true,
  });

  assert.equal(patch.name, "Anna");
  assert.equal(patch.about, "About me");
  assert.deepEqual(patch.languages, ["ru"]);
  assert.equal((patch as Record<string, unknown>).status, undefined);
  assert.equal((patch as Record<string, unknown>).user_id, undefined);
});

test("findForbiddenProfilePatchKeys rejects authority fields", () => {
  const forbidden = findForbiddenProfilePatchKeys({
    name: "Anna",
    status: "draft",
    specialist_id: "x",
  });

  assert.deepEqual(forbidden.sort(), ["specialist_id", "status"].sort());
});

test("editable field list matches Native basic profile slice", () => {
  assert.deepEqual([...SPECIALIST_PROFILE_EDITABLE_FIELDS].sort(), [
    "about",
    "category_id",
    "city",
    "country_code",
    "lang",
    "languages",
    "lat",
    "lng",
    "name",
    "postal_code",
    "service_radius_km",
    "work_format",
  ].sort());
});
