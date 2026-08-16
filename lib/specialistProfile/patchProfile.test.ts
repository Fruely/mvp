import assert from "node:assert/strict";
import test from "node:test";

import {
  LocationPatchValidationError,
  resolveProfileLocationPatch,
} from "./locationResolution.ts";
import {
  assertSpecialistsPatchHasNoAboutMe,
  patchSpecialistEditableProfile,
  ProfilePatchValidationError,
} from "./patchProfile.ts";
import type { SpecialistEditableProfileDto } from "./types.ts";

const SPECIALIST_ID = "11111111-1111-1111-1111-111111111111";

const mockResolvedBerlin = {
  ok: true as const,
  location: {
    postalCode: "10115",
    countryCode: "DE",
    city: "Berlin",
    lat: 52.52,
    lng: 13.405,
  },
  source: "postal_codes" as const,
  candidates: [
    { city: "Berlin", lat: 52.52, lng: 13.405 },
    { city: "Berlin Mitte", lat: 52.53, lng: 13.41 },
  ],
};

const mockResolvedHamburg = {
  ok: true as const,
  location: {
    postalCode: "20095",
    countryCode: "DE",
    city: "Hamburg",
    lat: 53.55,
    lng: 9.99,
  },
  source: "postal_codes" as const,
  candidates: [{ city: "Hamburg", lat: 53.55, lng: 9.99 }],
};

async function fakeResolve(_service: unknown, plz: string) {
  if (plz === "10115") return mockResolvedBerlin;
  if (plz === "20095") return mockResolvedHamburg;
  return { ok: false as const, reason: "not_found" as const };
}

type MockState = {
  specialist: Record<string, unknown>;
  profile: Record<string, unknown> | null;
  specialistUpdates: Record<string, unknown>[];
  profileUpdates: Record<string, unknown>[];
  profileInserts: Record<string, unknown>[];
  translationUpserts: Record<string, unknown>[];
};

function createMockService(state: MockState) {
  const self = () => chain;
  const chain: Record<string, unknown> = {};

  chain.select = self;
  chain.eq = self;
  chain.is = self;
  chain.order = self;
  chain.limit = self;
  chain.or = self;
  chain.update = (data: Record<string, unknown>) => {
    if (currentTable === "specialists") {
      state.specialistUpdates.push(data);
      Object.assign(state.specialist, data);
    } else if (currentTable === "specialist_profiles") {
      state.profileUpdates.push(data);
      if (state.profile) Object.assign(state.profile, data);
    }
    return chain;
  };
  chain.insert = (data: Record<string, unknown>) => {
    if (currentTable === "specialist_profiles") {
      state.profileInserts.push(data);
      state.profile = data;
    }
    return chain;
  };
  chain.upsert = (data: Record<string, unknown>) => {
    if (currentTable === "specialist_profile_translations") {
      state.translationUpserts.push(data);
    } else if (currentTable === "specialist_profiles") {
      state.profileUpdates.push(data);
      if (state.profile) Object.assign(state.profile, data);
      else state.profile = data;
    }
    return chain;
  };
  chain.maybeSingle = async () => {
    if (currentTable === "specialists") {
      return { data: state.specialist, error: null };
    }
    if (currentTable === "specialist_profiles") {
      return { data: state.profile, error: null };
    }
    if (currentTable === "categories") {
      return {
        data: {
          id: "cat-1",
          parent_id: "parent-1",
          slug: "math",
        },
        error: null,
      };
    }
    return { data: null, error: null };
  };
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(onFulfilled);

  let currentTable = "specialists";
  const service = {
    from(table: string) {
      currentTable = table;
      return chain;
    },
  };

  return service;
}

function stubLoadedProfile(about: string | null): SpecialistEditableProfileDto {
  return {
    id: SPECIALIST_ID,
    name: "Anna",
    category_id: null,
    category_slug: null,
    category_label: null,
    languages: ["de"],
    work_format: "online",
    country_code: "DE",
    postal_code: "10115",
    city: "Berlin",
    lat: 52.52,
    lng: 13.405,
    service_radius_km: null,
    about,
    onboarding_gate: "incomplete",
    publication_ready: false,
    public_profile_available: false,
  };
}

