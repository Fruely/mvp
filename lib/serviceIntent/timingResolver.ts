import {
  SERVICE_TIMING_NOTE_MAX_LEN,
  type ServiceTimingFields,
  type ServiceTimingPeriod,
} from "@/lib/serviceRequests/serviceTiming";
import type { ServiceIntentModelTiming } from "./modelResponse";

/**
 * Resolves the model's timing descriptor into the existing platform timing
 * domain. Calendar arithmetic runs on local year/month/day values so a date can
 * never shift by a day through UTC conversion, and "today" is the current day in
 * the caller's time zone rather than on the server.
 */

export type CalendarDate = { year: number; month: number; day: number };

const NOTE_SEPARATOR = "; ";

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Current calendar date in `timeZone`, derived from the server clock. */
export function calendarDateInTimeZone(now: Date, timeZone: string): CalendarDate {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = formatted.split("-").map(Number);
  return { year, month, day };
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  let { year, month, day } = date;
  day += days;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  while (day < 1) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    day += daysInMonth(year, month);
  }
  return { year, month, day };
}

export function calendarDateToIso(date: CalendarDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

/** ISO weekday, 1 = Monday .. 7 = Sunday, computed without time-zone conversion. */
export function isoWeekday(date: CalendarDate): number {
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day));
  const day = utc.getUTCDay();
  return day === 0 ? 7 : day;
}

/** Next occurrence of `weekday` strictly after `from`. */
export function nextWeekdayAfter(from: CalendarDate, weekday: number): CalendarDate {
  const current = isoWeekday(from);
  let delta = weekday - current;
  if (delta <= 0) delta += 7;
  return addDays(from, delta);
}

function isIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

function isHm(value: string | null): value is string {
  return !!value && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
}

function isPeriod(value: string | null): value is ServiceTimingPeriod {
  return value === "next_week" || value === "next_month" || value === "flexible";
}

export type ResolvedIntentTiming = {
  timing: ServiceTimingFields;
  /** Availability text after folding in anything that could not be expressed. */
  availabilityNote: string | null;
  /** Reduced when a stated condition had to move into the note instead. */
  confidencePenalty: number;
};

function buildNote(parts: Array<string | null>): string | null {
  const unique: string[] = [];
  for (const part of parts) {
    const trimmed = part?.trim();
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed);
  }
  if (unique.length === 0) return null;
  return unique.join(NOTE_SEPARATOR).slice(0, SERVICE_TIMING_NOTE_MAX_LEN);
}

export type ResolveIntentTimingOptions = {
  now: Date;
  timeZone: string;
  availabilityNote: string | null;
  recurrence: string | null;
};

/**
 * `now` is the server clock; the caller's `timeZone` decides which calendar day
 * that is. Nothing here trusts a client-supplied timestamp.
 */
export function resolveIntentTiming(
  descriptor: ServiceIntentModelTiming,
  options: ResolveIntentTimingOptions,
): ResolvedIntentTiming {
  const today = calendarDateInTimeZone(options.now, options.timeZone);
  const noteExtras: Array<string | null> = [descriptor.unresolved_expression];
  let confidencePenalty = 0;

  const explicitTime = isHm(descriptor.time) ? descriptor.time : null;
  if (!explicitTime && isHm(descriptor.after_time)) {
    // "after 18:00" is a constraint, not an appointment time.
    noteExtras.push(`after ${descriptor.after_time}`);
  }
  if (!explicitTime && !descriptor.after_time && descriptor.time_of_day) {
    noteExtras.push(descriptor.time_of_day);
  }

  const resolveDate = (): { date: string | null; penalty: number } => {
    if (descriptor.kind === "absolute_date" || descriptor.kind === "date_range") {
      if (isIsoDate(descriptor.absolute_date)) return { date: descriptor.absolute_date, penalty: 0 };
      return { date: null, penalty: 0.3 };
    }
    if (descriptor.kind !== "relative_day") return { date: null, penalty: 0 };
    switch (descriptor.relative_day) {
      case "today":
        return { date: calendarDateToIso(today), penalty: 0 };
      case "tomorrow":
        return { date: calendarDateToIso(addDays(today, 1)), penalty: 0 };
      case "day_after_tomorrow":
        return { date: calendarDateToIso(addDays(today, 2)), penalty: 0 };
      case "next_weekday": {
        if (typeof descriptor.weekday !== "number") return { date: null, penalty: 0.3 };
        return { date: calendarDateToIso(nextWeekdayAfter(today, descriptor.weekday)), penalty: 0 };
      }
      default:
        return { date: null, penalty: 0.3 };
    }
  };

  const { date, penalty } = resolveDate();
  confidencePenalty += penalty;

  const finish = (timing: Omit<ServiceTimingFields, "service_timing_note">): ResolvedIntentTiming => ({
    timing: {
      ...timing,
      service_timing_note: buildNote([
        ...noteExtras,
        options.availabilityNote,
        options.recurrence,
      ]),
    },
    availabilityNote: buildNote([options.availabilityNote, options.recurrence]),
    confidencePenalty,
  });

  if (descriptor.kind === "date_range") {
    const end = isIsoDate(descriptor.absolute_date_end) ? descriptor.absolute_date_end : null;
    if (date && end && end >= date) {
      return finish({
        service_timing_type: "date_range",
        service_timing_date: date,
        service_timing_time: null,
        service_timing_date_end: end,
        service_timing_period: null,
      });
    }
    confidencePenalty += 0.3;
  }

  if (date) {
    if (explicitTime) {
      return finish({
        service_timing_type: "exact_datetime",
        service_timing_date: date,
        service_timing_time: explicitTime,
        service_timing_date_end: null,
        service_timing_period: null,
      });
    }
    return finish({
      service_timing_type: "date_flexible",
      service_timing_date: date,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: null,
    });
  }

  if (descriptor.kind === "asap") {
    return finish({
      service_timing_type: "asap",
      service_timing_date: null,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: null,
    });
  }

  if (descriptor.kind === "period" && isPeriod(descriptor.period)) {
    return finish({
      service_timing_type: "flexible_period",
      service_timing_date: null,
      service_timing_time: null,
      service_timing_date_end: null,
      service_timing_period: descriptor.period,
    });
  }

  // Nothing usable: stay in the least committal existing type and keep the wording.
  if (descriptor.kind !== "unknown") confidencePenalty += 0.2;
  return finish({
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: "flexible",
  });
}
