/** UI / checkout mapping — aligned with `specialist_plan.plan_code` (not a separate DB canon). */
export const PLAN_CODES = ["starter", "basic", "premium"] as const;

export type PlanCode = (typeof PLAN_CODES)[number];

export const PAID_PLAN_CODES = ["basic", "premium"] as const;

export type PaidPlanCode = (typeof PAID_PLAN_CODES)[number];

export type PlanDefinition = {
  code: PlanCode;
  isPaid: boolean;
};

export type CommercialPlanDefinition = {
  code: PaidPlanCode;
  isPaid: true;
};

/** Internal catalog — includes legacy starter for dashboard compatibility. */
export const PLAN_CATALOG: readonly PlanDefinition[] = [
  { code: "starter", isPaid: false },
  { code: "basic", isPaid: true },
  { code: "premium", isPaid: true },
] as const;

/** Public commercial plans shown in billing picker (no Starter). */
export const PUBLIC_COMMERCIAL_PLAN_CATALOG: readonly CommercialPlanDefinition[] = [
  { code: "basic", isPaid: true },
  { code: "premium", isPaid: true },
] as const;

export function isPlanCode(value: string): value is PlanCode {
  return (PLAN_CODES as readonly string[]).includes(value);
}

export function isPaidPlanCode(value: string): value is PaidPlanCode {
  return (PAID_PLAN_CODES as readonly string[]).includes(value);
}

export function parsePlanCode(value: unknown): PlanCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isPlanCode(normalized) ? normalized : null;
}

export function parsePaidPlanCode(value: unknown): PaidPlanCode | null {
  const parsed = parsePlanCode(value);
  if (!parsed || !isPaidPlanCode(parsed)) return null;
  return parsed;
}