test("about-only patch does not write about_me to specialists table", async () => {
  const state: MockState = {
    specialist: {
      id: SPECIALIST_ID,
      category_id: null,
      postal_code: "10115",
      lat: 52.52,
      lng: 13.405,
      country_code: "DE",
      work_format: "online",
      service_radius_km: null,
      status: "draft",
      is_active: false,
      is_visible: false,
    },
    profile: { specialist_id: SPECIALIST_ID, about_me: "Old", city: "Berlin" },
    specialistUpdates: [],
    profileUpdates: [],
    profileInserts: [],
    translationUpserts: [],
  };

  const service = createMockService(state);
  await patchSpecialistEditableProfile(
    service as never,
    SPECIALIST_ID,
    { about: "Updated about", lang: "ru" },
    "ru",
    {
      resolvePostal: fakeResolve,
      loadProfile: async () => ({
        specialist: stubLoadedProfile("Updated about"),
        category_options: [],
        allowed_service_radii_km: [10, 30, 50, 100],
        allowed_language_codes: ["ru", "uk", "de"],
      }),
    },
  );

  assert.equal(state.specialistUpdates.length, 1);
  assertSpecialistsPatchHasNoAboutMe(state.specialistUpdates[0]!);
  assert.equal(state.profileUpdates.length, 1);
  assert.equal(state.profileUpdates[0]?.about_me, "Updated about");
  assert.equal(state.translationUpserts.length, 1);
  assert.equal(state.translationUpserts[0]?.about_me, "Updated about");
});

test("GET after about-only patch returns updated about from loadProfile", async () => {
  const state: MockState = {
    specialist: {
      id: SPECIALIST_ID,
      category_id: null,
      postal_code: "10115",
      lat: 52.52,
      lng: 13.405,
      country_code: "DE",
      work_format: "online",
      service_radius_km: null,
      status: "draft",
      is_active: false,
      is_visible: false,
    },
    profile: { specialist_id: SPECIALIST_ID, about_me: "Old", city: "Berlin" },
    specialistUpdates: [],
    profileUpdates: [],
    profileInserts: [],
    translationUpserts: [],
  };

  const service = createMockService(state);
  const result = await patchSpecialistEditableProfile(
    service as never,
    SPECIALIST_ID,
    { about: "Reloaded about", lang: "ru" },
    "ru",
    {
      resolvePostal: fakeResolve,
      loadProfile: async () => ({
        specialist: stubLoadedProfile("Reloaded about"),
        category_options: [],
        allowed_service_radii_km: [10, 30, 50, 100],
        allowed_language_codes: ["ru", "uk", "de"],
      }),
    },
  );

  assert.equal(result.specialist.about, "Reloaded about");
});

test("PLZ change resolves city and coordinates together", async () => {
  const result = await resolveProfileLocationPatch(
    {} as never,
    {
      body: { postal_code: "20095" },
      currentPostalCode: "10115",
      currentLat: 52.52,
      currentLng: 13.405,
      pendingPostalCode: "20095",
    },
    fakeResolve,
  );

  assert.equal(result.specialistGeoPatch.postal_code, "20095");
  assert.equal(result.derivedCity, "Hamburg");
  assert.equal(result.specialistGeoPatch.lat, 53.55);
  assert.equal(result.specialistGeoPatch.lng, 9.99);
});

test("unchanged PLZ with arbitrary city is rejected", async () => {
  await assert.rejects(
    () =>
      resolveProfileLocationPatch(
        {} as never,
        {
          body: { city: "Not A Real City" },
          currentPostalCode: "10115",
          currentLat: 52.52,
          currentLng: 13.405,
        },
        fakeResolve,
      ),
    (error: unknown) => {
      assert.ok(error instanceof LocationPatchValidationError);
      assert.equal(error.code, "invalid_city_candidate");
      return true;
    },
  );
});

