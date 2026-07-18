/**
 * Canonical Germany-MVP geography helpers for specialists.
 * Source of truth for publication geo validation and PLZ normalization.
 */

export const GERMANY_COUNTRY_CODE = "DE" as const;

export const ALLOWED_SERVICE_RADII_KM = [5, 10, 25, 50, 100] as const;
export type AllowedServiceRadiusKm = (typeof ALLOWED_SERVICE_RADII_KM)[number];

export type WorkFormat = "online" | "offline" | "hybrid";

export type NormalizedSpecialistLocation = {
  countryCode: typeof GERMANY_COUNTRY_CODE;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
};

export type PublicationGeoInput = {
  workFormat: WorkFormat | string | null | undefined;
  countryCode: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
  lat: number | null | undefined;
  lng: number | null | undefined;
  serviceRadiusKm: number | null | undefined;
};

export type PublicationGeoErrorCode =
  | "publication_country_required"
  | "publication_country_not_supported"
  | "publication_postal_code_required"
  | "publication_city_required"
  | "publication_coordinates_required"
  | "publication_service_radius_required"
  | "publication_service_radius_invalid";

export type PublicationGeoValidationResult =
  | { ok: true }
  | { ok: false; code: PublicationGeoErrorCode };

/** Loose DE bbox — includes border regions, rejects other continents. */
export const DE_LAT_MIN = 47.2;
export const DE_LAT_MAX = 55.2;
export const DE_LNG_MIN = 5.7;
export const DE_LNG_MAX = 15.3;

export function normalizePostalCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "").slice(0, 5);
  return /^\d{5}$/.test(digits) ? digits : null;
}

export function normalizeCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return code.length === 2 ? code : null;
}

export function normalizeWorkFormat(value: unknown): WorkFormat | null {
  if (value === "online" || value === "offline" || value === "hybrid") return value;
  return null;
}

export function isAllowedServiceRadiusKm(value: unknown): value is AllowedServiceRadiusKm {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (ALLOWED_SERVICE_RADII_KM as readonly number[]).includes(value)
  );
}

