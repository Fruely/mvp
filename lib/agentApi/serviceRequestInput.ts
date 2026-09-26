import {
  DESCRIPTION_MAX_LEN,
  SERVICE_REQUEST_WORK_FORMATS,
  type ServiceRequestWorkFormat,
} from "@/lib/serviceRequests/constants";
import {
  validateServiceRequestCreate,
  type ValidatedServiceRequestCreate,
  type ValidationError,
} from "@/lib/serviceRequests/validation";

export const AGENT_CREATE_SERVICE_REQUEST_SOURCE_PATH =
  "/api/v1/agent/service-requests";

export const AGENT_CREATE_SERVICE_REQUEST_LANGUAGES = ["de", "ru", "uk"] as const;
export const AGENT_CREATE_SERVICE_REQUEST_LOCALES = ["ua", "ru", "de"] as const;

type AgentCreateLanguage = (typeof AGENT_CREATE_SERVICE_REQUEST_LANGUAGES)[number];
type AgentCreateLocale = (typeof AGENT_CREATE_SERVICE_REQUEST_LOCALES)[number];

const LANGUAGE_TO_LOCALE: Record<AgentCreateLanguage, AgentCreateLocale> = {
  de: "de",
  ru: "ru",
  uk: "ua",
};

const ALLOWED_BODY_KEYS = new Set([
  "category",
  "language",
  "work_format",
  "city",
  "postal_code",
  "request_text",
  "user_contact",
  "locale",
]);

const ALLOWED_CONTACT_KEYS = new Set(["name", "email", "phone"]);

function err(error: string): ValidationError {
  return { error, status: 400 };
}

function unknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
): string[] {
  return Object.keys(value).filter((key) => !allowed.has(key));
}

function isLanguage(value: string): value is AgentCreateLanguage {
  return (AGENT_CREATE_SERVICE_REQUEST_LANGUAGES as readonly string[]).includes(
    value,
  );
}

function isLocale(value: string): value is AgentCreateLocale {
  return (AGENT_CREATE_SERVICE_REQUEST_LOCALES as readonly string[]).includes(
    value,
  );
}

function optionalString(
  value: unknown,
  field: string,
): string | null | ValidationError {
  if (value == null) return null;
  if (typeof value !== "string") return err(`${field} must be a string`);
  const trimmed = value.trim();
  return trimmed || null;
}

function requiredString(
  value: unknown,
  field: string,
): string | ValidationError {
  const parsed = optionalString(value, field);
  if (parsed && typeof parsed === "object") return parsed;
  if (!parsed) return err(`${field} is required`);
  return parsed;
}

export function parseAgentCreateServiceRequestInput(
  body: unknown,
): ValidatedServiceRequestCreate | ValidationError {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    return err("invalid body");
  }

  const record = body as Record<string, unknown>;
  if (unknownKeys(record, ALLOWED_BODY_KEYS).length > 0) {
    return err("unknown fields are not allowed");
  }

  const category = requiredString(record.category, "category");
  if (typeof category !== "string") return category;

  const languageRaw = requiredString(record.language, "language");
  if (typeof languageRaw !== "string") return languageRaw;
  if (!isLanguage(languageRaw)) return err("unsupported language");

  const workFormatRaw = requiredString(record.work_format, "work_format");
  if (typeof workFormatRaw !== "string") return workFormatRaw;
  if (
    !SERVICE_REQUEST_WORK_FORMATS.includes(
      workFormatRaw as ServiceRequestWorkFormat,
    )
  ) {
    return err("invalid work_format");
  }

  const requestText = requiredString(record.request_text, "request_text");
  if (typeof requestText !== "string") return requestText;
  if (requestText.length > DESCRIPTION_MAX_LEN) {
    return err("request_text is too long");
  }

  const city = optionalString(record.city, "city");
  if (city && typeof city === "object") return city;
  const postalCode = optionalString(record.postal_code, "postal_code");
  if (postalCode && typeof postalCode === "object") return postalCode;

  let locale: AgentCreateLocale = LANGUAGE_TO_LOCALE[languageRaw];
  if (record.locale != null) {
    const localeRaw = requiredString(record.locale, "locale");
    if (typeof localeRaw !== "string") return localeRaw;
    if (!isLocale(localeRaw)) return err("unsupported locale");
    locale = localeRaw;
  }

  if (
    record.user_contact == null ||
    typeof record.user_contact !== "object" ||
    Array.isArray(record.user_contact)
  ) {
    return err("user_contact is required");
  }

  const contact = record.user_contact as Record<string, unknown>;
  if (unknownKeys(contact, ALLOWED_CONTACT_KEYS).length > 0) {
    return err("unknown fields are not allowed");
  }

  const name = requiredString(contact.name, "user_contact.name");
  if (typeof name !== "string") return name;
  const email = optionalString(contact.email, "user_contact.email");
  if (email && typeof email === "object") return email;
  const phone = optionalString(contact.phone, "user_contact.phone");
  if (phone && typeof phone === "object") return phone;
  if (!email && !phone) {
    return err("user_contact.email or user_contact.phone is required");
  }

  return validateServiceRequestCreate({
    client_name: name,
    client_email: email,
    client_phone: phone,
    description: requestText,
    preferred_language: languageRaw,
    service_languages: [languageRaw],
    work_format: workFormatRaw,
    city,
    postal_code: postalCode,
    locale,
    category_text: category,
    source_path: AGENT_CREATE_SERVICE_REQUEST_SOURCE_PATH,
    service_timing_type: "flexible_period",
    service_timing_period: "flexible",
  });
}