test("city candidate must belong to same PLZ", async () => {
  const result = await resolveProfileLocationPatch(
    {} as never,
    {
      body: { city: "Berlin Mitte" },
      currentPostalCode: "10115",
      currentLat: 52.52,
      currentLng: 13.405,
    },
    fakeResolve,
  );

  assert.equal(result.derivedCity, "Berlin Mitte");
  assert.equal(result.specialistGeoPatch.lat, 52.53);
});

test("clearing PLZ clears city and coordinates", async () => {
  const result = await resolveProfileLocationPatch(
    {} as never,
    {
      body: { postal_code: "" },
      currentPostalCode: "10115",
      currentLat: 52.52,
      currentLng: 13.405,
      pendingPostalCode: "",
    },
    fakeResolve,
  );

  assert.equal(result.specialistGeoPatch.postal_code, null);
  assert.equal(result.specialistGeoPatch.lat, null);
  assert.equal(result.specialistGeoPatch.lng, null);
  assert.equal(result.derivedCity, null);
});

test("patch integration clears profile city when PLZ cleared", async () => {
  const state: MockState = {
    specialist: {
      id: SPECIALIST_ID,
      category_id: null,
      postal_code: "10115",
      lat: 52.52,
      lng: 13.405,
      country_code: "DE",
      work_format: "online",
      service_radius_km: null,
      status: "draft",
      is_active: false,
      is_visible: false,
    },
    profile: { specialist_id: SPECIALIST_ID, about_me: null, city: "Berlin" },
    specialistUpdates: [],
    profileUpdates: [],
    profileInserts: [],
    translationUpserts: [],
  };

  const service = createMockService(state);
  await patchSpecialistEditableProfile(
    service as never,
    SPECIALIST_ID,
    { postal_code: "" },
    "de",
    {
      resolvePostal: fakeResolve,
      loadProfile: async () => ({
        specialist: stubLoadedProfile(null),
        category_options: [],
        allowed_service_radii_km: [10, 30, 50, 100],
        allowed_language_codes: ["de"],
      }),
    },
  );

  assert.equal(state.specialistUpdates[0]?.lat, null);
  assert.equal(state.profileUpdates[0]?.city, null);
});

test("client lat/lng keys are rejected as forbidden fields", async () => {
  const { findForbiddenProfilePatchKeys } = await import("./patchWhitelist.ts");
  const forbidden = findForbiddenProfilePatchKeys({
    name: "Anna",
    lat: 52.5,
    lng: 13.4,
  });
  assert.deepEqual(forbidden.sort(), ["lat", "lng"].sort());
});

test("forbidden keys are rejected at route contract level", async () => {
  const { findForbiddenProfilePatchKeys } = await import("./patchWhitelist.ts");
  const forbidden = findForbiddenProfilePatchKeys({
    name: "Anna",
    status: "published_unverified",
    specialist_id: "hack",
    user_id: "hack",
  });
  assert.deepEqual(forbidden.sort(), ["specialist_id", "status", "user_id"].sort());
});

test("published geo patch validates canonical tuple via service", async () => {
  const state: MockState = {
    specialist: {
      id: SPECIALIST_ID,
      category_id: null,
      postal_code: "10115",
      lat: 52.52,
      lng: 13.405,
      country_code: "DE",
      work_format: "offline",
      service_radius_km: 30,
      status: "published_unverified",
      is_active: true,
      is_visible: true,
    },
    profile: { specialist_id: SPECIALIST_ID, about_me: null, city: "Berlin" },
    specialistUpdates: [],
    profileUpdates: [],
    profileInserts: [],
    translationUpserts: [],
  };

  const service = createMockService(state);
  await assert.rejects(
    () =>
      patchSpecialistEditableProfile(
        service as never,
        SPECIALIST_ID,
        { postal_code: "" },
        "de",
        {
          resolvePostal: fakeResolve,
          loadProfile: async () => ({
            specialist: stubLoadedProfile(null),
            category_options: [],
            allowed_service_radii_km: [10, 30, 50, 100],
            allowed_language_codes: ["de"],
          }),
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof ProfilePatchValidationError);
      return true;
    },
  );
});
