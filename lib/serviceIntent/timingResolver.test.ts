import assert from "node:assert/strict";
import test from "node:test";

import type { ServiceIntentModelTiming } from "./modelResponse.ts";
import {
  addDays,
  calendarDateInTimeZone,
  calendarDateToIso,
  daysInMonth,
  isLeapYear,
  isoWeekday,
  nextWeekdayAfter,
  resolveIntentTiming,
} from "./timingResolver.ts";

const BERLIN = "Europe/Berlin";

function descriptor(overrides: Partial<ServiceIntentModelTiming> = {}): ServiceIntentModelTiming {
  return {
    kind: "unknown",
    relative_day: null,
    weekday: null,
    absolute_date: null,
    absolute_date_end: null,
    period: null,
    time: null,
    after_time: null,
    time_of_day: null,
    unresolved_expression: null,
    ...overrides,
  };
}

function resolve(
  timing: Partial<ServiceIntentModelTiming>,
  now: string,
  options: { timeZone?: string; availabilityNote?: string | null; recurrence?: string | null } = {},
) {
  return resolveIntentTiming(descriptor(timing), {
    now: new Date(now),
    timeZone: options.timeZone ?? BERLIN,
    availabilityNote: options.availabilityNote ?? null,
    recurrence: options.recurrence ?? null,
  });
}

test("11. today and tomorrow follow the caller's time zone, not UTC", () => {
  // 22:30 UTC on 25 Sep is already 26 Sep in Berlin.
  const lateEvening = "2026-09-25T22:30:00.000Z";
  assert.equal(
    resolve({ kind: "relative_day", relative_day: "today" }, lateEvening).timing
      .service_timing_date,
    "2026-09-26",
  );
  assert.equal(
    resolve({ kind: "relative_day", relative_day: "tomorrow" }, lateEvening).timing
      .service_timing_date,
    "2026-09-27",
  );
  // The same instant is still 25 Sep in New York.
  assert.equal(
    resolve({ kind: "relative_day", relative_day: "today" }, lateEvening, {
      timeZone: "America/New_York",
    }).timing.service_timing_date,
    "2026-09-25",
  );
});

test("11. an explicit time produces an exact datetime, a bare day stays flexible", () => {
  const exact = resolve(
    { kind: "relative_day", relative_day: "tomorrow", time: "18:00" },
    "2026-09-25T10:00:00.000Z",
  );
  assert.equal(exact.timing.service_timing_type, "exact_datetime");
  assert.equal(exact.timing.service_timing_date, "2026-09-26");
  assert.equal(exact.timing.service_timing_time, "18:00");

  const flexible = resolve(
    { kind: "relative_day", relative_day: "tomorrow", after_time: "18:00" },
    "2026-09-25T10:00:00.000Z",
  );
  assert.equal(flexible.timing.service_timing_type, "date_flexible");
  assert.equal(flexible.timing.service_timing_time, null);
  // "after 18:00" is a condition, so it survives in the note.
  assert.equal(flexible.timing.service_timing_note, "after 18:00");
});

test("12. relative days cross month and year boundaries", () => {
  const monthEnd = resolve(
    { kind: "relative_day", relative_day: "day_after_tomorrow" },
    "2026-09-30T08:00:00.000Z",
  );
  assert.equal(monthEnd.timing.service_timing_date, "2026-10-02");

  const yearEnd = resolve(
    { kind: "relative_day", relative_day: "tomorrow" },
    "2026-12-31T08:00:00.000Z",
  );
  assert.equal(yearEnd.timing.service_timing_date, "2027-01-01");

  const leap = resolve(
    { kind: "relative_day", relative_day: "tomorrow" },
    "2028-02-28T08:00:00.000Z",
  );
  assert.equal(leap.timing.service_timing_date, "2028-02-29");

  const nonLeap = resolve(
    { kind: "relative_day", relative_day: "tomorrow" },
    "2027-02-28T08:00:00.000Z",
  );
  assert.equal(nonLeap.timing.service_timing_date, "2027-03-01");
});

