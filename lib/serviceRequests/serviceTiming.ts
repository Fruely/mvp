import type { ServiceRequestUrgency } from "./constants";

export const SERVICE_TIMING_TYPES = [
  "asap",
  "exact_datetime",
  "date_flexible",
  "date_range",
  "flexible_period",
] as const;

export type ServiceTimingType = (typeof SERVICE_TIMING_TYPES)[number];

export const SERVICE_TIMING_PERIODS = ["next_week", "next_month", "flexible"] as const;

export type ServiceTimingPeriod = (typeof SERVICE_TIMING_PERIODS)[number];

export const SERVICE_TIMING_NOTE_MAX_LEN = 500;

export type ServiceTimingFields = {
  service_timing_type: ServiceTimingType;
  service_timing_date: string | null;
  service_timing_time: string | null;
  service_timing_date_end: string | null;
  service_timing_period: ServiceTimingPeriod | null;
  service_timing_note: string | null;
};

export type ServiceTimingInput = {
  service_timing_type?: unknown;
  service_timing_date?: unknown;
  service_timing_time?: unknown;
  service_timing_date_end?: unknown;
  service_timing_period?: unknown;
  service_timing_note?: unknown;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseIsoDate(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

export function parseTimeHm(value: unknown): string | null {
  const s = str(value);
  if (!s) return null;
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(s)) return null;
  return s;
}

export function validateServiceTiming(
  body: ServiceTimingInput,
): ServiceTimingFields | { error: string } {
  const typeRaw = str(body.service_timing_type);
  if (!typeRaw || !SERVICE_TIMING_TYPES.includes(typeRaw as ServiceTimingType)) {
    return { error: "service_timing_type is required" };
  }
  const service_timing_type = typeRaw as ServiceTimingType;

  const service_timing_date = parseIsoDate(body.service_timing_date);
  const service_timing_time = parseTimeHm(body.service_timing_time);
  const service_timing_date_end = parseIsoDate(body.service_timing_date_end);
  const periodRaw = str(body.service_timing_period);
  const service_timing_period =
    periodRaw && SERVICE_TIMING_PERIODS.includes(periodRaw as ServiceTimingPeriod)
      ? (periodRaw as ServiceTimingPeriod)
      : null;

  const noteRaw = str(body.service_timing_note);
  if (noteRaw && noteRaw.length > SERVICE_TIMING_NOTE_MAX_LEN) {
    return { error: "service_timing_note is too long" };
  }
  const service_timing_note = noteRaw;

  switch (service_timing_type) {
    case "asap":
      break;
    case "exact_datetime":
      if (!service_timing_date) {
        return { error: "service_timing_date is required for exact_datetime" };
      }
      if (!service_timing_time) {
        return { error: "service_timing_time is required for exact_datetime" };
      }
      break;
    case "date_flexible":
      if (!service_timing_date) {
        return { error: "service_timing_date is required for date_flexible" };
      }
      break;
    case "date_range":
      if (!service_timing_date || !service_timing_date_end) {
        return { error: "service_timing_date and service_timing_date_end are required for date_range" };
      }
      if (service_timing_date_end < service_timing_date) {
        return { error: "invalid service_timing date range" };
      }
      break;
    case "flexible_period":
      if (!service_timing_period) {
        return { error: "service_timing_period is required for flexible_period" };
      }
      break;
    default:
      return { error: "invalid service_timing_type" };
  }

  return {
    service_timing_type,
    service_timing_date,
    service_timing_time,
    service_timing_date_end,
    service_timing_period,
    service_timing_note,
  };
}

/** Map structured timing to legacy urgency/desired_date for backwards-compatible columns. */
export function mapServiceTimingToLegacyUrgency(
  timing: ServiceTimingFields,
): { urgency: ServiceRequestUrgency; desired_date: string | null } {
  switch (timing.service_timing_type) {
    case "asap":
      return { urgency: "asap", desired_date: null };
    case "exact_datetime":
    case "date_flexible":
      return { urgency: "specific_date", desired_date: timing.service_timing_date };
    case "date_range":
      return { urgency: "flexible", desired_date: timing.service_timing_date };
    case "flexible_period":
      if (timing.service_timing_period === "next_week") {
        return { urgency: "within_week", desired_date: null };
      }
      if (timing.service_timing_period === "next_month") {
        return { urgency: "within_month", desired_date: null };
      }
      return { urgency: "flexible", desired_date: null };
    default:
      return { urgency: "flexible", desired_date: null };
  }
}

type TimingDisplayLocale = "ru" | "ua" | "de";

function formatDateLabel(isoDate: string, locale: TimingDisplayLocale): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const intl =
    locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "uk-UA";
  return dt.toLocaleDateString(intl, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const PERIOD_LABELS: Record<ServiceTimingPeriod, Record<TimingDisplayLocale, string>> = {
  next_week: {
    ru: "На следующей неделе",
    ua: "Наступного тижня",
    de: "Nächste Woche",
  },
  next_month: {
    ru: "В следующем месяце",
    ua: "Наступного місяця",
    de: "Nächsten Monat",
  },
  flexible: {
    ru: "Срок гибкий / примерный",
    ua: "Строк гнучкий / орієнтовний",
    de: "Flexibler / ungefährer Zeitraum",
  },
};

export type ServiceTimingDisplaySource = {
  service_timing_type?: string | null;
  service_timing_date?: string | null;
  service_timing_time?: string | null;
  service_timing_date_end?: string | null;
  service_timing_period?: string | null;
  service_timing_note?: string | null;
  urgency?: string | null;
  desired_date?: string | null;
};

/** Human-readable timing for admin, Telegram, and safe public preview. */
export function formatServiceTimingDisplay(
  row: ServiceTimingDisplaySource,
  locale: TimingDisplayLocale = "ru",
): string {
  const type = str(row.service_timing_type) as ServiceTimingType | null;

  if (type === "asap") {
    return locale === "de"
      ? "So schnell wie möglich"
      : locale === "ua"
        ? "Якомога швидше"
        : "Как можно скорее";
  }

  if (type === "exact_datetime" && row.service_timing_date) {
    const dateLabel = formatDateLabel(row.service_timing_date, locale);
    const time = str(row.service_timing_time);
    if (time) {
      return locale === "de"
        ? `${dateLabel}, ${time}`
        : locale === "ua"
          ? `${dateLabel}, ${time}`
          : `${dateLabel}, ${time}`;
    }
    return dateLabel;
  }

  if (type === "date_flexible" && row.service_timing_date) {
    const dateLabel = formatDateLabel(row.service_timing_date, locale);
    const suffix =
      locale === "de"
        ? " (Uhrzeit flexibel)"
        : locale === "ua"
          ? " (час гнучкий)"
          : " (время гибкое)";
    return `${dateLabel}${suffix}`;
  }

  if (
    type === "date_range" &&
    row.service_timing_date &&
    row.service_timing_date_end
  ) {
    const from = formatDateLabel(row.service_timing_date, locale);
    const to = formatDateLabel(row.service_timing_date_end, locale);
    return `${from} – ${to}`;
  }

  if (type === "flexible_period") {
    const period = str(row.service_timing_period) as ServiceTimingPeriod | null;
    if (period && PERIOD_LABELS[period]) {
      return PERIOD_LABELS[period][locale];
    }
  }

  const note = str(row.service_timing_note);
  if (note) return note;

  // Legacy fallback for rows without structured timing
  const urgency = str(row.urgency);
  if (urgency === "asap") {
    return formatServiceTimingDisplay({ service_timing_type: "asap" }, locale);
  }
  if (urgency === "specific_date" && row.desired_date) {
    return formatDateLabel(String(row.desired_date).slice(0, 10), locale);
  }
  if (urgency) return urgency;
  return "—";
}
