import {
  DESCRIPTION_MAX_LEN,
  SERVICE_REQUEST_SOURCE,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_WORK_FORMATS,
  type ServiceRequestUrgency,
  type ServiceRequestWorkFormat,
} from "./constants";
import {
  mapServiceTimingToLegacyUrgency,
  validateServiceTiming,
  type ServiceTimingFields,
} from "./serviceTiming";

const SUPPORTED_LOCALES = ["ua", "ru", "de"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export type ServiceRequestCreateInput = {
  client_name?: unknown;
  client_email?: unknown;
  client_phone?: unknown;
  description?: unknown;
  preferred_language?: unknown;
  work_format?: unknown;
  city?: unknown;
  postal_code?: unknown;
  country_code?: unknown;
  radius_km?: unknown;
  urgency?: unknown;
  desired_date?: unknown;
  service_timing_type?: unknown;
  service_timing_date?: unknown;
  service_timing_time?: unknown;
  service_timing_date_end?: unknown;
  service_timing_period?: unknown;
  service_timing_note?: unknown;
  locale?: unknown;
  category_id?: unknown;
  category_text?: unknown;
  source_path?: unknown;
  client_campaign_link_id?: unknown;
  hp?: unknown;
  status?: unknown;
  source?: unknown;
  specialist_id?: unknown;
  public_id?: unknown;
};

export type ValidatedServiceRequestCreate = {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  description: string;
  preferred_language: string;
  work_format: ServiceRequestWorkFormat;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  radius_km: number | null;
  urgency: ServiceRequestUrgency;
  desired_date: string | null;
  service_timing: ServiceTimingFields;
  locale: SupportedLocale;
  category_id: string | null;
  category_text: string | null;
  source_path: string | null;
  client_campaign_link_id: string | null;
};

export type ValidationError = { error: string; status: number };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRadius(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

const TIMING_LIST_COLUMNS =
  "service_timing_type, service_timing_date, service_timing_time, service_timing_date_end, service_timing_period, service_timing_note";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validateServiceRequestCreate(
  body: ServiceRequestCreateInput,
): ValidatedServiceRequestCreate | ValidationError {
  if (typeof body.hp === "string" && body.hp.trim().length > 0) {
    return { error: "Spam rejected", status: 400 };
  }

  if (body.specialist_id != null && String(body.specialist_id).trim()) {
    return { error: "specialist_id is not allowed", status: 400 };
  }

  if (body.status != null && String(body.status).trim()) {
    return { error: "status is not allowed", status: 400 };
  }

  if (body.public_id != null && String(body.public_id).trim()) {
    return { error: "public_id is not allowed", status: 400 };
  }

  if (body.client_campaign_link_id != null && String(body.client_campaign_link_id).trim()) {
    return { error: "client_campaign_link_id is not allowed", status: 400 };
  }

  if (body.source != null && String(body.source).trim() && String(body.source).trim() !== SERVICE_REQUEST_SOURCE) {
    return { error: "invalid source", status: 400 };
  }

  const client_name = str(body.client_name);
  if (!client_name) {
    return { error: "client_name is required", status: 400 };
  }

  const description = str(body.description);
  if (!description) {
    return { error: "description is required", status: 400 };
  }
  if (description.length > DESCRIPTION_MAX_LEN) {
    return { error: "description is too long", status: 400 };
  }

  const client_email = str(body.client_email);
  const client_phone = str(body.client_phone);
  if (!client_email && !client_phone) {
    return { error: "client_email or client_phone is required", status: 400 };
  }

  const preferred_language = str(body.preferred_language);
  if (!preferred_language) {
    return { error: "preferred_language is required", status: 400 };
  }

  const work_formatRaw = str(body.work_format);
  if (!work_formatRaw || !SERVICE_REQUEST_WORK_FORMATS.includes(work_formatRaw as ServiceRequestWorkFormat)) {
    return { error: "work_format is required", status: 400 };
  }
  const work_format = work_formatRaw as ServiceRequestWorkFormat;

  const timingResult = validateServiceTiming(body);
  if ("error" in timingResult) {
    return { error: timingResult.error, status: 400 };
  }
  const service_timing = timingResult;
  const legacyTiming = mapServiceTimingToLegacyUrgency(service_timing);
  const urgency = legacyTiming.urgency;
  const desiredDateFromTiming = legacyTiming.desired_date;

  const localeRaw = str(body.locale);
  if (!localeRaw || !isSupportedLocale(localeRaw)) {
    return { error: "invalid locale", status: 400 };
  }

  const city = str(body.city);
  const postal_code = str(body.postal_code);
  const country_code = str(body.country_code)?.toUpperCase() ?? null;
  const radius_km = parseRadius(body.radius_km);

  if (work_format === "offline" || work_format === "hybrid") {
    if (!city && !postal_code) {
      return { error: "city or postal_code is required for offline/hybrid", status: 400 };
    }
  }

  if (radius_km != null && radius_km < 0) {
    return { error: "invalid radius_km", status: 400 };
  }

  const category_id = str(body.category_id);
  const category_text = str(body.category_text);
  const source_path = str(body.source_path);
  const client_campaign_link_id = str(body.client_campaign_link_id);
  if (client_campaign_link_id && !isUuid(client_campaign_link_id)) {
    return { error: "invalid client_campaign_link_id", status: 400 };
  }

  return {
    client_name,
    client_email,
    client_phone,
    description,
    preferred_language,
    work_format,
    city,
    postal_code,
    country_code,
    radius_km,
    urgency,
    desired_date: desiredDateFromTiming,
    service_timing,
    locale: localeRaw,
    category_id,
    category_text,
    source_path,
    client_campaign_link_id,
  };
}

export function isAllowedAdminStatus(value: unknown): value is (typeof SERVICE_REQUEST_STATUSES)[number] {
  return typeof value === "string" && (SERVICE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export const SERVICE_REQUEST_LIST_SELECT =
  `id, public_id, created_at, updated_at, category_id, category_text, preferred_language, work_format, city, postal_code, country_code, radius_km, urgency, desired_date, ${TIMING_LIST_COLUMNS}, locale, source, source_path, client_campaign_link_id, status`;

export const SERVICE_REQUEST_ADMIN_DETAIL_SELECT =
  `${SERVICE_REQUEST_LIST_SELECT}, client_name, client_email, client_phone, description`;