test('12. "on Saturday" resolves to the next Saturday, never today', () => {
  // 26 Sep 2026 is a Saturday.
  const fromSaturday = resolve(
    { kind: "relative_day", relative_day: "next_weekday", weekday: 6 },
    "2026-09-26T08:00:00.000Z",
  );
  assert.equal(fromSaturday.timing.service_timing_date, "2026-10-03");

  const fromFriday = resolve(
    { kind: "relative_day", relative_day: "next_weekday", weekday: 6 },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(fromFriday.timing.service_timing_date, "2026-09-26");
});

test("a date range maps to the existing range type and rejects an inverted range", () => {
  const range = resolve(
    {
      kind: "date_range",
      absolute_date: "2026-10-12",
      absolute_date_end: "2026-12-21",
    },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(range.timing.service_timing_type, "date_range");
  assert.equal(range.timing.service_timing_date, "2026-10-12");
  assert.equal(range.timing.service_timing_date_end, "2026-12-21");
  assert.equal(range.confidencePenalty, 0);

  const inverted = resolve(
    {
      kind: "date_range",
      absolute_date: "2026-12-21",
      absolute_date_end: "2026-10-12",
    },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(inverted.timing.service_timing_type, "date_flexible");
  assert.equal(inverted.timing.service_timing_date, "2026-12-21");
  assert.ok(inverted.confidencePenalty > 0);
});

test("asap and period descriptors map to existing timing types", () => {
  assert.equal(
    resolve({ kind: "asap" }, "2026-09-25T08:00:00.000Z").timing.service_timing_type,
    "asap",
  );
  const period = resolve(
    { kind: "period", period: "next_month" },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(period.timing.service_timing_type, "flexible_period");
  assert.equal(period.timing.service_timing_period, "next_month");
});

test("an impossible conversion keeps the wording and lowers confidence", () => {
  const result = resolve(
    { kind: "absolute_date", absolute_date: "sometime around Easter", unresolved_expression: "коли буде тепло" },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(result.timing.service_timing_type, "flexible_period");
  assert.equal(result.timing.service_timing_period, "flexible");
  assert.equal(result.timing.service_timing_note, "коли буде тепло");
  assert.ok(result.confidencePenalty > 0);
});

test("an invalid calendar date is not accepted as a date", () => {
  const result = resolve(
    { kind: "absolute_date", absolute_date: "2027-02-29" },
    "2026-09-25T08:00:00.000Z",
  );
  assert.equal(result.timing.service_timing_date, null);
  assert.ok(result.confidencePenalty > 0);
});

test("the note merges availability and recurrence without duplicates and within the limit", () => {
  const result = resolve(
    { kind: "asap", unresolved_expression: "каждую неделю" },
    "2026-09-25T08:00:00.000Z",
    { availabilityNote: "после 18:00", recurrence: "каждую неделю" },
  );
  assert.equal(result.timing.service_timing_note, "каждую неделю; после 18:00");
  assert.equal(result.availabilityNote, "после 18:00; каждую неделю");

  const long = resolve({ kind: "asap" }, "2026-09-25T08:00:00.000Z", {
    availabilityNote: "я".repeat(900),
  });
  assert.equal(long.timing.service_timing_note?.length, 500);
});

test("calendar helpers are correct on their own", () => {
  assert.equal(isLeapYear(2028), true);
  assert.equal(isLeapYear(2027), false);
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(2000), true);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2027, 2), 28);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 12), 31);
  assert.deepEqual(addDays({ year: 2026, month: 12, day: 31 }, 1), {
    year: 2027,
    month: 1,
    day: 1,
  });
  assert.deepEqual(addDays({ year: 2027, month: 1, day: 1 }, -1), {
    year: 2026,
    month: 12,
    day: 31,
  });
  assert.equal(calendarDateToIso({ year: 2026, month: 1, day: 5 }), "2026-01-05");
  // 25 Sep 2026 is a Friday.
  assert.equal(isoWeekday({ year: 2026, month: 9, day: 25 }), 5);
  assert.deepEqual(nextWeekdayAfter({ year: 2026, month: 9, day: 25 }, 1), {
    year: 2026,
    month: 9,
    day: 28,
  });
  assert.deepEqual(calendarDateInTimeZone(new Date("2026-09-25T22:30:00.000Z"), BERLIN), {
    year: 2026,
    month: 9,
    day: 26,
  });
});
