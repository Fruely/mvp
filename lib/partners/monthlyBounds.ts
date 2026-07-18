/**
 * Europe/Berlin month boundaries expressed as UTC Date instants.
 * Ledger timestamps stay UTC; period labels use Berlin wall clock.
 */

const BERLIN = "Europe/Berlin";

function formatBerlinParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convert a Berlin wall-clock local datetime to the corresponding UTC Date. */
export function berlinLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): Date {
  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  for (let i = 0; i < 4; i += 1) {
    const b = formatBerlinParts(utc);
    const berlinAsUtc = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, b.second);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    const delta = desiredAsUtc - berlinAsUtc;
    if (delta === 0) break;
    utc = new Date(utc.getTime() + delta);
  }
  return utc;
}

export type MonthBounds = {
  year: number;
  month: number;
  start: Date;
  endExclusive: Date;
  startIso: string;
  endExclusiveIso: string;
};

/** Current (or reference) calendar month in Europe/Berlin, as UTC bounds [start, end). */
export function getBerlinMonthBoundsUtc(reference: Date = new Date()): MonthBounds {
  const { year, month } = formatBerlinParts(reference);
  const start = berlinLocalToUtc(year, month, 1, 0, 0, 0);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = berlinLocalToUtc(nextYear, nextMonth, 1, 0, 0, 0);
  return {
    year,
    month,
    start,
    endExclusive,
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

export function isTimestampInRange(
  iso: string | null | undefined,
  startIso: string,
  endExclusiveIso: string
): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const start = Date.parse(startIso);
  const end = Date.parse(endExclusiveIso);
  return t >= start && t < end;
}

export type PeriodReportAmounts = {
  clicks: number;
  registrations: number;
  approved_first_payments: number;
  gross_commission_cents: number;
  reversed_cents: number;
  paid_cents: number;
  unpaid_approved_cents: number;
};

/** Pure aggregator for monthly/period reports (cents, integer math). */
export function aggregatePeriodReport(input: {
  clicks: number;
  registrations: number;
  commissions: Array<{ amount_cents: number; status: string }>;
}): PeriodReportAmounts {
  let approvedFirstPayments = 0;
  let gross = 0;
  let reversed = 0;
  let paid = 0;
  let unpaidApproved = 0;

  for (const c of input.commissions) {
    const amount = Number.isInteger(c.amount_cents) ? c.amount_cents : 0;
    if (c.status === "approved" || c.status === "paid") {
      approvedFirstPayments += 1;
      gross += amount;
    }
    if (c.status === "approved") unpaidApproved += amount;
    if (c.status === "paid") paid += amount;
    if (c.status === "reversed") reversed += amount;
  }

  return {
    clicks: input.clicks,
    registrations: input.registrations,
    approved_first_payments: approvedFirstPayments,
    gross_commission_cents: gross,
    reversed_cents: reversed,
    paid_cents: paid,
    unpaid_approved_cents: unpaidApproved,
  };
}