export function parseServiceRadiusKm(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Coordinates are valid only when finite, not (0,0), in global ranges,
 * and (for DE) inside a loose Germany bounding box.
 */
export function areValidCoordinates(
  lat: unknown,
  lng: unknown,
  options?: { countryCode?: string | null }
): lat is number {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;

  const country = normalizeCountryCode(options?.countryCode) ?? GERMANY_COUNTRY_CODE;
  if (country === GERMANY_COUNTRY_CODE) {
    if (lat < DE_LAT_MIN || lat > DE_LAT_MAX) return false;
    if (lng < DE_LNG_MIN || lng > DE_LNG_MAX) return false;
  }
  return true;
}

export function validatePublicationGeography(
  input: PublicationGeoInput
): PublicationGeoValidationResult {
  const workFormat = normalizeWorkFormat(input.workFormat);
  if (!workFormat) {
    // Caller should validate work_format separately; treat as offline-strict.
    return { ok: false, code: "publication_country_required" };
  }

  const countryCode = normalizeCountryCode(input.countryCode);
  if (!countryCode) return { ok: false, code: "publication_country_required" };
  if (countryCode !== GERMANY_COUNTRY_CODE) {
    return { ok: false, code: "publication_country_not_supported" };
  }

  const postalCode = normalizePostalCode(input.postalCode);
  if (!postalCode) return { ok: false, code: "publication_postal_code_required" };

  const city = typeof input.city === "string" ? input.city.trim() : "";
  if (!city) return { ok: false, code: "publication_city_required" };

  if (!areValidCoordinates(input.lat, input.lng, { countryCode })) {
    return { ok: false, code: "publication_coordinates_required" };
  }

  if (workFormat === "offline" || workFormat === "hybrid") {
    const radius = parseServiceRadiusKm(input.serviceRadiusKm);
    if (radius == null) return { ok: false, code: "publication_service_radius_required" };
    if (!isAllowedServiceRadiusKm(radius)) {
      return { ok: false, code: "publication_service_radius_invalid" };
    }
  }

  return { ok: true };
}

/** Haversine distance in km (Earth radius 6371). */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Dual-radius local eligibility for offline / hybrid local search.
 * Online never qualifies for local search.
 */
export function isWithinDualRadius(input: {
  workFormat: string | null | undefined;
  distanceKm: number;
  userSearchRadiusKm: number;
  specialistServiceRadiusKm: number | null | undefined;
}): boolean {
  const wf = normalizeWorkFormat(input.workFormat);
  if (!wf || wf === "online") return false;
  if (!Number.isFinite(input.distanceKm) || input.distanceKm < 0) return false;
  if (!isAllowedServiceRadiusKm(input.userSearchRadiusKm)) return false;
  if (input.distanceKm > input.userSearchRadiusKm) return false;
  const specialistRadius = parseServiceRadiusKm(input.specialistServiceRadiusKm);
  if (!isAllowedServiceRadiusKm(specialistRadius)) return false;
  return input.distanceKm <= specialistRadius;
}

export function extractCityFromNominatimAddress(
  address: Record<string, unknown> | null | undefined
): string | null {
  if (!address || typeof address !== "object") return null;
  const keys = ["city", "town", "village", "municipality", "county"] as const;
  for (const key of keys) {
    const raw = address[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

export type PublicLocationDisplay = {
  label: string;
  kind: "online" | "city" | "plz_city" | "empty";
};

/**
 * Privacy-safe public location label.
 * Online → "Онлайн" / localized by caller; does not advertise home city as venue.
 */
export function getPublicSpecialistLocation(input: {
  workFormat: string | null | undefined;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string | null;
  onlineLabel?: string;
  includeMaskedPlz?: boolean;
}): PublicLocationDisplay {
  const wf = normalizeWorkFormat(input.workFormat);
  if (wf === "online") {
    return {
      label: input.onlineLabel?.trim() || "Онлайн",
      kind: "online",
    };
  }
  const city = typeof input.city === "string" ? input.city.trim() : "";
  const plz = normalizePostalCode(input.postalCode);
  if (city && input.includeMaskedPlz && plz) {
    return { label: `${plz.slice(0, 3)}xx ${city}`, kind: "plz_city" };
  }
  if (city) return { label: city, kind: "city" };
  return { label: "", kind: "empty" };
}

/** Geo-significant body keys that force strict validation on save of published profiles. */
export const GEO_SIGNIFICANT_SAVE_KEYS = [
  "postal_code",
  "country_code",
  "work_format",
  "service_radius_km",
  "mobile_service",
] as const;

export function saveTouchesGeography(body: Record<string, unknown>): boolean {
  return GEO_SIGNIFICANT_SAVE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(body, key)
  );
}

/** Localized RU copy for API/Telegram when locale pack is unavailable. */
export function publicationGeoErrorMessageRu(
  code: PublicationGeoErrorCode,
  workFormat?: WorkFormat | string | null
): string {
  const wf = normalizeWorkFormat(workFormat);
  switch (code) {
    case "publication_country_required":
    case "publication_country_not_supported":
      return "Пока поддерживается только Германия (DE). Укажите страну местонахождения.";
    case "publication_postal_code_required":
      return "Укажите корректный почтовый индекс (PLZ, 5 цифр).";
    case "publication_city_required":
    case "publication_coordinates_required":
      if (wf === "online") {
        return "Укажите страну, почтовый индекс и город вашего местонахождения. Эти данные нужны для проверки профиля и не означают очный приём.";
      }
      return "Для офлайн-работы укажите действительный почтовый индекс, город и зону обслуживания. Без этих данных клиенты не смогут найти ваш профиль.";
    case "publication_service_radius_required":
    case "publication_service_radius_invalid":
      return "Для офлайн-работы укажите действительный почтовый индекс, город и зону обслуживания. Без этих данных клиенты не смогут найти ваш профиль.";
    default:
      return "География профиля неполная для публикации.";
  }
}
