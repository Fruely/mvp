import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type PublicationGeoErrorCode,
  type PublicationGeoValidationResult,
  type WorkFormat,
  normalizeWorkFormat,
  validatePublicationGeography,
} from "@/lib/specialists/geography";

export type SpecialistGeoSnapshot = {
  workFormat: WorkFormat | null;
  countryCode: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  serviceRadiusKm: number | null;
};

/**
 * Load canonical geo fields for publication checks.
 */
export async function loadSpecialistGeoSnapshot(
  supabase: SupabaseClient,
  specialistId: string
): Promise<SpecialistGeoSnapshot | null> {
  const { data: specialist, error } = await supabase
    .from("specialists")
    .select("work_format, country_code, postal_code, lat, lng, service_radius_km")
    .eq("id", specialistId)
    .maybeSingle();

  if (error || !specialist) return null;

  const { data: profile } = await supabase
    .from("specialist_profiles")
    .select("city")
    .eq("specialist_id", specialistId)
    .maybeSingle();

  return {
    workFormat: normalizeWorkFormat(specialist.work_format),
    countryCode: typeof specialist.country_code === "string" ? specialist.country_code : null,
    postalCode: typeof specialist.postal_code === "string" ? specialist.postal_code : null,
    city: typeof profile?.city === "string" ? profile.city : null,
    lat: typeof specialist.lat === "number" ? specialist.lat : null,
    lng: typeof specialist.lng === "number" ? specialist.lng : null,
    serviceRadiusKm:
      typeof specialist.service_radius_km === "number" ? specialist.service_radius_km : null,
  };
}

/** Single source of truth for publish / republish / admin public transitions. */
export function assertPublicationGeography(
  snapshot: SpecialistGeoSnapshot
): PublicationGeoValidationResult {
  return validatePublicationGeography({
    workFormat: snapshot.workFormat,
    countryCode: snapshot.countryCode,
    postalCode: snapshot.postalCode,
    city: snapshot.city,
    lat: snapshot.lat,
    lng: snapshot.lng,
    serviceRadiusKm: snapshot.serviceRadiusKm,
  });
}

export async function assertSpecialistCanBePublished(
  supabase: SupabaseClient,
  specialistId: string
): Promise<PublicationGeoValidationResult> {
  const snapshot = await loadSpecialistGeoSnapshot(supabase, specialistId);
  if (!snapshot || !snapshot.workFormat) {
    return { ok: false, code: "publication_country_required" };
  }
  return assertPublicationGeography(snapshot);
}

export function publicationGeoErrorHttpStatus(_code: PublicationGeoErrorCode): number {
  return 400;
}
