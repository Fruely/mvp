export const PRICING_EXCEPTIONS = ["THIRD_PARTY_FUNDED", "AFTER_ASSESSMENT"] as const;
export type PricingException = (typeof PRICING_EXCEPTIONS)[number];

export type ServicePricingInput = {
  pricing_type?: unknown;
  price_from?: unknown;
  price_to?: unknown;
  price_comment?: unknown;
  pricing_exception?: unknown;
};

export type PublicServicePriceCopy = {
  thirdPartyFunded: string;
  afterAssessment: string;
};

export type PublicServicePriceView = {
  kind: "numeric" | "exception" | "note" | "empty";
  exception: PricingException | null;
  main: string;
  explanation: string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function trimToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isPricingException(value: unknown): value is PricingException {
  return value === "THIRD_PARTY_FUNDED" || value === "AFTER_ASSESSMENT";
}

export function parsePricingException(
  value: unknown,
): { ok: true; value: PricingException | null } | { ok: false } {
  if (value == null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (isPricingException(trimmed)) return { ok: true, value: trimmed };
  return { ok: false };
}

export function normalizePricingException(value: unknown): PricingException | null {
  const parsed = parsePricingException(value);
  return parsed.ok ? parsed.value : null;
}

/**
 * Canonical publishable-service pricing rule:
 *
 * VALID = (price_from > 0, plus range shape when pricing_type is range)
 *      OR (pricing_exception in supported values AND trimmed price_comment is non-empty)
 *
 * A generic comment alone does not bypass the numeric price requirement.
 */
export function isValidPublishableServicePricing(input: ServicePricingInput): boolean {
  const exception = normalizePricingException(input.pricing_exception);
  const explanation = trimToNull(input.price_comment);
  if (exception) {
    return explanation != null;
  }

  const priceFrom = toFiniteNumber(input.price_from);
  if (priceFrom == null || priceFrom <= 0) return false;

  const pricingType =
    input.pricing_type === "range" || input.pricing_type === "hourly" || input.pricing_type === "fixed"
      ? input.pricing_type
      : "fixed";
  if (pricingType === "range") {
    const priceTo = toFiniteNumber(input.price_to);
    return priceTo != null && priceTo >= priceFrom;
  }
  return true;
}

export function persistPriceFromForException(
  priceFrom: number | null,
  exception: PricingException | null,
): number {
  if (exception && (priceFrom == null || priceFrom <= 0)) return 0;
  return priceFrom ?? 0;
}

function formatEuro(amount: number): string {
  return `${amount} €`;
}

export function formatNumericServicePrice(input: {
  pricing_type?: unknown;
  price_from: number;
  price_to?: unknown;
}): string {
  const priceTo = toFiniteNumber(input.price_to);
  if (
    input.pricing_type === "range" &&
    priceTo != null &&
    Number.isFinite(priceTo) &&
    priceTo > 0
  ) {
    return `${input.price_from}–${priceTo} €`;
  }
  return formatEuro(input.price_from);
}

export function resolvePublicServicePriceView(
  input: ServicePricingInput,
  copy: PublicServicePriceCopy,
): PublicServicePriceView {
  const priceFrom = toFiniteNumber(input.price_from);
  const explanation = trimToNull(input.price_comment);
  const exception = normalizePricingException(input.pricing_exception);

  if (priceFrom != null && priceFrom > 0) {
    return {
      kind: "numeric",
      exception: null,
      main: formatNumericServicePrice({
        pricing_type: input.pricing_type,
        price_from: priceFrom,
        price_to: input.price_to,
      }),
      explanation,
    };
  }

  if (exception === "THIRD_PARTY_FUNDED") {
    return {
      kind: "exception",
      exception,
      main: copy.thirdPartyFunded,
      explanation,
    };
  }
  if (exception === "AFTER_ASSESSMENT") {
    return {
      kind: "exception",
      exception,
      main: copy.afterAssessment,
      explanation,
    };
  }

  if (explanation) {
    return {
      kind: "note",
      exception: null,
      main: explanation,
      explanation: null,
    };
  }

  return { kind: "empty", exception: null, main: "", explanation: null };
}

export function publicPriceShowsZeroEuro(view: PublicServicePriceView): boolean {
  return /(?:^|[\s])0(?:[.,]0+)?\s*€/.test(view.main) || view.main.trim() === "0€";
}
