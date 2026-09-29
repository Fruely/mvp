/**
 * Canonical explicit client-budget normalizer.
 * Pricing v1 and matching both use this module. Do not add a second parser.
 *
 * A reliable maximum exists only for an exact amount, an "up to" ceiling, or a
 * range. "From X", missing text, ambiguous text, and non-EUR text have no maximum.
 */

const NON_EUR_CURRENCY =
  /(?:\$|£|₴|₽|zł)|\b(?:usd|gbp|chf|uah|rub|rur|pln|czk|sek|nok|dkk|try)\b|грн|грив|долар|фунт|руб|франк|dollar|pound|franken/i;

const NUMBER_RE =
  /(\d{1,3}(?:[ \u00A0\u202F]\d{3})+|\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d{1,2})?)/g;

const UP_TO = /^(?:up to|bis zu|bis|до)$/;
const FROM = /^(?:from|от|від|ab|von)$/;
const RANGE_BETWEEN = /^(?:-|bis|до|to)$/;

export type ExplicitClientBudget = {
  basisCents: number;
  minCents: number | null;
  maxCents: number | null;
};

export function nonNegativeIntegerCents(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function eurosToCents(euros: number): number | null {
  if (!Number.isSafeInteger(euros) || euros < 0) return null;
  if (euros > Math.floor(Number.MAX_SAFE_INTEGER / 100)) return null;
  return euros * 100;
}

function tokenToCents(token: string): number | null {
  const compact = token.replace(/[ \u00A0\u202F]/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    return eurosToCents(Number(compact.replace(/\./g, "")));
  }
  if (/^\d{1,3}(,\d{3})+$/.test(compact)) {
    return eurosToCents(Number(compact.replace(/,/g, "")));
  }
  const decimal = compact.match(/^(\d+)[.,](\d{1,2})$/);
  if (decimal) {
    const whole = Number(decimal[1]);
    const fraction = Number(decimal[2].padEnd(2, "0"));
    const cents = whole * 100 + fraction;
    if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction) || !Number.isSafeInteger(cents)) {
      return null;
    }
    return cents;
  }
  if (/^\d+$/.test(compact)) return eurosToCents(Number(compact));
  return null;
}

/**
 * Conservative explicit EUR budget. Returns null when the text is missing,
 * non-EUR, malformed, or not a single amount, ceiling, floor, or range.
 */
export function normalizeExplicitClientBudget(
  value: string | null | undefined,
): ExplicitClientBudget | null {
  if (typeof value !== "string") return null;
  const original = value.trim();
  if (!original || NON_EUR_CURRENCY.test(original)) return null;

  const text = original
    .toLowerCase()
    .replace(/€/g, " ")
    .replace(/\beur(?:o|os)?\b/g, " ")
    .replace(/евро/g, " ")
    .replace(/євро/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const matches: RegExpExecArray[] = [];
  const numberPattern = new RegExp(NUMBER_RE.source, "g");
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberPattern.exec(text)) !== null) {
    matches.push(numberMatch);
    if (matches.length > 2) break;
  }
  if (matches.length === 0 || matches.length > 2) return null;
  const amounts = matches.map((match) => tokenToCents(match[0]));
  if (amounts.some((amount) => amount == null)) return null;

  if (matches.length === 2) {
    const first = matches[0];
    const second = matches[1];
    const between = text.slice((first.index ?? 0) + first[0].length, second.index).trim();
    const before = text.slice(0, first.index).trim();
    const after = text.slice((second.index ?? 0) + second[0].length).trim();
    const minCents = amounts[0];
    const maxCents = amounts[1];
    if (before || after || minCents == null || maxCents == null || minCents > maxCents) return null;
    if (!RANGE_BETWEEN.test(between)) return null;
    return { basisCents: maxCents, minCents, maxCents };
  }

  const amount = amounts[0];
  const match = matches[0];
  if (amount == null) return null;
  const before = text.slice(0, match.index).trim();
  const after = text.slice((match.index ?? 0) + match[0].length).trim();
  if (after) return null;
  if (!before) return { basisCents: amount, minCents: amount, maxCents: amount };
  if (UP_TO.test(before)) return { basisCents: amount, minCents: null, maxCents: amount };
  if (FROM.test(before)) return { basisCents: amount, minCents: amount, maxCents: null };
  return null;
}

/**
 * Ceiling used for economic matching. An accepted reconciliation amount wins.
 * The original client_budget_text is not rewritten.
 */
export function effectiveClientMaximumCents(input: {
  clientBudgetText: string | null | undefined;
  acceptedCents: number | null;
}): number | null {
  if (input.acceptedCents != null) return input.acceptedCents;
  return normalizeExplicitClientBudget(input.clientBudgetText)?.maxCents ?? null;
}
