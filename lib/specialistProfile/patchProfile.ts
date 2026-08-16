import type { SupabaseClient } from "@supabase/supabase-js";

import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { normalizeRouteLangToDbContentCode } from "@/lib/specialists/normalizeContentLanguageCode";
import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
  isAllowedServiceRadiusKm,
  normalizeCountryCode,
  normalizePostalCode,
  parseServiceRadiusKm,
  saveTouchesGeography,
  validatePublicationGeography,
} from "@/lib/specialists/geography";
import { resolveGermanPostalLocation } from "@/lib/specialists/resolvePostalLocation";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import { loadSpecialistEditableProfile } from "@/lib/specialistProfile/loadProfile";
import {
  findForbiddenProfilePatchKeys,
} from "@/lib/specialistProfile/patchWhitelist";
import {
  SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES,
  type SpecialistProfilePatchBody,
  type SpecialistProfilePatchResult,
} from "@/lib/specialistProfile/types";

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export async function patchSpecialistEditableProfile(
  service: SupabaseClient,
  specialistId: string,
  body: SpecialistProfilePatchBody,
  lang: AccountCapabilitiesLang,
): Promise<SpecialistProfilePatchResult> {
  const forbidden = findForbiddenProfilePatchKeys(body as Record<string, unknown>);
  if (forbidden.length > 0) {
    throw new ProfilePatchValidationError("forbidden_fields", forbidden);
  }

  const languageCode = normalizeRouteLangToDbContentCode(
    typeof body.lang === "string" ? body.lang : lang,
  );

  const allowedLanguages = new Set(SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES);
  if (hasOwn(body, "languages")) {
    if (!Array.isArray(body.languages)) {
      throw new ProfilePatchValidationError("invalid_languages", ["languages"]);
    }
    const hasInvalidLanguage = body.languages.some(
      (language) =>
        typeof language !== "string" ||
        !allowedLanguages.has(language as (typeof SPECIALIST_PROFILE_ALLOWED_LANGUAGE_CODES)[number]),
    );
    if (hasInvalidLanguage) {
      throw new ProfilePatchValidationError("invalid_languages", ["languages"]);
    }
  }

  if (
    typeof body.work_format !== "undefined" &&
    body.work_format !== "online" &&
    body.work_format !== "offline" &&
    body.work_format !== "hybrid"
  ) {
    throw new ProfilePatchValidationError("invalid_work_format", ["work_format"]);
  }

  if (
    typeof body.postal_code !== "undefined" &&
    body.postal_code !== "" &&
    body.postal_code !== null &&
    (typeof body.postal_code !== "string" || !/^\d{5}$/.test(body.postal_code))
  ) {
    throw new ProfilePatchValidationError("invalid_postal_code", ["postal_code"]);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    typeof body.category_id !== "undefined" &&
    body.category_id !== null &&
    (typeof body.category_id !== "string" || !uuidRegex.test(body.category_id))
  ) {
    throw new ProfilePatchValidationError("invalid_category_id", ["category_id"]);
  }

  const { data: specialist, error: specialistError } = await service
    .from("specialists")
    .select(
      "id, category_id, postal_code, lat, lng, country_code, work_format, service_radius_km, status, is_active, is_visible",
    )
    .eq("id", specialistId)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    throw new Error("specialist_not_found");
  }

  const isCurrentlyPublished =
    typeof specialist.status === "string" &&
    VISIBLE_PUBLIC_SPECIALIST_STATUSES.includes(
      specialist.status as (typeof VISIBLE_PUBLIC_SPECIALIST_STATUSES)[number],
    ) &&
    specialist.is_active === true &&
    specialist.is_visible === true;

  const effectiveCategoryId =
    body.category_id !== undefined
      ? typeof body.category_id === "string"
        ? body.category_id.trim() || null
        : null
      : (typeof specialist.category_id === "string" ? specialist.category_id : null) ?? null;

  if (effectiveCategoryId) {
    const { data: category } = await service
      .from("categories")
      .select("id, parent_id, slug")
      .eq("id", effectiveCategoryId)
      .maybeSingle();
    const slug = typeof category?.slug === "string" ? category.slug : null;
    const isUncategorized = slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
    if (!category || (!category.parent_id && !isUncategorized)) {
      throw new ProfilePatchValidationError("invalid_category_parent", ["category_id"]);
    }
  }

  const languages =
    hasOwn(body, "languages") && Array.isArray(body.languages)
      ? body.languages.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : null;

  const saveBody: Record<string, unknown> = {};
  if (typeof body.name === "string") saveBody.name = body.name.trim() || null;
  if (body.category_id === null) saveBody.category_id = null;
  else if (typeof body.category_id === "string") saveBody.category_id = body.category_id.trim() || null;
  if (body.work_format === "online" || body.work_format === "offline" || body.work_format === "hybrid") {
    saveBody.work_format = body.work_format;
  }
  if (typeof body.postal_code === "string") saveBody.postal_code = body.postal_code.trim() || null;

  if (hasOwn(body, "country_code")) {
    const code = normalizeCountryCode(body.country_code);
    if (code && code !== GERMANY_COUNTRY_CODE) {
      throw new ProfilePatchValidationError("publication_country_not_supported", ["country_code"]);
    }
    if (code === GERMANY_COUNTRY_CODE) {
      saveBody.country_code = GERMANY_COUNTRY_CODE;
    }
  }

  if (typeof body.service_radius_km !== "undefined") {
    const raw = body.service_radius_km == null ? "" : String(body.service_radius_km).trim();
    if (raw === "") {
      saveBody.service_radius_km = null;
    } else {
      const n = parseServiceRadiusKm(raw);
      if (n == null || !isAllowedServiceRadiusKm(n)) {
        throw new ProfilePatchValidationError("publication_service_radius_invalid", [
          "service_radius_km",
        ]);
      }
      saveBody.service_radius_km = n;
    }
  }

  if (languages !== null) {
    saveBody.languages = languages;
  }

  if (typeof body.about === "string") {
    saveBody.about_me = body.about.trim() || null;
  }

  saveBody.updated_at = new Date().toISOString();

  let derivedCity: string | null | undefined = undefined;
  let geocodeWarning: string | null = null;

  const oldPlz = typeof specialist.postal_code === "string" ? specialist.postal_code : null;
  const newPlzRaw =
    typeof saveBody.postal_code === "string" ? (saveBody.postal_code as string) : undefined;
  const newPlzNormalized =
    newPlzRaw === undefined ? undefined : newPlzRaw ? normalizePostalCode(newPlzRaw) : null;

  if (newPlzRaw !== undefined && newPlzRaw && !newPlzNormalized) {
    throw new ProfilePatchValidationError("invalid_postal_code", ["postal_code"]);
  }

  const plzChanged = newPlzNormalized !== undefined && newPlzNormalized !== oldPlz;
  const coordsMissing =
    (newPlzNormalized ?? oldPlz) !== null && (specialist.lat == null || specialist.lng == null);
  const needsResolve = plzChanged || (coordsMissing && newPlzNormalized !== null);

  const bodyCity = hasOwn(body, "city") && typeof body.city === "string" ? body.city.trim() : "";
  const bodyLat = typeof body.lat === "number" ? body.lat : null;
  const bodyLng = typeof body.lng === "number" ? body.lng : null;

  if (needsResolve) {
    const plzToResolve = newPlzNormalized ?? oldPlz;
    if (plzToResolve) {
      const resolved = await resolveGermanPostalLocation(service, plzToResolve);
      if (resolved.ok) {
        const matched =
          bodyCity.length > 0
            ? resolved.candidates.find((c) => c.city.toLowerCase() === bodyCity.toLowerCase())
            : undefined;
        const chosen = matched
          ? {
              postalCode: resolved.location.postalCode,
              countryCode: resolved.location.countryCode,
              city: matched.city,
              lat: matched.lat,
              lng: matched.lng,
            }
          : resolved.location;
        saveBody.postal_code = chosen.postalCode;
        saveBody.country_code = chosen.countryCode;
        saveBody.lat = chosen.lat;
        saveBody.lng = chosen.lng;
        derivedCity = chosen.city;
      } else {
        saveBody.lat = null;
        saveBody.lng = null;
        derivedCity = null;
        geocodeWarning = "geocode_failed";
      }
    }
  } else if (newPlzNormalized === null && newPlzRaw !== undefined) {
    saveBody.lat = null;
    saveBody.lng = null;
    derivedCity = null;
  } else if (
    !plzChanged &&
    bodyCity &&
    areValidCoordinates(bodyLat, bodyLng, { countryCode: GERMANY_COUNTRY_CODE })
  ) {
    saveBody.lat = bodyLat;
    saveBody.lng = bodyLng;
    derivedCity = bodyCity;
  }

  if (derivedCity === undefined && hasOwn(body, "city") && typeof body.city === "string") {
    if (!plzChanged) {
      derivedCity = body.city.trim() || null;
    }
  }

  const cleanedPatch = Object.fromEntries(
    Object.entries(saveBody).filter(([_, v]) => v !== undefined),
  );

  const geoSaveBody = { ...body, about_me: body.about };
  if (isCurrentlyPublished && saveTouchesGeography(geoSaveBody)) {
    const { data: currentProfile } = await service
      .from("specialist_profiles")
      .select("city")
      .eq("specialist_id", specialistId)
      .maybeSingle();

    const mergedWorkFormat =
      typeof cleanedPatch.work_format === "string"
        ? cleanedPatch.work_format
        : specialist.work_format;
    const mergedCountry =
      typeof cleanedPatch.country_code === "string"
        ? cleanedPatch.country_code
        : specialist.country_code;
    const mergedPostal =
      typeof cleanedPatch.postal_code === "string" || cleanedPatch.postal_code === null
        ? (cleanedPatch.postal_code as string | null)
        : specialist.postal_code;
    const mergedLat =
      typeof cleanedPatch.lat === "number" || cleanedPatch.lat === null
        ? (cleanedPatch.lat as number | null)
        : specialist.lat;
    const mergedLng =
      typeof cleanedPatch.lng === "number" || cleanedPatch.lng === null
        ? (cleanedPatch.lng as number | null)
        : specialist.lng;
    const mergedRadius =
      typeof cleanedPatch.service_radius_km === "number" ||
      cleanedPatch.service_radius_km === null
        ? (cleanedPatch.service_radius_km as number | null)
        : specialist.service_radius_km;
    const mergedCity =
      derivedCity !== undefined
        ? derivedCity
        : typeof currentProfile?.city === "string"
          ? currentProfile.city
          : null;

    const geoCheck = validatePublicationGeography({
      workFormat: mergedWorkFormat,
      countryCode: mergedCountry,
      postalCode: mergedPostal,
      city: mergedCity,
      lat: mergedLat,
      lng: mergedLng,
      serviceRadiusKm: mergedRadius,
    });
    if (!geoCheck.ok) {
      throw new ProfilePatchValidationError(geoCheck.code, [
        geoCheck.code.includes("postal") ? "postal_code" : "work_format",
      ]);
    }
  }

  if (Object.keys(cleanedPatch).length > 0) {
    const { error: specialistPatchError } = await service
      .from("specialists")
      .update(cleanedPatch)
      .eq("id", specialistId);
    if (specialistPatchError) {
      throw new Error("profile_update_failed");
    }
  }

  if (derivedCity !== undefined) {
    const { error: citySyncError } = await service.from("specialist_profiles").upsert(
      {
        specialist_id: specialistId,
        city: derivedCity,
      },
      { onConflict: "specialist_id" },
    );
    if (citySyncError) {
      throw new Error("profile_city_update_failed");
    }
  }

  const profilePatch: Record<string, unknown> = {};
  if (hasOwn(body, "about") && typeof body.about === "string") {
    profilePatch.about_me = body.about.trim() || null;
  }
  if (
    derivedCity === undefined &&
    hasOwn(body, "city") &&
    typeof body.city === "string"
  ) {
    profilePatch.city = body.city.trim() || null;
  }

  if (Object.keys(profilePatch).length > 0) {
    const { data: existingProfile } = await service
      .from("specialist_profiles")
      .select("specialist_id")
      .eq("specialist_id", specialistId)
      .maybeSingle();

    if (existingProfile?.specialist_id) {
      const { error } = await service
        .from("specialist_profiles")
        .update(profilePatch)
        .eq("specialist_id", specialistId);
      if (error) throw new Error("profile_update_failed");
    } else {
      const { error } = await service
        .from("specialist_profiles")
        .insert({ specialist_id: specialistId, ...profilePatch });
      if (error) throw new Error("profile_update_failed");
    }
  }

  if (languageCode && hasOwn(body, "about") && typeof body.about === "string") {
    const aboutForTranslation = body.about.trim() || null;
    const { error: profileTranslationError } = await service
      .from("specialist_profile_translations")
      .upsert(
        {
          specialist_id: specialistId,
          language_code: languageCode,
          about_me: aboutForTranslation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "specialist_id,language_code" },
      );
    if (profileTranslationError) {
      console.error(
        "[specialistProfile/patch] translation upsert failed",
        profileTranslationError.message,
      );
    }
  }

  const loaded = await loadSpecialistEditableProfile(service, specialistId, lang);
  return {
    specialist: loaded.specialist,
    ...(geocodeWarning ? { warning: geocodeWarning } : {}),
  };
}

export class ProfilePatchValidationError extends Error {
  readonly code: string;
  readonly fields: string[];

  constructor(code: string, fields: string[]) {
    super(code);
    this.name = "ProfilePatchValidationError";
    this.code = code;
    this.fields = fields;
  }
}
