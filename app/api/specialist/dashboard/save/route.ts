import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient as createServiceClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { notify } from "@/lib/notifications/notify";
import { normalizeRouteLangToDbContentCode } from "@/lib/specialists/normalizeContentLanguageCode";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
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

const MAX_CERTIFICATE_URLS = 10;

function hasOwn<T extends object>(obj: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

type Payload = {
  name?: string;
  phone?: string;
  category_id?: string | null;
  work_format?: "online" | "offline" | "hybrid";
  languages?: string[];
  postal_code?: string;
  country_code?: string;
  mobile_service?: boolean;
  service_radius_km?: string | number | null;
  city?: string;
  address?: string;
  about_me?: string;
  video_url?: string;
  photo_url?: string;
  gallery_urls?: string[];
  certificate_urls?: string[];
  services?: Array<{
    id?: string;
    title: string;
    price_from: string;
    is_active?: boolean;
    price_comment?: string;
  }>;
  /** Route UI locale (ua|ru|de) for multilingual dual-write; optional */
  lang?: string;
};

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonNoStore({ error: "Not authenticated" }, { status: 401 });
  }

  // All reads/writes go through the service-role client. Ownership is enforced
  // explicitly in code: we resolve the specialist by user_id = auth.uid() and
  // scope every subsequent operation to that specialist.id.
  const service = createServiceClient();

  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body) return jsonNoStore({ error: "Invalid payload" }, { status: 400 });

  const languageCode = normalizeRouteLangToDbContentCode(
    typeof body.lang === "string" ? body.lang : null
  );

  const allowedLanguages = new Set(["ru", "uk", "de", "en", "pl"]);
  if (hasOwn(body, "languages")) {
    if (!Array.isArray(body.languages)) {
      return jsonNoStore({ error: "Invalid payload: languages must be an array" }, { status: 400 });
    }
    const hasInvalidLanguage = body.languages.some(
      (language) => typeof language !== "string" || !allowedLanguages.has(language)
    );
    if (hasInvalidLanguage) {
      return jsonNoStore({ error: "Invalid payload: languages contains unsupported values" }, { status: 400 });
    }
  }

  if (
    typeof body.gallery_urls !== "undefined" &&
    !Array.isArray(body.gallery_urls)
  ) {
    return jsonNoStore({ error: "Invalid payload: gallery_urls must be an array" }, { status: 400 });
  }

  if (
    typeof body.certificate_urls !== "undefined" &&
    !Array.isArray(body.certificate_urls)
  ) {
    return jsonNoStore({ error: "Invalid payload: certificate_urls must be an array" }, { status: 400 });
  }

  if (
    typeof body.work_format !== "undefined" &&
    body.work_format !== "online" &&
    body.work_format !== "offline" &&
    body.work_format !== "hybrid"
  ) {
    return jsonNoStore({ error: "Invalid payload: work_format is not supported" }, { status: 400 });
  }

  if (
    typeof body.postal_code !== "undefined" &&
    body.postal_code !== "" &&
    body.postal_code !== null &&
    (typeof body.postal_code !== "string" || !/^\d{5}$/.test(body.postal_code))
  ) {
    return jsonNoStore({ error: "Invalid payload: postal_code must match /^\\d{5}$/" }, { status: 400 });
  }

  const categoryIdValue = (body as Record<string, unknown>).category_id;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    typeof categoryIdValue !== "undefined" &&
    categoryIdValue !== null &&
    (typeof categoryIdValue !== "string" || !uuidRegex.test(categoryIdValue))
  ) {
    return jsonNoStore({ error: "Invalid payload: category_id must be a UUID" }, { status: 400 });
  }

  const { data: specialist, error: specialistError } = await service
    .from("specialists")
    .select(
      "id, category_id, postal_code, lat, lng, country_code, work_format, service_radius_km, status, is_active, is_visible"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (specialistError || !specialist?.id) {
    return jsonNoStore({ error: "Specialist not found" }, { status: 404 });
  }

  const specialistId = specialist.id as string;
  const isCurrentlyPublished =
    typeof specialist.status === "string" &&
    VISIBLE_PUBLIC_SPECIALIST_STATUSES.includes(
      specialist.status as (typeof VISIBLE_PUBLIC_SPECIALIST_STATUSES)[number]
    ) &&
    specialist.is_active === true &&
    specialist.is_visible === true;
  const effectiveCategoryId =
    body.category_id !== undefined
      ? (typeof body.category_id === "string" ? body.category_id.trim() || null : null)
      : (typeof specialist.category_id === "string" ? specialist.category_id : null) ?? null;
  const languages = hasOwn(body, "languages") && Array.isArray(body.languages)
    ? body.languages.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : null;

  if (effectiveCategoryId) {
    const { data: category } = await service
      .from("categories")
      .select("id, parent_id, slug")
      .eq("id", effectiveCategoryId)
      .maybeSingle();
    const slug = typeof category?.slug === "string" ? category.slug : null;
    const isUncategorized = slug === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG;
    if (!category || (!category.parent_id && !isUncategorized)) {
      return jsonNoStore(
        { error: "Invalid category: parent category cannot be selected" },
        { status: 400 }
      );
    }
  }

  const specialistPatch: Record<string, unknown> = {};
  if (typeof body.name === "string") specialistPatch.name = body.name.trim() || null;
  if (typeof body.phone === "string") specialistPatch.phone = body.phone.trim() || null;
  if (body.category_id === null) {
    specialistPatch.category_id = null;
  } else if (typeof body.category_id === "string") {
    specialistPatch.category_id = body.category_id.trim() || null;
  }
  if (body.work_format === "online" || body.work_format === "offline" || body.work_format === "hybrid") {
    specialistPatch.work_format = body.work_format;
  }
  if (typeof body.postal_code === "string") {
    specialistPatch.postal_code = body.postal_code.trim() || null;
  }

  if (hasOwn(body, "country_code")) {
    const code = normalizeCountryCode(body.country_code);
    if (code && code !== GERMANY_COUNTRY_CODE) {
      return jsonNoStore(
        { error: "publication_country_not_supported", code: "publication_country_not_supported" },
        { status: 400 }
      );
    }
    // Germany MVP: persist DE when provided; never wipe with null on partial payloads.
    if (code === GERMANY_COUNTRY_CODE) {
      specialistPatch.country_code = GERMANY_COUNTRY_CODE;
    }
  }

  if (typeof body.mobile_service === "boolean") {
    specialistPatch.mobile_service = body.mobile_service;
  }

  if (typeof body.service_radius_km !== "undefined") {
    const raw =
      body.service_radius_km == null ? "" : String(body.service_radius_km).trim();
    if (raw === "") {
      specialistPatch.service_radius_km = null;
    } else {
      const n = parseServiceRadiusKm(raw);
      if (n == null || !isAllowedServiceRadiusKm(n)) {
        return jsonNoStore(
          {
            error: "publication_service_radius_invalid",
            code: "publication_service_radius_invalid",
          },
          { status: 400 }
        );
      }
      specialistPatch.service_radius_km = n;
    }
  }

  const avatarUrlValue = (body as Record<string, unknown>).avatar_url;
  if (typeof avatarUrlValue === "string") {
    specialistPatch.avatar_url = avatarUrlValue.trim() || null;
  }

  if (languages !== null) {
    specialistPatch.languages = languages;
  }
  specialistPatch.updated_at = new Date().toISOString();

  // Derived city written with specialists geo in one logical step.
  let derivedCity: string | null | undefined = undefined;
  let geocodeWarning: string | null = null;

  const oldPlz =
    typeof specialist.postal_code === "string" ? specialist.postal_code : null;
  const newPlzRaw =
    typeof specialistPatch.postal_code === "string"
      ? (specialistPatch.postal_code as string)
      : undefined;
  const newPlzNormalized =
    newPlzRaw === undefined
      ? undefined
      : newPlzRaw
        ? normalizePostalCode(newPlzRaw)
        : null;

  if (newPlzRaw !== undefined && newPlzRaw && !newPlzNormalized) {
    return NextResponse.json({ error: "Invalid postal code" }, { status: 400 });
  }

  const plzChanged =
    newPlzNormalized !== undefined && newPlzNormalized !== oldPlz;
  const coordsMissing =
    (newPlzNormalized ?? oldPlz) !== null &&
    (specialist.lat == null || specialist.lng == null);
  const needsResolve = plzChanged || (coordsMissing && newPlzNormalized !== null);

  const bodyCity =
    hasOwn(body, "city") && typeof body.city === "string" ? body.city.trim() : "";
  const bodyLat =
    typeof (body as Record<string, unknown>).lat === "number"
      ? ((body as Record<string, unknown>).lat as number)
      : null;
  const bodyLng =
    typeof (body as Record<string, unknown>).lng === "number"
      ? ((body as Record<string, unknown>).lng as number)
      : null;

  if (needsResolve) {
    const plzToResolve = newPlzNormalized ?? oldPlz;
    if (plzToResolve) {
      const resolved = await resolveGermanPostalLocation(service, plzToResolve);
      if (resolved.ok) {
        // Prefer the user-selected candidate when city matches a resolved option.
        const matched =
          bodyCity.length > 0
            ? resolved.candidates.find(
                (c) => c.city.toLowerCase() === bodyCity.toLowerCase()
              )
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
        specialistPatch.postal_code = chosen.postalCode;
        specialistPatch.country_code = chosen.countryCode;
        specialistPatch.lat = chosen.lat;
        specialistPatch.lng = chosen.lng;
        derivedCity = chosen.city;
      } else {
        // Do not keep stale city/coords from a previous PLZ.
        specialistPatch.lat = null;
        specialistPatch.lng = null;
        derivedCity = null;
        geocodeWarning = "geocode_failed";
        console.warn("[specialist/dashboard/save] PLZ resolve failed", {
          plz: plzToResolve,
          reason: resolved.reason,
        });
      }
    }
  } else if (newPlzNormalized === null && newPlzRaw !== undefined) {
    // Explicit clear of PLZ → clear derived geo.
    specialistPatch.lat = null;
    specialistPatch.lng = null;
    derivedCity = null;
  } else if (
    !plzChanged &&
    bodyCity &&
    areValidCoordinates(bodyLat, bodyLng, { countryCode: GERMANY_COUNTRY_CODE })
  ) {
    // Same PLZ, user picked another candidate: persist matching city + coords together.
    specialistPatch.lat = bodyLat;
    specialistPatch.lng = bodyLng;
    derivedCity = bodyCity;
  }

  // City text without coords is display-only; never invent coordinates from free text.
  if (derivedCity === undefined && hasOwn(body, "city") && typeof body.city === "string") {
    if (!plzChanged) {
      derivedCity = body.city.trim() || null;
    }
  }

  const cleanedPatch = Object.fromEntries(
    Object.entries(specialistPatch).filter(([_, v]) => v !== undefined)
  );

  // Strict geo BEFORE write when a published profile changes geo-significant fields.
  // Avoids persisting incomplete PLZ/city/coords on legacy published rows.
  if (isCurrentlyPublished && saveTouchesGeography(body as Record<string, unknown>)) {
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
      return jsonNoStore(
        {
          error: geoCheck.code,
          code: geoCheck.code,
          warning: geocodeWarning,
        },
        { status: 400 }
      );
    }
  }

  const { error: specialistPatchError } = await service
    .from("specialists")
    .update(cleanedPatch)
    .eq("id", specialistId);
  if (specialistPatchError) {
    return jsonNoStore({ error: "Failed to update specialist profile" }, { status: 500 });
  }

  // Keep profile.city in sync when derived or explicitly updated.
  if (derivedCity !== undefined) {
    const { error: citySyncError } = await service.from("specialist_profiles").upsert(
      {
        specialist_id: specialistId,
        city: derivedCity,
      },
      { onConflict: "specialist_id" }
    );
    if (citySyncError) {
      console.error("[specialist/dashboard/save] city sync failed", citySyncError.message);
      return jsonNoStore({ error: "Failed to update specialist city" }, { status: 500 });
    }
  }

  const { data: specialistAfter, error: specialistAfterError } = await service
    .from("specialists")
    .select("category_id")
    .eq("id", specialistId)
    .maybeSingle();

  if (specialistAfterError) {
    return jsonNoStore({ error: "Failed to load specialist after save" }, { status: 500 });
  }

  const serviceCategoryId =
    typeof specialistAfter?.category_id === "string" ? specialistAfter.category_id : null;

  const profilePatch: Record<string, unknown> = {};
  if (hasOwn(body, "about_me") && typeof body.about_me === "string") {
    profilePatch.about_me = body.about_me.trim() || null;
  }
  // City is managed by PLZ resolution above when geography changes.
  // Only apply free-text city here if we did not already sync derivedCity.
  if (
    derivedCity === undefined &&
    hasOwn(body, "city") &&
    typeof body.city === "string"
  ) {
    profilePatch.city = body.city.trim() || null;
  }
  if (hasOwn(body, "address") && typeof body.address === "string") {
    profilePatch.address = body.address.trim() || null;
  }
  if (hasOwn(body, "video_url") && typeof body.video_url === "string") {
    profilePatch.video_url = body.video_url.trim() || null;
  }
  if (hasOwn(body, "photo_url") && typeof body.photo_url === "string") {
    profilePatch.photo_url = body.photo_url.trim() || null;
  }
  if (hasOwn(body, "gallery_urls") && Array.isArray(body.gallery_urls)) {
    profilePatch.gallery_urls = body.gallery_urls
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 5);
  }

  // Only update certificate_urls when the client sends the field explicitly.
  // Defaulting to [] when the key is missing would overwrite existing DB rows with an empty array.
  if (hasOwn(body, "certificate_urls") && Array.isArray(body.certificate_urls)) {
    profilePatch.certificate_urls = body.certificate_urls
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, MAX_CERTIFICATE_URLS);
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
      if (error) return jsonNoStore({ error: "Failed to update specialist details" }, { status: 500 });
    } else {
      const { error } = await service
        .from("specialist_profiles")
        .insert({ specialist_id: specialistId, ...profilePatch });
      if (error) return jsonNoStore({ error: "Failed to create specialist details" }, { status: 500 });
    }
  }

  if (languageCode && hasOwn(body, "about_me") && typeof body.about_me === "string") {
    const aboutForTranslation = body.about_me.trim() || null;
    const { error: profileTranslationError } = await service
      .from("specialist_profile_translations")
      .upsert(
        {
          specialist_id: specialistId,
          language_code: languageCode,
          about_me: aboutForTranslation,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "specialist_id,language_code" }
      );
    if (profileTranslationError) {
      console.error(
        "[dashboard/save] specialist_profile_translations upsert failed (legacy save already persisted)",
        profileTranslationError
      );
    }
  }

  if (hasOwn(body, "services")) {
    return jsonNoStore(
      { error: "Services must be updated via /api/specialist/services" },
      { status: 400 }
    );
  }

  const { data: notifyRow } = await service
    .from("specialists")
    .select(
      "name, first_dashboard_visit_at, published_at, dashboard_save_count, category_blocked_notified_at"
    )
    .eq("id", specialistId)
    .maybeSingle();

  if (notifyRow) {
    const newCount = (notifyRow.dashboard_save_count ?? 0) + 1;
    const { error: saveCountError } = await service
      .from("specialists")
      .update({
        dashboard_save_count: newCount,
      })
      .eq("id", specialistId);

    if (!saveCountError) {
      if (
        notifyRow.first_dashboard_visit_at &&
        !notifyRow.published_at &&
        newCount >= 2 &&
        !notifyRow.category_blocked_notified_at &&
        Date.now() - new Date(String(notifyRow.first_dashboard_visit_at)).getTime() >
          30 * 60 * 1000
      ) {
        await notify("NEW_SPECIALIST", {
          name: `🟣 Не может опубликоваться (возможно категория): ${notifyRow.name || "Без имени"}`,
        });
        await service
          .from("specialists")
          .update({
            category_blocked_notified_at: new Date().toISOString(),
          })
          .eq("id", specialistId);
      }
    }
  }

  const { data: geoAfter } = await service
    .from("specialists")
    .select("postal_code, country_code, lat, lng")
    .eq("id", specialistId)
    .maybeSingle();
  const { data: cityAfter } = await service
    .from("specialist_profiles")
    .select("city")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  return jsonNoStore({
    success: true,
    geography: {
      postal_code:
        typeof geoAfter?.postal_code === "string" ? geoAfter.postal_code : null,
      country_code:
        typeof geoAfter?.country_code === "string" ? geoAfter.country_code : null,
      city: typeof cityAfter?.city === "string" ? cityAfter.city : null,
      lat: typeof geoAfter?.lat === "number" ? geoAfter.lat : null,
      lng: typeof geoAfter?.lng === "number" ? geoAfter.lng : null,
    },
    ...(geocodeWarning ? { warning: geocodeWarning } : {}),
  });
}
