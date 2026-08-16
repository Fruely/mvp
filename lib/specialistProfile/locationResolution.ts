import type { SupabaseClient } from "@supabase/supabase-js";

import { GERMANY_COUNTRY_CODE, normalizePostalCode } from "@/lib/specialists/geography";
import {
  resolveGermanPostalLocation,
  type ResolvePostalLocationResult,
} from "@/lib/specialists/resolvePostalLocation";
import type { SpecialistProfilePatchBody } from "@/lib/specialistProfile/types";

export type PostalResolver = (
  service: SupabaseClient,
  postalCode: string,
) => Promise<ResolvePostalLocationResult>;

export type LocationPatchResult = {
  /** Fields merged into specialists update (postal_code, country_code, lat, lng). */
  specialistGeoPatch: Record<string, unknown>;
  /** City written to specialist_profiles when defined. */
  derivedCity: string | null | undefined;
  geocodeWarning: string | null;
};

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pickCandidate(
  resolved: Extract<ResolvePostalLocationResult, { ok: true }>,
  requestedCity: string,
) {
  if (requestedCity.length > 0) {
    const matched = resolved.candidates.find(
      (candidate) => candidate.city.toLowerCase() === requestedCity.toLowerCase(),
    );
    if (!matched) {
      return null;
    }
    return {
      postalCode: resolved.location.postalCode,
      countryCode: resolved.location.countryCode,
      city: matched.city,
      lat: matched.lat,
      lng: matched.lng,
    };
  }

  return resolved.location;
}

/**
 * Resolves canonical location tuple updates from a partial profile PATCH.
 * Client lat/lng are never trusted; city selects a PLZ candidate when provided.
 */
export async function resolveProfileLocationPatch(
  service: SupabaseClient,
  input: {
    body: SpecialistProfilePatchBody;
    currentPostalCode: string | null;
    currentLat: number | null;
    currentLng: number | null;
    pendingPostalCode?: unknown;
  },
  resolvePostal: PostalResolver = resolveGermanPostalLocation,
): Promise<LocationPatchResult> {
  const specialistGeoPatch: Record<string, unknown> = {};
  let derivedCity: string | null | undefined = undefined;
  let geocodeWarning: string | null = null;

  const oldPlz = input.currentPostalCode;
  const newPlzRaw =
    input.pendingPostalCode !== undefined
      ? typeof input.pendingPostalCode === "string"
        ? input.pendingPostalCode.trim()
        : input.pendingPostalCode === null
          ? ""
          : undefined
      : undefined;

  const newPlzNormalized =
    newPlzRaw === undefined ? undefined : newPlzRaw ? normalizePostalCode(newPlzRaw) : null;

  if (newPlzRaw !== undefined && newPlzRaw && !newPlzNormalized) {
    throw new LocationPatchValidationError("invalid_postal_code", ["postal_code"]);
  }

  const plzChanged = newPlzNormalized !== undefined && newPlzNormalized !== oldPlz;
  const effectivePlz = newPlzNormalized !== undefined ? newPlzNormalized : oldPlz;
  const coordsMissing =
    effectivePlz !== null && (input.currentLat == null || input.currentLng == null);
  const needsResolve =
    plzChanged || (coordsMissing && effectivePlz !== null && hasOwn(input.body, "postal_code"));

  const requestedCity =
    hasOwn(input.body, "city") && typeof input.body.city === "string"
      ? input.body.city.trim()
      : "";

  const cityOnlyChange =
    hasOwn(input.body, "city") &&
    !plzChanged &&
    newPlzRaw === undefined &&
    requestedCity.length > 0;

  if (newPlzNormalized === null && newPlzRaw !== undefined) {
    specialistGeoPatch.postal_code = null;
    specialistGeoPatch.country_code = null;
    specialistGeoPatch.lat = null;
    specialistGeoPatch.lng = null;
    derivedCity = null;
    return { specialistGeoPatch, derivedCity, geocodeWarning };
  }

  if (needsResolve && effectivePlz) {
    const resolved = await resolvePostal(service, effectivePlz);
    if (resolved.ok) {
      const chosen = pickCandidate(resolved, requestedCity);
      if (!chosen) {
        throw new LocationPatchValidationError("invalid_city_candidate", ["city"]);
      }
      specialistGeoPatch.postal_code = chosen.postalCode;
      specialistGeoPatch.country_code = chosen.countryCode;
      specialistGeoPatch.lat = chosen.lat;
      specialistGeoPatch.lng = chosen.lng;
      derivedCity = chosen.city;
    } else {
      specialistGeoPatch.lat = null;
      specialistGeoPatch.lng = null;
      if (plzChanged) {
        specialistGeoPatch.postal_code = effectivePlz;
        specialistGeoPatch.country_code = GERMANY_COUNTRY_CODE;
      }
      derivedCity = null;
      geocodeWarning = "geocode_failed";
    }
    return { specialistGeoPatch, derivedCity, geocodeWarning };
  }

  if (cityOnlyChange && effectivePlz) {
    const resolved = await resolvePostal(service, effectivePlz);
    if (!resolved.ok) {
      throw new LocationPatchValidationError("invalid_city_candidate", ["city"]);
    }
    const chosen = pickCandidate(resolved, requestedCity);
    if (!chosen) {
      throw new LocationPatchValidationError("invalid_city_candidate", ["city"]);
    }
    specialistGeoPatch.lat = chosen.lat;
    specialistGeoPatch.lng = chosen.lng;
    derivedCity = chosen.city;
  }

  return { specialistGeoPatch, derivedCity, geocodeWarning };
}

export class LocationPatchValidationError extends Error {
  readonly code: string;
  readonly fields: string[];

  constructor(code: string, fields: string[]) {
    super(code);
    this.name = "LocationPatchValidationError";
    this.code = code;
    this.fields = fields;
  }
}
