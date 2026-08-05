type PaidPlanCode = "basic" | "premium";

type PlanSnapshot = {
  plan_code: string;
  plan_status: string;
};

const PLAN_CODES = new Set(["starter", "basic", "premium"]);

function parsePlanCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return PLAN_CODES.has(normalized) ? normalized : null;
}

export const GALLERY_LIMIT_PROFESSIONAL = 5;
export const GALLERY_LIMIT_GROWTH = 15;

export const PLAN_PUBLIC_NAMES = {
  basic: "Freuly Professional",
  premium: "Freuly Growth",
} as const;

export const PLAN_MONTHLY_PRICE_EUR = {
  basic: 29,
  premium: 59,
} as const;

const ENTITLED_STATUSES = new Set([
  "active",
  "trialing",
  "grace",
  "grace_period",
  "early_access",
]);

export type SpecialistEntitlements = {
  internalPlanCode: string;
  effectivePaidPlan: PaidPlanCode | null;
  publicPlanName: string | null;
  galleryLimit: number;
  galleryPublicLimit: number;
  hasGrowthPageFormat: boolean;
  hasEditorialPackage: boolean;
};

export function resolveGalleryLimitFromPlanCode(planCode: string | null | undefined): number {
  return planCode === "premium" ? GALLERY_LIMIT_GROWTH : GALLERY_LIMIT_PROFESSIONAL;
}

function resolveEffectivePaidPlan(
  planCode: string,
  planStatus: string,
): PaidPlanCode | null {
  const status = planStatus.trim().toLowerCase();
  if (!ENTITLED_STATUSES.has(status)) {
    return null;
  }
  if (planCode === "premium") return "premium";
  if (planCode === "basic") return "basic";
  return null;
}

/** Authoritative server-side entitlements from `specialist_plan` snapshot. */
export function resolveSpecialistEntitlements(
  plan: Pick<PlanSnapshot, "plan_code" | "plan_status">,
): SpecialistEntitlements {
  const internalPlanCode = parsePlanCode(plan.plan_code) ?? "starter";
  const effectivePaidPlan = resolveEffectivePaidPlan(internalPlanCode, plan.plan_status ?? "");
  const galleryLimit = effectivePaidPlan
    ? resolveGalleryLimitFromPlanCode(effectivePaidPlan)
    : GALLERY_LIMIT_PROFESSIONAL;

  return {
    internalPlanCode,
    effectivePaidPlan,
    publicPlanName: effectivePaidPlan ? PLAN_PUBLIC_NAMES[effectivePaidPlan] : null,
    galleryLimit,
    galleryPublicLimit: galleryLimit,
    hasGrowthPageFormat: effectivePaidPlan === "premium",
    hasEditorialPackage: effectivePaidPlan === "premium",
  };
}

export function normalizeGalleryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

/** Adding blocked when stored count already meets or exceeds plan limit. */
export function canAddGalleryImage(storedCount: number, limit: number): boolean {
  return storedCount < limit;
}

/**
 * Gallery save rules:
 * - may shrink freely;
 * - may grow only up to limit;
 * - downgrade may keep stored > limit without truncation.
 */
export function canUpdateGalleryUrls(
  previousUrls: string[],
  nextUrls: string[],
  limit: number,
): boolean {
  if (nextUrls.length <= limit) return true;
  if (nextUrls.length <= previousUrls.length) return true;
  return false;
}

/** Public profile: first N images in stable array order (downgrade-safe). */
export function selectPublicGalleryUrls(urls: string[], publicLimit: number): string[] {
  return urls.slice(0, Math.max(0, publicLimit));
}

export type GalleryLimitErrorPayload = {
  error: "gallery_limit_reached";
  limit: number;
  currentCount: number;
  plan: string | null;
};

export function buildGalleryLimitError(
  entitlements: SpecialistEntitlements,
  currentCount: number,
): GalleryLimitErrorPayload {
  return {
    error: "gallery_limit_reached",
    limit: entitlements.galleryLimit,
    currentCount,
    plan: entitlements.effectivePaidPlan,
  };
}
